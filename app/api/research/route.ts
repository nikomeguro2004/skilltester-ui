import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchWebResearchBrief, generateJSON } from "@/lib/groq";
import { buildResearchPrompt, RESEARCH_SYSTEM } from "@/lib/prompts";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { difficultySchema, knowledgeMapSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  difficulty: difficultySchema,
});

export async function POST(req: Request) {
  const { allowed, retryAfterSeconds } = checkRateLimit(getClientIp(req), "research");
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

  const { topic, difficulty } = parsed.data;

  try {
    const webResearch = await fetchWebResearchBrief(topic);

    const knowledgeMap = await generateJSON({
      system: RESEARCH_SYSTEM,
      user: buildResearchPrompt(topic, difficulty, webResearch?.brief),
      schema: knowledgeMapSchema,
      temperature: 0.5,
    });

    return NextResponse.json({ ...knowledgeMap, sources: webResearch?.sources ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
