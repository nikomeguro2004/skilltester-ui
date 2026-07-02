import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON } from "@/lib/groq";
import { buildQuestionPrompt, QUESTION_SYSTEM } from "@/lib/prompts";
import {
  answeredQuestionSchema,
  assessmentLengthSchema,
  difficultySchema,
  knowledgeMapSchema,
  questionSchema,
} from "@/lib/schemas";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  knowledgeMap: knowledgeMapSchema,
  targetArea: z.string().min(1),
  targetDifficulty: difficultySchema,
  length: assessmentLengthSchema,
  history: z.array(answeredQuestionSchema),
  questionNumber: z.number().min(1),
});

export async function POST(req: Request) {
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

  const { knowledgeMap, targetArea, targetDifficulty, length, history, questionNumber } =
    parsed.data;

  try {
    const question = await generateJSON({
      system: QUESTION_SYSTEM,
      user: buildQuestionPrompt(
        knowledgeMap,
        targetArea,
        targetDifficulty,
        length,
        history,
        questionNumber,
      ),
      schema: questionSchema,
      temperature: 0.6,
    });

    return NextResponse.json(question);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Question generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
