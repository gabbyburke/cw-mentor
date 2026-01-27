/*
Copyright 2026 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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

export interface TranscriptCitation {
  number: number;
  marker: string;
  quote: string;
  speaker: string;
}

export interface CurriculumCitation {
  number: number;
  source: string;
  text: string;
  uri: string;
  pages?: string;
}

export interface CaseworkerAnalysis {
  overallSummary: string;
  strengths: string[];
  areasForImprovement: {
    area: string;
    suggestion: string;
  }[];
  criteriaAnalysis?: CriterionAnalysis[];
  transcriptCitations?: TranscriptCitation[];
  citations?: CurriculumCitation[];
}

export interface SupervisorAnalysis {
    feedbackOnStrengths: string;
    feedbackOnCritique: string;
    overallTone: string;
    transcriptCitations?: TranscriptCitation[];
    citations?: CurriculumCitation[];
}

export interface AppState {
  page: Page;
  currentView: 'caseworker' | 'supervisor';
  showSplash: boolean;
}
