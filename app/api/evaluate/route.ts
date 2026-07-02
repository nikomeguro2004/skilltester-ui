import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON } from "@/lib/groq";
import { buildEvaluatePrompt, EVALUATE_SYSTEM } from "@/lib/prompts";
import { answerSubmissionSchema, evaluationSchema, questionSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  question: questionSchema,
  answer: answerSubmissionSchema,
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

  const { question, answer } = parsed.data;

  const isChoice = question.type === "single_choice" || question.type === "multi_select";
  const selectedLabels = isChoice
    ? (answer.selectedOptionIds ?? [])
        .map((id) => question.options?.find((o) => o.id === id)?.label)
        .filter((v): v is string => !!v)
    : null;

  try {
    const evaluation = await generateJSON({
      system: EVALUATE_SYSTEM,
      user: buildEvaluatePrompt(question, answer.text ?? "", selectedLabels),
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
