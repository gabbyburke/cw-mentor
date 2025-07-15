
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { 
  CASEWORKER_ANALYSIS_PROMPT, 
  CASEWORKER_ANALYSIS_SCHEMA,
  SUPERVISOR_ANALYSIS_PROMPT,
  SUPERVISOR_ANALYSIS_SCHEMA
} from '../constants';
import type { CaseworkerAnalysis, SelfAssessment, SupervisorAnalysis, Message } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export function createChatSession(systemInstruction: string, history: Message[] = []): Chat {
  const geminiHistory = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.parts }],
  }));

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
        systemInstruction,
        temperature: 0.7,
    },
    history: geminiHistory,
  });
}

export async function analyzeCaseworkerPerformance(transcript: Message[], assessment: SelfAssessment): Promise<CaseworkerAnalysis> {
  const model = 'gemini-2.5-flash';
  const prompt = `
    Here is the simulation transcript:
    ---
    ${transcript.map(m => `${m.role}: ${m.parts}`).join('\n')}
    ---

    Here is the caseworker's self-assessment:
    ---
    ${JSON.stringify(assessment, null, 2)}
    ---
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: { role: 'user', parts: [{ text: prompt }] },
      config: {
        systemInstruction: CASEWORKER_ANALYSIS_PROMPT,
        responseMimeType: "application/json",
        responseSchema: CASEWORKER_ANALYSIS_SCHEMA,
      },
    });

    return JSON.parse(response.text) as CaseworkerAnalysis;
  } catch (error) {
    console.error("Error analyzing caseworker performance:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get analysis from AI. Reason: ${error.message}`);
    }
    throw new Error("An unknown error occurred during analysis.");
  }
}

export async function analyzeSupervisorCoaching(feedback: string, transcript: Message[]): Promise<SupervisorAnalysis> {
    const model = 'gemini-2.5-flash';
    const prompt = `
    The supervisor provided the following feedback to the caseworker after reviewing their simulation transcript.
    
    Supervisor's Feedback:
    ---
    ${feedback}
    ---

    For context, here is the original simulation transcript:
    ---
    ${transcript.map(m => `${m.role}: ${m.parts}`).join('\n')}
    ---
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: { role: 'user', parts: [{ text: prompt }] },
      config: {
        systemInstruction: SUPERVISOR_ANALYSIS_PROMPT,
        responseMimeType: "application/json",
        responseSchema: SUPERVISOR_ANALYSIS_SCHEMA,
      },
    });

    return JSON.parse(response.text) as SupervisorAnalysis;
  } catch (error) {
    console.error("Error analyzing supervisor coaching:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get coaching analysis from AI. Reason: ${error.message}`);
    }
    throw new Error("An unknown error occurred during coaching analysis.");
  }
}