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
import type { Difficulty, FinalReport } from "@/lib/types";

function knowledgeLevelFromScore(score: number): Difficulty {
  if (score < 40) return "beginner";
  if (score < 70) return "intermediate";
  if (score < 90) return "advanced";
  return "expert";
}

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

    // areaCoverage, overallScore, and knowledgeLevel are computed
    // deterministically from the raw per-question scores rather than trusted
    // from the model's own free-hand numbers. The model tends to round
    // area-level scores generously (a holistic "vibe") while overallScore
    // ends up closer to a strict average of the underlying answers — the two
    // can visibly contradict each other (e.g. area bars at 60-65% next to an
    // overall score of 41) since nothing forces them to agree. Grounding
    // both in the same source data guarantees the score circle and the area
    // breakdown always tell the same story.
    const scoresByArea = new Map<string, number[]>();
    for (const h of history) {
      const list = scoresByArea.get(h.question.area) ?? [];
      list.push(h.evaluation.score);
      scoresByArea.set(h.question.area, list);
    }

    const areaCoverage = knowledgeMap.areas.map((area) => {
      const scores = scoresByArea.get(area.name);
      const assessed = !!scores && scores.length > 0;
      const score = assessed
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : 0;
      return { area: area.name, score, assessed };
    });

    const weightByArea = new Map(knowledgeMap.areas.map((a) => [a.name, a.weight]));
    const assessedCoverage = areaCoverage.filter((a) => a.assessed);
    const totalWeight = assessedCoverage.reduce(
      (sum, a) => sum + (weightByArea.get(a.area) ?? 1),
      0,
    );
    const overallScore = assessedCoverage.length
      ? Math.round(
          assessedCoverage.reduce(
            (sum, a) => sum + a.score * (weightByArea.get(a.area) ?? 1),
            0,
          ) / totalWeight,
        )
      : 0;

    const report: FinalReport = {
      ...rawReport,
      areaCoverage,
      overallScore,
      knowledgeLevel: knowledgeLevelFromScore(overallScore),
    };

    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Report generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
