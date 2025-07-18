
import type { CaseworkerAnalysis, SelfAssessment, SupervisorAnalysis, Message } from '../types/types';
import { 
  CASEWORKER_ANALYSIS_PROMPT, 
  CASEWORKER_ANALYSIS_SCHEMA,
  SUPERVISOR_ANALYSIS_PROMPT,
  SUPERVISOR_ANALYSIS_SCHEMA
} from '../utils/constants';

// Temporarily commented out for local development
// if (!import.meta.env.VITE_CLOUD_FUNCTION_URL) {
//   throw new Error("CLOUD_FUNCTION_URL environment variable not set.");
// }

// Cloud Function configuration
const CLOUD_FUNCTION_URL = import.meta.env.VITE_CLOUD_FUNCTION_URL || 'https://us-central1-wz-case-worker-mentor.cloudfunctions.net/analysis-function';
const MENTORSHIP_FUNCTION_URL = import.meta.env.VITE_MENTORSHIP_FUNCTION_URL || 'https://psu-mentor-demo-807576987550.us-central1.run.app';
const SIMULATION_FUNCTION_URL = import.meta.env.VITE_SIMULATION_FUNCTION_URL || 'https://psu-simulation-807576987550.us-central1.run.app';

// Simple chat session simulation using Cloud Function
export function createChatSession(systemInstruction: string, history: Message[] = []) {
  return {
    history: [...history],
    systemInstruction,
    async sendMessageStream({ message }: { message: string }) {
      const response = await callCloudFunction(message, systemInstruction, [...history, { role: 'user', parts: message }]);
      
      // Simulate streaming by yielding the response
      async function* streamGenerator() {
        yield { text: response };
      }
      
      return streamGenerator();
    }
  };
}

