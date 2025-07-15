import functions_framework
from flask import jsonify
from google.cloud import aiplatform
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig, SafetySetting, HarmCategory
import os
import json
import logging

# --- Initialize Logging ---
logging.basicConfig(level=logging.INFO)

# --- Initialize Vertex AI ---
try:
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    region = "us-central1"  # Force us-central1 which is supported
    if not project_id:
        logging.warning("GOOGLE_CLOUD_PROJECT environment variable not set.")
    vertexai.init(project=project_id, location=region)
    logging.info(f"Vertex AI initialized for project '{project_id}' in location '{region}'")
except Exception as e:
    logging.error(f"CRITICAL: Error initializing Vertex AI: {e}", exc_info=True)

MODEL_NAME = "gemini-2.5-flash"

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

        # Format conversation history
        history_text = '\n'.join([f"{msg.get('role', 'unknown')}: {msg.get('parts', '')}" for msg in history])
        
        full_prompt = f"{system_instruction}\n\nConversation history:\n{history_text}\n\nUser: {message}"
        
        model = GenerativeModel(MODEL_NAME)
        
        generation_config = GenerationConfig(
            temperature=0.7,
            max_output_tokens=1024,
        )
        
        # Balanced safety settings for educational child welfare content
        safety_settings = [
            SafetySetting(
                category=HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=SafetySetting.HarmBlockThreshold.BLOCK_ONLY_HIGH
            ),
            SafetySetting(
                category=HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=SafetySetting.HarmBlockThreshold.BLOCK_ONLY_HIGH
            ),
            SafetySetting(
                category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold=SafetySetting.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            ),
            SafetySetting(
                category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=SafetySetting.HarmBlockThreshold.BLOCK_ONLY_HIGH
            )
        ]
        
        response = model.generate_content(
            full_prompt,
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        logging.info("Chat response generated successfully")
        return (jsonify({'text': response.text, 'success': True}), 200, headers)
        
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
        
        # Create a much shorter, focused prompt to avoid token limits
        short_prompt = f"""
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
        
        model = GenerativeModel(MODEL_NAME)
        
        generation_config = GenerationConfig(
            response_mime_type="application/json",
            temperature=0.3,
            max_output_tokens=4096,
        )
        
        # Balanced safety settings for educational child welfare content
        safety_settings = [
            SafetySetting(
                category=HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=SafetySetting.HarmBlockThreshold.BLOCK_ONLY_HIGH
            ),
            SafetySetting(
                category=HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=SafetySetting.HarmBlockThreshold.BLOCK_ONLY_HIGH
            ),
            SafetySetting(
                category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold=SafetySetting.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            ),
            SafetySetting(
                category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=SafetySetting.HarmBlockThreshold.BLOCK_ONLY_HIGH
            )
        ]
        
        response = model.generate_content(
            short_prompt,
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        # Parse JSON response
        try:
            analysis = json.loads(response.text)
            logging.info("Analysis generated successfully")
            return (jsonify(analysis), 200, headers)
        except json.JSONDecodeError as json_err:
            logging.error(f"Failed to decode JSON response: {json_err}")
            logging.error(f"AI Response Text: {response.text}")
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
