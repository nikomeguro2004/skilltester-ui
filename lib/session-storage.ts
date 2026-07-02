"use client";

import type {
  AnsweredQuestion,
  AssessmentLength,
  Difficulty,
  KnowledgeMap,
  Question,
} from "./types";

const STORAGE_KEY = "friendly-quiz:session:v1";

export interface StoredSession {
  topic: string;
  difficulty: Difficulty;
  length: AssessmentLength;
  knowledgeMap: KnowledgeMap;
  history: AnsweredQuestion[];
  currentQuestion: Question | null;
  questionNumber: number;
  updatedAt: number;
}

export function saveSession(session: StoredSession) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // storage unavailable/full — resuming just won't work, not fatal
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
