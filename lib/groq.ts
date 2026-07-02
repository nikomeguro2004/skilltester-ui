import "server-only";
import Groq from "groq-sdk";
import type { z } from "zod";

const apiKey = process.env.GROQ_API_KEY;

let client: Groq | null = null;

function getClient(): Groq {
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env.local to run assessments.",
    );
  }
  if (!client) {
    client = new Groq({ apiKey });
  }
  return client;
}

export const DEFAULT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

interface GenerateJSONParams<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  model?: string;
  temperature?: number;
  maxRetries?: number;
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model response was not valid JSON");
  }
}

export async function generateJSON<T>({
  system,
  user,
  schema,
  model = DEFAULT_MODEL,
  temperature = 0.4,
  maxRetries = 2,
}: GenerateJSONParams<T>): Promise<T> {
  const groq = getClient();
  let lastError = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const correction = lastError
      ? `\n\nYour previous response was invalid: ${lastError}. Return ONLY valid JSON matching the required shape, with no markdown fences or commentary.`
      : "";

    try {
      const completion = await groq.chat.completions.create({
        model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system + correction },
          { role: "user", content: user },
        ],
      });

      const content = completion.choices[0]?.message?.content ?? "";
      const parsed = extractJson(content);
      const result = schema.safeParse(parsed);

      if (result.success) {
        return result.data;
      }
      lastError = result.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    } catch (err) {
      lastError = err instanceof Error ? err.message : "unknown error";
    }
  }

  throw new Error(`Failed to get valid structured output from model: ${lastError}`);
}
