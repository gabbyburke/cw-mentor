import type { Chat } from '@google/genai';

export type Page = 'home' | 'simulation' | 'review' | 'qa';

export interface Message {
  role: 'user' | 'model';
  parts: string;
}

export interface SelfAssessment {
  [criterionKey: string]: string;
}

export interface CaseworkerAnalysis {
  overallSummary: string;
  strengths: string[];
  areasForImprovement: {
    area: string;
    suggestion: string;
  }[];
}

export interface SupervisorAnalysis {
    feedbackOnStrengths: string;
    feedbackOnCritique: string;
    overallTone: string;
}

export interface AppState {
  page: Page;
  isLoading: boolean;
  error: string | null;

  // Simulation Data
  simulationTranscript: Message[];
  
  // Review Page Data
  selfAssessment: SelfAssessment | null;
  caseworkerAnalysis: CaseworkerAnalysis | null;
  supervisorFeedback: string | null;
  supervisorAnalysis: SupervisorAnalysis | null;
}
