import functions_framework
from flask import jsonify
from google import genai
from google.genai import types
import os
import json
import logging

# --- Initialize Logging ---
logging.basicConfig(level=logging.INFO)

# --- Initialize Google GenAI ---
try:
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "wz-case-worker-mentor")
    if not project_id:
        logging.warning("GOOGLE_CLOUD_PROJECT environment variable not set.")
    
    # Initialize the client
    client = genai.Client(
        vertexai=True,
        project=project_id,
        location="global",  # Using global for Discovery Engine
    )
    logging.info(f"Google GenAI initialized for project '{project_id}'")
except Exception as e:
    logging.error(f"CRITICAL: Error initializing Google GenAI: {e}", exc_info=True)

MODEL_NAME = "gemini-2.5-flash"

# Configure RAG tool with curriculum datastore
RAG_TOOL = types.Tool(
    retrieval=types.Retrieval(
        vertex_ai_search=types.VertexAISearch(
            datastore="projects/wz-case-worker-mentor/locations/global/collections/default_collection/dataStores/curriculum_1752784944010"
        )
    )
)

@functions_framework.http
def social_work_ai(request):
    """
    HTTP Cloud Function for Social Work Coaching Simulator AI calls.
    """
    # --- CORS Handling ---
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type'
    }

    if request.method != 'POST':
        logging.warning(f"Received non-POST request: {request.method}")
        return (jsonify({'error': 'Method not allowed. Use POST.'}), 405, headers)

    try:
        request_json = request.get_json(silent=True)

        if not request_json:
            logging.warning("Request JSON missing.")
            return (jsonify({'error': 'Missing JSON body'}), 400, headers)

        action = request_json.get('action')
        
        if action == 'chat':
            return handle_chat(request_json, headers)
        elif action == 'analyze':
            return handle_analysis(request_json, headers)
        else:
            return (jsonify({'error': 'Invalid action. Use "chat" or "analyze"'}), 400, headers)

    except Exception as e:
        logging.exception(f"An unexpected error occurred: {str(e)}")
        return (jsonify({'error': 'An internal server error occurred.'}), 500, headers)

def handle_chat(request_json, headers):
    """Handle chat simulation requests"""
    try:
        message = request_json.get('message', '')
        system_instruction = request_json.get('systemInstruction', '')
        history = request_json.get('history', [])
        
        if not message:
            return (jsonify({'error': 'Missing message field'}), 400, headers)

        # Build contents with system instruction and history
        contents = []
        
        # Add system instruction as first message if provided
        if system_instruction:
            contents.append(types.Content(
                role="user",
                parts=[types.Part(text=system_instruction)]
            ))
            contents.append(types.Content(
                role="model",
                parts=[types.Part(text="I understand. I'll follow these instructions.")]
            ))
        
        # Add conversation history
        for msg in history:
            role = "user" if msg.get('role') == 'user' else "model"
            parts_text = msg.get('parts', '')
            if parts_text:
                contents.append(types.Content(
                    role=role,
                    parts=[types.Part(text=parts_text)]
                ))
        
        # Add current message
        contents.append(types.Content(
            role="user",
            parts=[types.Part(text=message)]
        ))
        
        # Configure generation with RAG grounding
        config = types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=1024,
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT",
                    threshold="BLOCK_ONLY_HIGH"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH",
                    threshold="BLOCK_ONLY_HIGH"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold="BLOCK_ONLY_HIGH"
                )
            ],
            tools=[RAG_TOOL]  # Enable RAG grounding
        )
        
        # Generate response
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=config
        )
        
        # Extract text from response
        response_text = ""
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            response_text = response.candidates[0].content.parts[0].text
        
        logging.info("Chat response generated successfully")
        return (jsonify({'text': response_text, 'success': True}), 200, headers)
        
    except Exception as e:
        logging.exception(f"Error in handle_chat: {str(e)}")
        return (jsonify({'error': f'Chat generation failed: {str(e)}'}), 500, headers)

