
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
const CLOUD_FUNCTION_URL = import.meta.env.VITE_CLOUD_FUNCTION_URL || 'https://your-cloud-function-url';
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

async function callCloudFunctionForAnalysis(transcript: Message[], assessment: SelfAssessment, systemInstruction: string): Promise<string> {
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

    const data = await response.json();
    return JSON.stringify(data);
  } catch (error) {
    console.error('Cloud Function API error:', error);
    throw new Error(`Failed to call Cloud Function: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzeCaseworkerPerformance(transcript: Message[], assessment: SelfAssessment): Promise<CaseworkerAnalysis> {
  try {
    const responseText = await callCloudFunctionForAnalysis(transcript, assessment, CASEWORKER_ANALYSIS_PROMPT);
    const rawResponse = JSON.parse(responseText);
    
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

export async function analyzeSupervisorCoaching(feedback: string, transcript: Message[]): Promise<SupervisorAnalysis> {
  try {
    // Create a mock assessment for supervisor analysis
    const mockAssessment = { supervisorFeedback: feedback };
    const responseText = await callCloudFunctionForAnalysis(transcript, mockAssessment, SUPERVISOR_ANALYSIS_PROMPT);
    return JSON.parse(responseText) as SupervisorAnalysis;
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
