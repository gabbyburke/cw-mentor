import type { Chat } from '@google/genai';

export type Page = 'home' | 'scenario-selection' | 'simulation' | 'simulation-with-scenario' | 'review' | 'qa';

export interface Message {
  role: 'user' | 'model';
  parts: string;
  speaker?: string;
}

export interface SelfAssessment {
  [criterionKey: string]: string;
}

export interface CriterionAnalysis {
  criterion: string;
  met: boolean;
  score: string;
  evidence: string;
  feedback: string;
}

export interface CaseworkerAnalysis {
  overallSummary: string;
  strengths: string[];
  areasForImprovement: {
    area: string;
    suggestion: string;
  }[];
  criteriaAnalysis?: CriterionAnalysis[];
}

export interface SupervisorAnalysis {
    feedbackOnStrengths: string;
    feedbackOnCritique: string;
    overallTone: string;
}

export interface AppState {
  page: Page;
  currentView: 'caseworker' | 'supervisor';
  showSplash: boolean;
}