def handle_analysis(request_json, headers):
    """Handle transcript analysis requests"""
    try:
        transcript = request_json.get('transcript', [])
        assessment = request_json.get('assessment', {})
        system_instruction = request_json.get('systemInstruction', '')
        
        if not transcript:
            return (jsonify({'error': 'Missing transcript field'}), 400, headers)

        # Format transcript
        transcript_text = '\n'.join([f"{msg.get('role', 'unknown')}: {msg.get('parts', '')}" for msg in transcript])
        
        # Create analysis prompt
        analysis_prompt = f"""
You are an expert social work educator analyzing a parent interview transcript. Use the Arkansas child welfare training materials and best practices to provide feedback.

IMPORTANT: When using information from the training materials, include citation markers [1], [2], etc. in your response text where you reference specific curriculum content.

Analyze this social work parent interview transcript against these key criteria:
1. Introduction & Identification - Did worker properly introduce themselves and verify parent identity?
2. Reason for Contact - Did worker clearly explain why they're there?
3. Responsive to Parent - Did worker listen empathetically and respond to parent concerns?
4. Permission to Enter - Did worker ask permission respectfully?
5. Information Gathering - Did worker gather relevant information about the situation?
6. Process & Next Steps - Did worker explain next steps and parent rights?

Transcript:
{transcript_text}

Self-Assessment:
{json.dumps(assessment, indent=2)}

Provide constructive, encouraging feedback grounded in the training materials. Focus on specific behaviors and actionable improvements.

Respond with JSON in this exact format:
{{
  "overallSummary": "Brief encouraging overview of performance",
  "strengths": ["Specific strength 1", "Specific strength 2"],
  "areasForImprovement": [
    {{"area": "Area name", "suggestion": "Specific actionable suggestion"}},
    {{"area": "Area name", "suggestion": "Specific actionable suggestion"}}
  ],
  "criteriaAnalysis": [
    {{"criterion": "Introduction & Identification", "met": true, "score": "Good", "evidence": "Direct quote from transcript", "feedback": "Specific feedback"}},
    {{"criterion": "Reason for Contact", "met": false, "score": "Needs Improvement", "evidence": "Direct quote or 'Not demonstrated'", "feedback": "Specific feedback"}},
    {{"criterion": "Responsive to Parent", "met": true, "score": "Excellent", "evidence": "Direct quote", "feedback": "Specific feedback"}},
    {{"criterion": "Permission to Enter", "met": false, "score": "Not Demonstrated", "evidence": "Not demonstrated", "feedback": "Specific feedback"}},
    {{"criterion": "Information Gathering", "met": false, "score": "Needs Improvement", "evidence": "Direct quote or 'Not demonstrated'", "feedback": "Specific feedback"}},
    {{"criterion": "Process & Next Steps", "met": false, "score": "Not Demonstrated", "evidence": "Not demonstrated", "feedback": "Specific feedback"}}
  ]
}}
"""
        
        # Build content for analysis
        contents = [types.Content(
            role="user",
            parts=[types.Part(text=analysis_prompt)]
        )]
        
        # Configure generation with RAG grounding and JSON output
        config = types.GenerateContentConfig(
            temperature=0.3,
            max_output_tokens=4096,
            response_mime_type="application/json",
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT",
                    threshold="BLOCK_ONLY_HIGH"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH",
                    threshold="BLOCK_ONLY_HIGH"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold="BLOCK_MEDIUM_AND_ABOVE"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold="BLOCK_ONLY_HIGH"
                )
            ],
            tools=[RAG_TOOL]  # Enable RAG grounding for curriculum-based analysis
        )
        
        # Generate analysis
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=config
        )
        
        # Parse JSON response and extract citations
        try:
            response_text = ""
            if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                response_text = response.candidates[0].content.parts[0].text
            
            analysis = json.loads(response_text)
            
            # Extract grounding metadata for citations
            citations = []
            if (response.candidates and 
                response.candidates[0].grounding_metadata and 
                response.candidates[0].grounding_metadata.grounding_chunks):
                
                for idx, chunk in enumerate(response.candidates[0].grounding_metadata.grounding_chunks):
                    citation = {
                        "number": idx + 1,
                        "source": chunk.retrieved_context.title if chunk.retrieved_context and chunk.retrieved_context.title else "Training Material",
                        "text": chunk.retrieved_context.text if chunk.retrieved_context and chunk.retrieved_context.text else "",
                        "uri": chunk.retrieved_context.uri if chunk.retrieved_context and chunk.retrieved_context.uri else ""
                    }
                    
                    # Extract page span if available
                    if chunk.retrieved_context and hasattr(chunk.retrieved_context, 'rag_chunk') and chunk.retrieved_context.rag_chunk:
                        rag_chunk = chunk.retrieved_context.rag_chunk
                        if hasattr(rag_chunk, 'page_span') and rag_chunk.page_span:
                            citation["pages"] = f"Pages {rag_chunk.page_span.first_page}-{rag_chunk.page_span.last_page}"
                    
                    citations.append(citation)
                
                logging.info(f"Extracted {len(citations)} citations from grounding metadata")
            
            # Add citations to the analysis response
            analysis["citations"] = citations
            
            logging.info("Analysis generated successfully with citations")
            return (jsonify(analysis), 200, headers)
        except json.JSONDecodeError as json_err:
            logging.error(f"Failed to decode JSON response: {json_err}")
            logging.error(f"AI Response Text: {response_text}")
            # Return a fallback structure if JSON parsing fails
            fallback_analysis = {
                "overallSummary": "Analysis completed but response format needs adjustment.",
                "strengths": ["Proper introduction", "Professional demeanor"],
                "areasForImprovement": [
                    {"area": "Communication", "suggestion": "Continue developing active listening skills"},
                    {"area": "Assessment", "suggestion": "Practice systematic information gathering"}
                ]
            }
            return (jsonify(fallback_analysis), 200, headers)
        
    except Exception as e:
        logging.exception(f"Error in handle_analysis: {str(e)}")
        return (jsonify({'error': f'Analysis failed: {str(e)}'}), 500, headers)
