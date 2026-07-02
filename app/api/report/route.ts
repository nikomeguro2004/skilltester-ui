import { NextResponse } from "next/server";
import { z } from "zod";
import { computeAreaStates } from "@/lib/adaptive-engine";
import { generateJSON } from "@/lib/groq";
import { buildReportPrompt, REPORT_SYSTEM } from "@/lib/prompts";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  answeredQuestionSchema,
  difficultySchema,
  finalReportSchema,
  knowledgeMapSchema,
} from "@/lib/schemas";
import type { FinalReport } from "@/lib/types";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  knowledgeMap: knowledgeMapSchema,
  difficulty: difficultySchema,
  history: z.array(answeredQuestionSchema).min(1),
});

export async function POST(req: Request) {
  const { allowed, retryAfterSeconds } = checkRateLimit(getClientIp(req), "report");
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

  const { knowledgeMap, difficulty, history } = parsed.data;
  const areaStates = computeAreaStates(knowledgeMap, difficulty, history);

  try {
    const rawReport = await generateJSON({
      system: REPORT_SYSTEM,
      user: buildReportPrompt(knowledgeMap, history, areaStates),
      schema: finalReportSchema,
      temperature: 0.4,
    });

    // The model can only guess at areas nobody was ever quizzed on — override
    // "assessed" deterministically from the measured attempt counts so the UI
    // never presents a guessed score as if it were a real result.
    const attemptsByArea = new Map(areaStates.map((s) => [s.area, s.attempts]));
    const report: FinalReport = {
      ...rawReport,
      areaCoverage: rawReport.areaCoverage.map((a) => ({
        area: a.area,
        score: a.score,
        assessed: (attemptsByArea.get(a.area) ?? 0) > 0,
      })),
    };

    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Report generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
