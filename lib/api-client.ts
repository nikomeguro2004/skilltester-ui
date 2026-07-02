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

interface StreamEvent {
  type: "chunk" | "done" | "error";
  text?: string;
  question?: Question;
  error?: string;
}

/**
 * Streams the next question as it's generated so the UI can show live text
 * instead of a static spinner. Falls back gracefully: any error mid-stream
 * (or a non-stream JSON error response, e.g. rate limiting) still rejects
 * with a normal Error the caller can show.
 */
export async function fetchNextQuestionStream(
  knowledgeMap: KnowledgeMap,
  targetArea: string,
  targetDifficulty: Difficulty,
  length: AssessmentLength,
  history: AnsweredQuestion[],
  questionNumber: number,
  onChunk?: (text: string) => void,
): Promise<Question> {
  const res = await fetch("/api/question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledgeMap,
      targetArea,
      targetDifficulty,
      length,
      history,
      questionNumber,
    }),
  });

  if (!res.body || !res.headers.get("content-type")?.includes("text/event-stream")) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Request to /api/question failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex = buffer.indexOf("\n\n");
    while (sepIndex !== -1) {
      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);
      const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data: "));
      sepIndex = buffer.indexOf("\n\n");
      if (!dataLine) continue;

      const event = JSON.parse(dataLine.slice(6)) as StreamEvent;
      if (event.type === "chunk" && event.text) {
        onChunk?.(event.text);
      } else if (event.type === "done" && event.question) {
        return event.question;
      } else if (event.type === "error") {
        throw new Error(event.error || "Question generation failed");
      }
    }
  }

  throw new Error("Question stream ended unexpectedly.");
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