async function callCloudFunction(message: string, systemInstruction: string, history: Message[]): Promise<string> {
  const requestBody = {
    action: 'chat',
    message,
    systemInstruction,
    history
  };

  try {
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    return data.text || 'No response generated';
  } catch (error) {
    console.error('Cloud Function API error:', error);
    throw new Error(`Failed to call Cloud Function: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function callCloudFunctionForAnalysis(
  transcript: Message[], 
  assessment: SelfAssessment, 
  systemInstruction: string,
  onStreamUpdate?: (text: string) => void
): Promise<{ streamingText: string, analysisData: any }> {
  const requestBody = {
    action: 'analyze',
    transcript,
    assessment,
    systemInstruction
  };

  try {
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    // Handle streaming response
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let streamingText = '';
    let analysisData = null;
    let citationsData = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        
        // Extract the streaming text (everything before [ANALYSIS_COMPLETE])
        const analysisMarkerIndex = fullText.indexOf('[ANALYSIS_COMPLETE]');
        if (analysisMarkerIndex !== -1) {
          streamingText = fullText.substring(0, analysisMarkerIndex).trim();
        } else {
          streamingText = fullText; // Still streaming the initial text
        }
        
        // Send streaming updates if callback provided
        if (onStreamUpdate && streamingText) {
          onStreamUpdate(streamingText);
        }
        
        // Only try to parse JSON after we have complete markers
        const analysisCompleteIndex = fullText.indexOf('[ANALYSIS_COMPLETE]\n');
        const citationsCompleteIndex = fullText.indexOf('[CITATIONS_COMPLETE]\n');
        
        // Parse analysis JSON only if we have a complete section
        if (analysisCompleteIndex !== -1 && !analysisData) {
          const jsonStart = analysisCompleteIndex + '[ANALYSIS_COMPLETE]\n'.length;
          
          // Determine the end of the analysis JSON
          let jsonEnd = fullText.length;
          if (citationsCompleteIndex !== -1 && citationsCompleteIndex > jsonStart) {
            jsonEnd = citationsCompleteIndex;
          }
          
          const jsonText = fullText.substring(jsonStart, jsonEnd).trim();
          
          // Only parse if we likely have complete JSON
          if (jsonText.endsWith('}')) {
            try {
              analysisData = JSON.parse(jsonText);
              console.log('Analysis data received and parsed successfully');
            } catch (e) {
              // JSON might still be incomplete, continue buffering
              console.log('Waiting for complete analysis JSON...');
            }
          }
        }
        
        // Parse citations JSON only if we have the complete section
        if (citationsCompleteIndex !== -1 && !citationsData) {
          const citationsStart = citationsCompleteIndex + '[CITATIONS_COMPLETE]\n'.length;
          const citationsText = fullText.substring(citationsStart).trim();
          
          // Only parse if we likely have complete JSON
          if (citationsText.endsWith('}')) {
            try {
              citationsData = JSON.parse(citationsText);
              console.log(`Citations received: ${citationsData.citations?.length || 0} items`);
            } catch (e) {
              // JSON might still be incomplete, continue buffering
              console.log('Waiting for complete citations JSON...');
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Final attempt to parse if we haven't succeeded yet
    if (!analysisData) {
      const analysisCompleteIndex = fullText.indexOf('[ANALYSIS_COMPLETE]\n');
      const citationsCompleteIndex = fullText.indexOf('[CITATIONS_COMPLETE]\n');
      
      if (analysisCompleteIndex !== -1) {
        const jsonStart = analysisCompleteIndex + '[ANALYSIS_COMPLETE]\n'.length;
        const jsonEnd = citationsCompleteIndex !== -1 ? citationsCompleteIndex : fullText.length;
        const jsonText = fullText.substring(jsonStart, jsonEnd).trim();
        
        try {
          analysisData = JSON.parse(jsonText);
        } catch (e) {
          console.error('Failed to parse complete analysis JSON:', e);
          throw new Error('Failed to parse analysis data from response');
        }
      }
    }

    // Merge citations into analysis data
    if (analysisData && citationsData) {
      analysisData.citations = citationsData.citations;
    }

    return {
      streamingText: streamingText || 'Analysis in progress...',
      analysisData: analysisData || null
    };
  } catch (error) {
    console.error('Cloud Function API error:', error);
    throw new Error(`Failed to call Cloud Function: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzeCaseworkerPerformance(
  transcript: Message[], 
  assessment: SelfAssessment,
  onStreamUpdate?: (text: string) => void
): Promise<CaseworkerAnalysis> {
  try {
    const { analysisData } = await callCloudFunctionForAnalysis(transcript, assessment, CASEWORKER_ANALYSIS_PROMPT, onStreamUpdate);
    
    if (!analysisData) {
      throw new Error('No analysis data received from server');
    }
    
    const rawResponse = analysisData;
    
    // Check if response is already in the correct format
    if (rawResponse.overallSummary && rawResponse.strengths && rawResponse.areasForImprovement) {
      return rawResponse as CaseworkerAnalysis;
    }
    
    // Convert from the current Cloud Function format to expected format
    const convertedAnalysis: CaseworkerAnalysis = {
      overallSummary: "Analysis completed based on Parent Interview Assessment criteria.",
      strengths: [],
      areasForImprovement: []
    };
    
    // Extract information from the current format
    Object.entries(rawResponse).forEach(([key, value]: [string, any]) => {
      if (value && typeof value === 'object' && value.feedback) {
        if (value.score && (value.score.toLowerCase().includes('good') || value.score.toLowerCase().includes('excellent'))) {
          convertedAnalysis.strengths.push(`${key}: ${value.feedback}`);
        } else {
          convertedAnalysis.areasForImprovement.push({
            area: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            suggestion: value.feedback
          });
        }
      }
    });
    
    // Ensure we have at least some content
    if (convertedAnalysis.strengths.length === 0) {
      convertedAnalysis.strengths.push("Attempted to make contact with the client");
    }
    
    if (convertedAnalysis.areasForImprovement.length === 0) {
      convertedAnalysis.areasForImprovement.push({
        area: "Communication",
        suggestion: "Continue developing professional communication skills"
      });
    }
    
    return convertedAnalysis;
  } catch (error) {
    console.error("Error analyzing caseworker performance:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get analysis from AI. Reason: ${error.message}`);
    }
    throw new Error("An unknown error occurred during analysis.");
  }
}

export async function analyzeSupervisorCoaching(
  feedback: string, 
  transcript: Message[],
  onStreamUpdate?: (text: string) => void
): Promise<SupervisorAnalysis> {
  try {
    // Create a mock assessment for supervisor analysis
    const mockAssessment = { supervisorFeedback: feedback };
    const { analysisData } = await callCloudFunctionForAnalysis(transcript, mockAssessment, SUPERVISOR_ANALYSIS_PROMPT, onStreamUpdate);
    
    if (!analysisData) {
      throw new Error('No analysis data received from server');
    }
    
    return analysisData as SupervisorAnalysis;
  } catch (error) {
    console.error("Error analyzing supervisor coaching:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get coaching analysis from AI. Reason: ${error.message}`);
    }
    throw new Error("An unknown error occurred during coaching analysis.");
  }
}

// Mentorship chat session using dedicated mentorship function
export function createMentorshipChatSession(systemInstruction: string, history: Message[] = []) {
  return {
    history: [...history],
    systemInstruction,
    async sendMessageStream({ message }: { message: string }) {
      const response = await callMentorshipFunction(message, systemInstruction, [...history, { role: 'user', parts: message }]);
      
      // Simulate streaming by yielding the response
      async function* streamGenerator() {
        yield { text: response };
      }
      
      return streamGenerator();
    }
  };
}

async function callMentorshipFunction(message: string, systemInstruction: string, history: Message[]): Promise<string> {
  const requestBody = {
    message,
    systemInstruction,
    history
  };

  try {
    const response = await fetch(MENTORSHIP_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    return data.text || 'No response generated';
  } catch (error) {
    console.error('Mentorship Function API error:', error);
    throw new Error(`Failed to call Mentorship Function: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Simulation chat session using dedicated simulation function
export function createSimulationChatSession(scenarioId: string, history: Message[] = []) {
  return {
    history: [...history],
    scenarioId,
    async sendMessageStream({ message }: { message: string }) {
      const response = await callSimulationFunction(message, scenarioId, [...history, { role: 'user', parts: message }]);
      
      // Simulate streaming by yielding the response
      async function* streamGenerator() {
        yield { text: response };
      }
      
      return streamGenerator();
    }
  };
}

async function callSimulationFunction(message: string, scenarioId: string, history: Message[]): Promise<string> {
  const requestBody = {
    message,
    scenario_id: scenarioId,
    history
  };

  try {
    const response = await fetch(SIMULATION_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    return data.text || 'No response generated';
  } catch (error) {
    console.error('Simulation Function API error:', error);
    throw new Error(`Failed to call Simulation Function: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
