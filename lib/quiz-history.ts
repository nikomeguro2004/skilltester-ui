"use client";

import type {
  AnsweredQuestion,
  AssessmentLength,
  Difficulty,
  FinalReport,
} from "./types";

const STORAGE_KEY = "friendly-quiz:history:v1";
// Each record carries the full report + transcript (tens of KB); capping keeps
// us comfortably inside the ~5MB localStorage quota.
const MAX_RECORDS = 20;

export interface QuizRecord {
  id: string;
  topic: string;
  difficulty: Difficulty;
  length: AssessmentLength;
  completedAt: number;
  report: FinalReport;
  history: AnsweredQuestion[];
}

export function loadQuizHistory(): QuizRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getQuizRecord(id: string): QuizRecord | null {
  return loadQuizHistory().find((r) => r.id === id) ?? null;
}

export function saveQuizRecord(record: QuizRecord) {
  let records = [record, ...loadQuizHistory()].slice(0, MAX_RECORDS);
  // If storage is full, keep dropping the oldest record until the write fits.
  while (records.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return;
    } catch {
      records = records.slice(0, -1);
    }
  }
}

export function deleteQuizRecord(id: string) {
  const records = loadQuizHistory().filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

export function clearQuizHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
