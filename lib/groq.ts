import "server-only";
import Groq, { RateLimitError } from "groq-sdk";
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

// Tried in order. If a model is rate-limited (or otherwise failing), the
// next one takes over so a single model's daily cap doesn't stall the app.
const MODEL_FALLBACK_CHAIN = [
  DEFAULT_MODEL,
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
].filter((model, i, arr) => arr.indexOf(model) === i);

function isRateLimitError(err: unknown): boolean {
  return err instanceof RateLimitError;
}

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
  model,
  temperature = 0.4,
  maxRetries = 2,
}: GenerateJSONParams<T>): Promise<T> {
  const groq = getClient();
  const modelsToTry = model ? [model] : MODEL_FALLBACK_CHAIN;
  let lastError = "";
  let sawRateLimit = false;

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const correction = lastError
        ? `\n\nYour previous response was invalid: ${lastError}. Return ONLY valid JSON matching the required shape, with no markdown fences or commentary.`
        : "";

      try {
        const completion = await groq.chat.completions.create({
          model: currentModel,
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
        if (isRateLimitError(err)) {
          lastError = `${currentModel} is rate-limited`;
          sawRateLimit = true;
          console.warn(`[groq] ${currentModel} rate-limited, switching model`);
          break; // stop retrying this model, fall through to the next one
        }
        lastError = err instanceof Error ? err.message : "unknown error";
      }
    }
  }

  // The raw failure (often a full JSON error body from the API) is for the
  // server log — the user gets a short, human sentence instead.
  console.error(`[groq] all attempts failed: ${lastError}`);
  throw new Error(
    sawRateLimit
      ? "Things are a little busy right now — please wait a minute and try again."
      : "We couldn't generate a response just now. Please try again in a moment.",
  );
}

interface StreamJSONParams<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  temperature?: number;
  onChunk?: (delta: string) => void;
}

/**
 * Best-effort streamed generation against the primary model only, so the
 * caller can show live text while waiting. No retry/correction logic here —
 * on any failure (network, rate limit, invalid JSON, schema mismatch) the
 * caller is expected to fall back to the robust generateJSON() above, which
 * has the full multi-model + retry chain.
 */
export async function streamJSON<T>({
  system,
  user,
  schema,
  temperature = 0.6,
  onChunk,
}: StreamJSONParams<T>): Promise<T> {
  const groq = getClient();

  const stream = await groq.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature,
    response_format: { type: "json_object" },
    stream: true,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  let content = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      content += delta;
      onChunk?.(delta);
    }
  }

  const parsed = extractJson(content);
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      result.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  return result.data;
}
