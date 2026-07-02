import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON, streamJSON } from "@/lib/groq";
import { buildQuestionPrompt, QUESTION_SYSTEM } from "@/lib/prompts";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  answeredQuestionSchema,
  areaStateSchema,
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
  areaState: areaStateSchema.optional(),
  length: assessmentLengthSchema,
  history: z.array(answeredQuestionSchema),
  questionNumber: z.number().min(1),
});

const encoder = new TextEncoder();

function sseEvent(payload: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(req: Request) {
  const { allowed, retryAfterSeconds } = checkRateLimit(getClientIp(req), "question");
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

  const { knowledgeMap, targetArea, targetDifficulty, areaState, length, history, questionNumber } =
    parsed.data;

  const system = QUESTION_SYSTEM;
  const user = buildQuestionPrompt(
    knowledgeMap,
    targetArea,
    targetDifficulty,
    length,
    history,
    questionNumber,
    areaState,
  );

  // Streams the primary model's raw output as it arrives (so the client can
  // show the question forming live instead of a static spinner), then falls
  // back to the robust multi-model/retry path from generateJSON() if the
  // stream errors out or doesn't parse into a valid question.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const question = await streamJSON({
          system,
          user,
          schema: questionSchema,
          temperature: 0.6,
          onChunk: (delta) => controller.enqueue(sseEvent({ type: "chunk", text: delta })),
        });
        controller.enqueue(sseEvent({ type: "done", question }));
      } catch {
        try {
          const question = await generateJSON({
            system,
            user,
            schema: questionSchema,
            temperature: 0.6,
          });
          controller.enqueue(sseEvent({ type: "done", question }));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Question generation failed";
          controller.enqueue(sseEvent({ type: "error", error: message }));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
