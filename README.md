# SkillAudit AI

**Measure What You Actually Know.**

An AI-powered knowledge assessment tool — not a quiz, not a mock interview. Enter any topic and get a rigorous, adaptive assessment that evaluates your real understanding and identifies knowledge gaps.

No auth, no database, no accounts. Everything runs in a single browser session, backed by the Groq API.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Groq API (`groq-sdk`) for research, question generation, evaluation, and reporting

## Getting Started

1. Copy the env example and add your [Groq API key](https://console.groq.com/keys):

   ```bash
   cp .env.local.example .env.local
   ```

2. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

## How it works

1. **Research** — the topic is researched into a knowledge map (core areas, common mistakes, best practices, FAQs).
2. **Adaptive assessment** — questions are generated one at a time from the knowledge map, mixing MCQ, multi-select, scenario, short-answer, problem-solving, practical, troubleshooting, and architecture-decision formats. Difficulty adapts to performance.
3. **Strict evaluation** — every answer is scored on accuracy, understanding, practical thinking, technical depth, and communication, with strengths, weaknesses, missing concepts, and an ideal answer.
4. **Final report** — an overall score, knowledge level, per-area coverage, strongest/weakest areas, and recommended learning topics.

## Deploying

Deploys directly to [Vercel](https://vercel.com/new) — just set the `GROQ_API_KEY` environment variable in your project settings.
