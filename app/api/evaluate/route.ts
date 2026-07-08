import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON } from "@/lib/groq";
import { buildEvaluatePrompt, EVALUATE_SYSTEM } from "@/lib/prompts";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  answerSubmissionSchema,
  evaluationSchema,
  knowledgeMapSchema,
  questionSchema,
} from "@/lib/schemas";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  question: questionSchema,
  answer: answerSubmissionSchema,
  knowledgeMap: knowledgeMapSchema.optional(),
});

export async function POST(req: Request) {
  const { allowed, retryAfterSeconds } = checkRateLimit(getClientIp(req), "evaluate");
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { question, answer, knowledgeMap } = parsed.data;

  if (answer.skipped) {
    return NextResponse.json({
      score: 0,
      accuracy: 0,
      strengths: [],
      weaknesses: [],
      missingConcepts: [],
      idealAnswer: "(You skipped this question.)",
      explanation: "Skipped — no answer was submitted for this question.",
    });
  }

  const isChoice = question.type === "single_choice" || question.type === "multi_select";
  const selectedLabels = isChoice
    ? (answer.selectedOptionIds ?? [])
        .map((id) => question.options?.find((o) => o.id === id)?.label)
        .filter((v): v is string => !!v)
    : null;

  try {
    const evaluation = await generateJSON({
      system: EVALUATE_SYSTEM,
      user: buildEvaluatePrompt(question, answer.text ?? "", selectedLabels, knowledgeMap),
      schema: evaluationSchema,
      temperature: 0.3,
    });

    if (isChoice) {
      const correct = new Set(question.correctOptionIds ?? []);
      const selected = new Set(answer.selectedOptionIds ?? []);
      const union = new Set([...correct, ...selected]);
      const intersectionSize = [...correct].filter((id) => selected.has(id)).length;
      const deterministicAccuracy =
        union.size === 0 ? 0 : Math.round((100 * intersectionSize) / union.size);

      evaluation.accuracy = deterministicAccuracy;
      evaluation.score = deterministicAccuracy;
    }

    return NextResponse.json(evaluation);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Evaluation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
