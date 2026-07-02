import type {
  AnsweredQuestion,
  AnswerSubmission,
  AssessmentLength,
  Difficulty,
  Evaluation,
  FinalReport,
  KnowledgeMap,
  Question,
} from "./types";

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Request to ${url} failed (${res.status})`);
  }

  return res.json();
}

export function fetchKnowledgeMap(topic: string, difficulty: Difficulty) {
  return postJSON<KnowledgeMap>("/api/research", { topic, difficulty });
}

export function fetchNextQuestion(
  knowledgeMap: KnowledgeMap,
  targetArea: string,
  targetDifficulty: Difficulty,
  length: AssessmentLength,
  history: AnsweredQuestion[],
  questionNumber: number,
) {
  return postJSON<Question>("/api/question", {
    knowledgeMap,
    targetArea,
    targetDifficulty,
    length,
    history,
    questionNumber,
  });
}

export function submitAnswerForEvaluation(question: Question, answer: AnswerSubmission) {
  return postJSON<Evaluation>("/api/evaluate", { question, answer });
}

export function fetchFinalReport(
  knowledgeMap: KnowledgeMap,
  difficulty: Difficulty,
  history: AnsweredQuestion[],
) {
  return postJSON<FinalReport>("/api/report", { knowledgeMap, difficulty, history });
}
