import { NextResponse } from "next/server";
import { z } from "zod";
import { computeAreaStates } from "@/lib/adaptive-engine";
import { generateJSON } from "@/lib/groq";
import { buildReportPrompt, REPORT_SYSTEM } from "@/lib/prompts";
import {
  answeredQuestionSchema,
  difficultySchema,
  finalReportSchema,
  knowledgeMapSchema,
} from "@/lib/schemas";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  knowledgeMap: knowledgeMapSchema,
  difficulty: difficultySchema,
  history: z.array(answeredQuestionSchema).min(1),
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

  const { knowledgeMap, difficulty, history } = parsed.data;
  const areaStates = computeAreaStates(knowledgeMap, difficulty, history);

  try {
    const report = await generateJSON({
      system: REPORT_SYSTEM,
      user: buildReportPrompt(knowledgeMap, history, areaStates),
      schema: finalReportSchema,
      temperature: 0.4,
    });

    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Report generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
