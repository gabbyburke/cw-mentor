import functions_framework
from flask import jsonify, Response
from google import genai
from google.genai import types
import os
import json
import logging
import re
from typing import List, Dict, Tuple

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
        
        logging.info(f"Analysis request received - transcript items: {len(transcript)}")
        logging.info(f"Assessment provided: {bool(assessment)}")
        
        if not transcript:
            return (jsonify({'error': 'Missing transcript field'}), 400, headers)

        # Format transcript
        transcript_text = '\n'.join([f"{msg.get('role', 'unknown')}: {msg.get('parts', '')}" for msg in transcript])
        logging.info(f"Formatted transcript length: {len(transcript_text)} characters")
        
        # Create analysis prompt
        analysis_prompt = f"""
You are an expert social work educator analyzing a parent interview transcript. Use the Arkansas child welfare training materials and best practices to provide feedback.

IMPORTANT CITATION RULES:
1. When referencing curriculum/training materials, use citation markers [1], [2], etc.
2. When referencing specific quotes from the transcript to support your analysis, use transcript citation markers [T1], [T2], etc.
3. Every claim or observation about the worker's performance should be supported by either a transcript citation [T#] or curriculum citation [#].

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
  "overallSummary": "Brief encouraging overview of performance with citations [T#] and [#]",
  "strengths": ["Specific strength 1 with citation [T#]", "Specific strength 2 with citation [T#]"],
  "areasForImprovement": [
    {{"area": "Area name", "suggestion": "Specific actionable suggestion with citations [T#] and/or [#]"}},
    {{"area": "Area name", "suggestion": "Specific actionable suggestion with citations [T#] and/or [#]"}}
  ],
  "criteriaAnalysis": [
    {{"criterion": "Introduction & Identification", "met": true, "score": "Good", "evidence": "Direct quote from transcript", "feedback": "Specific feedback with citations [T#] and/or [#]"}},
    {{"criterion": "Reason for Contact", "met": false, "score": "Needs Improvement", "evidence": "Direct quote or 'Not demonstrated'", "feedback": "Specific feedback with citations [T#] and/or [#]"}},
    {{"criterion": "Responsive to Parent", "met": true, "score": "Excellent", "evidence": "Direct quote", "feedback": "Specific feedback with citations [T#] and/or [#]"}},
    {{"criterion": "Permission to Enter", "met": false, "score": "Not Demonstrated", "evidence": "Not demonstrated", "feedback": "Specific feedback with citations [T#] and/or [#]"}},
    {{"criterion": "Information Gathering", "met": false, "score": "Needs Improvement", "evidence": "Direct quote or 'Not demonstrated'", "feedback": "Specific feedback with citations [T#] and/or [#]"}},
    {{"criterion": "Process & Next Steps", "met": false, "score": "Not Demonstrated", "evidence": "Not demonstrated", "feedback": "Specific feedback with citations [T#] and/or [#]"}}
  ],
  "transcriptCitations": [
    {{
      "number": 1,
      "marker": "[T1]",
      "quote": "Exact quote from the transcript that supports analysis",
      "speaker": "user or model"
    }},
    {{
      "number": 2,
      "marker": "[T2]",
      "quote": "Another exact quote from the transcript",
      "speaker": "user or model"
    }}
  ]
}}
"""
        
        # Build content for analysis
        contents = [types.Content(
            role="user",
            parts=[types.Part(text=analysis_prompt)]
        )]
        
        logging.info(f"Analysis prompt prepared - length: {len(analysis_prompt)} characters")
        
        # Configure generation with RAG grounding
        config = types.GenerateContentConfig(
            temperature=0.3,
            max_output_tokens=8192,
            # Remove JSON constraint to allow natural response
            # response_mime_type="application/json",
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
        
        # Generate analysis with streaming
        logging.info(f"Calling Gemini model '{MODEL_NAME}' for analysis with streaming...")
        
        def generate():
            """Generator function for streaming response"""
            response_text = ""
            try:
                # Stream the response from the model
                for chunk in client.models.generate_content_stream(
                    model=MODEL_NAME,
                    contents=contents,
                    config=config
                ):
                    if chunk.text:
                        response_text += chunk.text
                        # Yield each chunk of text
                        yield chunk.text
                    
                    # Log if grounding metadata is present
                    if hasattr(chunk, 'grounding_metadata') and chunk.grounding_metadata:
                        if hasattr(chunk.grounding_metadata, 'grounding_chunks') and chunk.grounding_metadata.grounding_chunks:
                            logging.info(f"RAG retrieval detected - {len(chunk.grounding_metadata.grounding_chunks)} chunks")
                
                logging.info(f"Streaming complete - total length: {len(response_text)} characters")
                
                # After streaming is complete, process the full response
                if not response_text:
                    yield json.dumps({
                        'error': 'AI model returned empty response',
                        'details': 'The model did not generate any text content'
                    })
                    return
            
                # Process the complete response after streaming
                logging.info("Processing complete response...")
                json_text = response_text.strip()
                
                # Remove markdown code block if present
                if json_text.startswith('```json'):
                    json_text = json_text[7:]  # Remove ```json
                    if json_text.endswith('```'):
                        json_text = json_text[:-3]  # Remove closing ```
                elif json_text.startswith('```'):
                    json_text = json_text[3:]  # Remove ```
                    if json_text.endswith('```'):
                        json_text = json_text[:-3]  # Remove closing ```
                
                # Try to extract JSON from response, handling potential preamble
                json_start = json_text.find('{')
                if json_start != -1:
                    json_text = json_text[json_start:]
                
                try:
                    analysis = json.loads(json_text)
                    logging.info("JSON parsing successful")
                    
                    # Add empty citations array temporarily
                    analysis["citations"] = []
                    
                    # Now make a second non-streaming call to get grounding metadata
                    logging.info("Making second call to retrieve grounding metadata...")
                    try:
                        citation_response = client.models.generate_content(
                            model=MODEL_NAME,
                            contents=contents,
                            config=config
                        )
                        
                        # Extract grounding metadata for citations
                        citations = []
                        grounding_chunks = []
                        
                        if (citation_response.candidates and 
                            citation_response.candidates[0].grounding_metadata and 
                            citation_response.candidates[0].grounding_metadata.grounding_chunks):
                            
                            for idx, chunk in enumerate(citation_response.candidates[0].grounding_metadata.grounding_chunks):
                                if chunk.retrieved_context:
                                    ctx = chunk.retrieved_context
                                    citation = {
                                        "number": idx + 1,
                                        "marker": f"[{idx + 1}]",
                                        "source": ctx.title if ctx.title else "Training Material",
                                        "text": ctx.text if ctx.text else "",
                                        "uri": ctx.uri if ctx.uri else ""
                                    }
                                    
                                    # Extract page span if available
                                    if hasattr(ctx, 'rag_chunk') and ctx.rag_chunk:
                                        rag_chunk = ctx.rag_chunk
                                        if hasattr(rag_chunk, 'page_span') and rag_chunk.page_span:
                                            citation["pages"] = f"Pages {rag_chunk.page_span.first_page}-{rag_chunk.page_span.last_page}"
                                    
                                    citations.append(citation)
                                    grounding_chunks.append({
                                        "text": ctx.text if ctx.text else "",
                                        "citation_num": idx + 1
                                    })
                            
                            logging.info(f"Extracted {len(citations)} citations from grounding metadata")
                        
                        # Ask LLM to add citation markers based on grounding chunks
                        if citations and grounding_chunks:
                            analysis_with_citations = add_citations_with_llm(analysis, grounding_chunks)
                            # Send updated analysis with citations
                            yield "\n\n[ANALYSIS_COMPLETE]\n" + json.dumps(analysis_with_citations)
                        else:
                            # Send original analysis if no citations
                            yield "\n\n[ANALYSIS_COMPLETE]\n" + json.dumps(analysis)
                        
                        # Send citations as separate payload
                        yield "\n\n[CITATIONS_COMPLETE]\n" + json.dumps({"citations": citations})
                        
                    except Exception as citation_error:
                        logging.error(f"Failed to retrieve citations: {str(citation_error)}")
                        # Send empty citations on error
                        yield "\n\n[CITATIONS_COMPLETE]\n" + json.dumps({"citations": []})
                    
                except json.JSONDecodeError as json_err:
                    logging.error(f"Failed to decode JSON response: {json_err}")
                    yield json.dumps({
                        'error': 'Failed to parse AI response as JSON',
                        'details': str(json_err),
                        'raw_response': response_text[:1000] if response_text else 'Empty response'
                    })
                    
            except Exception as e:
                logging.exception(f"Error during streaming: {str(e)}")
                yield json.dumps({'error': f'Streaming failed: {str(e)}'})
        
        # Return streaming response with newline delimiter
        return Response(generate(), mimetype='text/plain', headers=headers)
        
    except Exception as e:
        logging.exception(f"Error in handle_analysis: {str(e)}")
        return (jsonify({'error': f'Analysis failed: {str(e)}'}), 500, headers)


def add_citations_with_llm(analysis: Dict, grounding_chunks: List[Dict]) -> Dict:
    """Use LLM to add citation markers to the analysis based on grounding chunks."""
    try:
        # Create a prompt for the LLM to add citations
        citation_prompt = f"""
Given this analysis JSON and these grounding chunks from training materials, add citation markers [1], [2], etc. 
where the analysis references concepts from the chunks.

Analysis to update:
{json.dumps(analysis, indent=2)}

Grounding chunks used by the AI:
"""
        for chunk in grounding_chunks:
            citation_prompt += f"\n[{chunk['citation_num']}]: {chunk['text'][:500]}..."
        
        citation_prompt += """

Instructions:
1. Add citation markers [1], [2], etc. in the text where concepts from the grounding chunks are referenced
2. Only add citations where there's a clear connection to the chunk content
3. Return the complete updated JSON with citation markers added
4. Keep all existing [T#] transcript citations as they are
5. Respond with ONLY the JSON, no other text
"""
        
        # Call LLM to add citations
        contents = [types.Content(
            role="user",
            parts=[types.Part(text=citation_prompt)]
        )]
        
        config = types.GenerateContentConfig(
            temperature=0.1,  # Low temperature for consistency
            max_output_tokens=8192,
            response_mime_type="application/json"  # Force JSON response
        )
        
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=config
        )
        
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            response_text = response.candidates[0].content.parts[0].text
            updated_analysis = json.loads(response_text)
            logging.info("Successfully added citations to analysis")
            return updated_analysis
        else:
            logging.warning("No response from citation addition, returning original")
            return analysis
            
    except Exception as e:
        logging.error(f"Error adding citations with LLM: {e}")
        # Return original analysis on error
        return analysis
