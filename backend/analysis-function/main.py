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
        
        # Create analysis prompt with thinking instructions
        analysis_prompt = f"""<thinking>
Analyze this social work parent interview transcript step by step:
1. Review each interaction and identify key behaviors
2. Match behaviors to the assessment criteria
3. Consider which training materials from the curriculum would be relevant
4. Focus on providing specific, actionable feedback
</thinking>

You are an expert social work educator analyzing a parent interview transcript. Use the Arkansas child welfare training materials and best practices to provide feedback.

IMPORTANT INSTRUCTIONS:
1. Focus on clear, specific feedback that references best practices
2. ACTIVELY USE AND REFERENCE the Arkansas child welfare training materials from the curriculum datastore to ground your feedback in established best practices
3. Include transcript citations [T1], [T2], etc. when quoting from the transcript
4. DO NOT add curriculum or training material citation markers (like [1], [2], etc.) - these will be added automatically by the system based on the actual training materials referenced

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

EXAMPLE OF A GREAT RESPONSE:
{{
  "overallSummary": "Your self-reflection demonstrates excellent professional insight and a commitment to continuous improvement. While this interaction presented challenges, your ability to recognize areas for growth is a valuable asset in social work practice. The following feedback aims to build on your strengths while providing concrete strategies based on Arkansas child welfare best practices.",
  "strengths": [
    "Demonstrated strong self-awareness by recognizing the confrontational approach and its impact on the parent's defensiveness",
    "Showed persistence in attempting to address child safety concerns despite the challenging interaction"
  ],
  "areasForImprovement": [
    {{
      "area": "Professional Introduction",
      "suggestion": "Begin every interaction with a complete introduction including your full name, specific agency division, and immediate presentation of identification. This establishes credibility and shows respect for the parent's need to verify your authority."
    }},
    {{
      "area": "De-escalation Techniques",
      "suggestion": "When parents become defensive, acknowledge their emotions first before proceeding. Use phrases like 'I understand this is unexpected and concerning for you' to validate their feelings while maintaining focus on child safety."
    }}
  ],
  "criteriaAnalysis": [
    {{
      "criterion": "Introduction & Identification",
      "met": false,
      "score": "Needs Improvement",
      "evidence": "Hi, I'm from CPS. We got a call about your kids.",
      "feedback": "The introduction lacked essential elements including your full name, specific role, and proactive presentation of identification. Best practice requires a complete professional introduction to establish trust and legitimacy from the first moment of contact."
    }},
    {{
      "criterion": "Reason for Contact",
      "met": true,
      "score": "Good",
      "evidence": "We got a call about your kids. I need to come in and look around.",
      "feedback": "While you did state there was a call about the children, the explanation could be more specific about the nature of concerns while remaining non-accusatory. Consider framing it as 'We received a report expressing concern for your children's safety, and I'm here to talk with you about that.'"
    }}
  ],
  "transcriptCitations": [
    {{
      "number": 1,
      "marker": "[T1]",
      "quote": "Hi, I'm from CPS. We got a call about your kids. I need to come in and look around.",
      "speaker": "user"
    }},
    {{
      "number": 2,
      "marker": "[T2]",
      "quote": "What? Who are you? Do you have some ID? What call?",
      "speaker": "model"
    }}
  ]
}}

Respond with JSON in this exact format. Do not include any text outside the JSON structure.
"""
        
        # Build content for analysis
        contents = [types.Content(
            role="user",
            parts=[types.Part(text=analysis_prompt)]
        )]
        
        logging.info(f"Analysis prompt prepared - length: {len(analysis_prompt)} characters")
        
        # Configure generation with thinking mode and RAG grounding
        config = types.GenerateContentConfig(
            temperature=0.3,
            max_output_tokens=8192,
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
            tools=[RAG_TOOL],  # Enable RAG grounding for curriculum-based analysis
            thinking_config=types.ThinkingConfig(
                thinking_budget=24576,  # Maximum allowed value
                include_thoughts=True  # Include thoughts in streaming
            ),
        )
        
        # Generate analysis with streaming
        logging.info(f"Calling Gemini model '{MODEL_NAME}' for analysis with streaming...")
        
        def generate():
            """Generator function for streaming response"""
            thinking_complete = False
            final_text_buffer = []
            all_grounding_chunks = []  # Accumulate all grounding chunks
            chunk_grounding_map = []  # Map text chunks to their grounding
            full_response = ""
            current_chunk_index = 0
            
            try:
                # Stream the response from the model
                for chunk in client.models.generate_content_stream(
                    model=MODEL_NAME,
                    contents=contents,
                    config=config
                ):
                    current_chunk_index += 1
                    
                    if not chunk.candidates or not chunk.candidates[0].content:
                        logging.debug(f"Chunk {current_chunk_index}: No candidates or content")
                        continue
                    
                    # Debug logging for chunk attributes
                    if current_chunk_index <= 3:  # Log first few chunks in detail
                        logging.info(f"Chunk {current_chunk_index} attributes: {dir(chunk.candidates[0])}")
                    
                    # Capture grounding metadata for this chunk
                    chunk_grounding = []
                    if hasattr(chunk.candidates[0], 'grounding_metadata'):
                        if chunk.candidates[0].grounding_metadata:
                            grounding_metadata = chunk.candidates[0].grounding_metadata
                            logging.info(f"Chunk {current_chunk_index}: Has grounding_metadata")
                            
                            if hasattr(grounding_metadata, 'grounding_chunks') and grounding_metadata.grounding_chunks:
                                logging.info(f"Chunk {current_chunk_index}: {len(grounding_metadata.grounding_chunks)} grounding chunks found")
                                
                                # Process grounding chunks for this text chunk
                                for g_idx, g_chunk in enumerate(grounding_metadata.grounding_chunks):
                                    if g_chunk.retrieved_context:
                                        ctx = g_chunk.retrieved_context
                                        grounding_info = {
                                            "source": ctx.title if ctx.title else "Training Material",
                                            "text": ctx.text if ctx.text else "",
                                            "uri": ctx.uri if ctx.uri else ""
                                        }
                                        
                                        # Extract page span if available
                                        if hasattr(ctx, 'rag_chunk') and ctx.rag_chunk:
                                            rag_chunk = ctx.rag_chunk
                                            if hasattr(rag_chunk, 'page_span') and rag_chunk.page_span:
                                                grounding_info["pages"] = f"Pages {rag_chunk.page_span.first_page}-{rag_chunk.page_span.last_page}"
                                        
                                        chunk_grounding.append(grounding_info)
                                        logging.debug(f"  Grounding {g_idx}: {grounding_info['source'][:50]}...")
                                        
                                        # Add to all chunks if not already present
                                        if not any(g['uri'] == grounding_info['uri'] and g['text'] == grounding_info['text'] for g in all_grounding_chunks):
                                            all_grounding_chunks.append(grounding_info)
                            else:
                                logging.info(f"Chunk {current_chunk_index}: grounding_metadata has no grounding_chunks")
                        else:
                            logging.debug(f"Chunk {current_chunk_index}: grounding_metadata is None")
                    else:
                        if current_chunk_index <= 10:  # Log first 10 chunks
                            logging.info(f"Chunk {current_chunk_index}: No grounding_metadata attribute")
                    
                    # Process parts
                    if chunk.candidates[0].content.parts:
                        for part in chunk.candidates[0].content.parts:
                            if hasattr(part, 'thought') and part.thought:
                                # This is thinking content
                                if not thinking_complete and part.text:
                                    thinking_text = f"THINKING: {part.text}"
                                    yield thinking_text
                                    full_response += thinking_text
                            elif part.text:
                                # This is final content
                                if not thinking_complete:
                                    thinking_complete = True
                                    yield "\n\nTHINKING_COMPLETE\n\n"
                                    full_response += "\n\nTHINKING_COMPLETE\n\n"
                                
                                yield part.text
                                final_text_buffer.append(part.text)
                                full_response += part.text
                
                # Combine final text
                final_text = ''.join(final_text_buffer)
                
                logging.info(f"Streaming complete - total length: {len(full_response)} characters")
                
                # After streaming is complete, process the full response
                if not final_text:
                    yield json.dumps({
                        'error': 'AI model returned empty response',
                        'details': 'The model did not generate any text content'
                    })
                    return
            
                # Process the complete response after streaming
                logging.info("Processing complete response...")
                json_text = final_text.strip()
                
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
                    
                    # Process accumulated grounding chunks into citations
                    citations = []
                    logging.info(f"Processing {len(all_grounding_chunks)} accumulated grounding chunks")
                    
                    for idx, grounding in enumerate(all_grounding_chunks):
                        citation = {
                            "number": idx + 1,
                            "marker": f"[{idx + 1}]",
                            "source": grounding["source"],
                            "text": grounding["text"],
                            "uri": grounding["uri"]
                        }
                        if "pages" in grounding:
                            citation["pages"] = grounding["pages"]
                        
                        citations.append(citation)
                    
                    logging.info(f"Created {len(citations)} citations from accumulated grounding chunks")
                    
                    # Add citations to analysis
                    analysis["citations"] = citations
                    
                    # Send completed analysis
                    yield "\n\n[ANALYSIS_COMPLETE]\n" + json.dumps(analysis)
                    
                    # Send citations as separate payload for compatibility
                    yield "\n\n[CITATIONS_COMPLETE]\n" + json.dumps({"citations": citations})
                    
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
