export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";

export type AssessmentLength = 5 | 10 | 15;

export interface KnowledgeArea {
  name: string;
  description: string;
  weight: number; // relative importance 1-5
}

export interface KnowledgeMap {
  topic: string;
  summary: string;
  areas: KnowledgeArea[];
  commonMistakes: string[];
  bestPractices: string[];
  faqs: string[];
}

export type QuestionType =
  | "single_choice"
  | "multi_select"
  | "scenario"
  | "short_answer"
  | "problem_solving"
  | "practical"
  | "troubleshooting"
  | "architecture_decision";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  area: string;
  difficulty: Difficulty;
  prompt: string;
  context?: string; // scenario/background text
  options?: QuestionOption[]; // for single_choice / multi_select
  correctOptionIds?: string[]; // for single_choice / multi_select (server-only, stripped before sending to client)
}

export interface ClientQuestion extends Omit<Question, "correctOptionIds"> {
  index: number;
  total: number;
}

export interface AnswerSubmission {
  questionId: string;
  selectedOptionIds?: string[];
  text?: string;
}

export interface Evaluation {
  score: number; // 0-100
  accuracy: number; // 0-100
  understanding: number; // 0-100
  practicalThinking: number; // 0-100
  technicalDepth: number; // 0-100
  communication: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  missingConcepts: string[];
  idealAnswer: string;
  improvementSuggestions: string[];
  explanation: string; // why the answer was right/wrong (MCQ) or overall rationale
}

export interface AnsweredQuestion {
  question: Question;
  answer: AnswerSubmission;
  evaluation: Evaluation;
}

export interface AreaCoverage {
  area: string;
  score: number; // 0-100
}

export interface FinalReport {
  overallScore: number; // 0-100
  knowledgeLevel: Difficulty;
  areaCoverage: AreaCoverage[];
  strongestAreas: string[];
  weakestAreas: string[];
  missingConcepts: string[];
  recommendedLearningTopics: string[];
  suggestedNextSteps: string[];
  summary: string;
  strengths: string[];
  weaknesses: string[];
  knowledgeGaps: string[];
}

export interface AssessmentConfig {
  topic: string;
  difficulty: Difficulty;
  length: AssessmentLength;
}
