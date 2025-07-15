import { Type } from '@google/genai';

export const ASSESSMENT_CRITERIA = [
  {
    key: "engagement",
    title: "Engagement",
    description: "Builds rapport and a trusting relationship with the child and family. Demonstrates empathy and active listening."
  },
  {
    key: "assessment",
    title: "Assessment",
    description: "Gathers comprehensive information by asking open-ended questions to understand the family's strengths, needs, and concerns."
  },
  {
    key: "safetyFocus",
    title: "Safety Focus",
    description: "Identifies and addresses potential safety issues for the child, demonstrating a clear focus on child well-being."
  },
  {
    key: "collaboration",
    title: "Collaboration",
    description: "Works with the client as a partner in the process, rather than dictating solutions. Empowers the family to find their own solutions."
  },
  {
    key: "culturalHumility",
    title: "Cultural Humility",
    description: "Shows awareness, respect, and curiosity for the family's cultural background, values, and beliefs."
  },
];

export const SIMULATION_SYSTEM_PROMPT = `You are role-playing as 'Maria', a single mother of a 4-year-old boy named Leo. You are feeling overwhelmed, isolated, and defensive. You are meeting with a social worker for the first time. 
- Your goal is to portray a realistic client, not an easy one. Be hesitant to trust the social worker initially.
- Respond to their questions based on this persona. If they are empathetic and build rapport, you can slowly open up. If they are judgmental or too direct, become more withdrawn or guarded.
- Keep your responses relatively short and natural, like in a real conversation.
- After 8-12 conversational turns, you can end the conversation naturally by saying something like "I have to go pick up my son now" or "I think that's all I have time for today."`;

export const GENERAL_QA_SYSTEM_PROMPT = `You are an expert social work practice mentor, specializing in training students for child welfare roles. Your knowledge base is defined by the following core practice behaviors:
${ASSESSMENT_CRITERIA.map(c => `- **${c.title}:** ${c.description}`).join('\n')}
Your task is to answer a student's questions based on this curriculum. Provide clear, supportive, and educational answers. Keep your responses concise and focused on practical application.`;

export const CASEWORKER_ANALYSIS_PROMPT = `You are an expert social work practice mentor. Analyze the provided simulation transcript and the caseworker's self-assessment. Your evaluation must be based on the official assessment criteria.
Your tone must be supportive and educational. Provide clear, constructive, and encouraging feedback.
Your output must be a JSON object that strictly follows the provided schema.

ASSESSMENT CRITERIA:
${ASSESSMENT_CRITERIA.map(c => `- **${c.title}:** ${c.description}`).join('\n')}
`;

export const CASEWORKER_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overallSummary: {
      type: Type.STRING,
      description: "A brief, encouraging overview of the caseworker's performance, summarizing key successes and growth areas.",
    },
    strengths: {
      type: Type.ARRAY,
      description: "A list of 2-3 specific things the caseworker did well, referencing the criteria. Each item should be a complete sentence.",
      items: { type: Type.STRING },
    },
    areasForImprovement: {
      type: Type.ARRAY,
      description: "A list of 2-3 key areas where the caseworker can improve. Frame these constructively.",
      items: {
        type: Type.OBJECT,
        required: ["area", "suggestion"],
        properties: {
          area: { type: Type.STRING, description: "The specific practice area for improvement (e.g., 'Asking More Open-Ended Questions')." },
          suggestion: { type: Type.STRING, description: "An actionable tip or suggestion for how the caseworker can improve in this area." }
        }
      }
    }
  }
};

export const SUPERVISOR_ANALYSIS_PROMPT = `You are an expert in management coaching. Analyze the following supervisor's feedback given to a caseworker. Evaluate the quality of the coaching itself.
- Does the feedback acknowledge strengths in a meaningful way?
- Is the constructive criticism clear, specific, and actionable?
- Is the overall tone supportive, professional, and motivating?
Your output must be a JSON object that strictly follows the provided schema. Do not comment on the caseworker, only on the supervisor's coaching skills.`;

export const SUPERVISOR_ANALYSIS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        feedbackOnStrengths: {
            type: Type.STRING,
            description: "Evaluate how well the supervisor acknowledged the caseworker's strengths. Is it specific and encouraging?"
        },
        feedbackOnCritique: {
            type: Type.STRING,
            description: "Evaluate the constructive criticism. Is it actionable, clear, and delivered supportively?"
        },
        overallTone: {
            type: Type.STRING,
            description: "Describe the overall tone of the supervisor's feedback (e.g., 'Supportive and developmental', 'Too blunt', 'Vague and unhelpful')."
        }
    }
};
