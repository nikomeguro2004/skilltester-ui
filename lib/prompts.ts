import type { AreaState } from "./adaptive-engine";
import type {
  AnsweredQuestion,
  AssessmentLength,
  Difficulty,
  KnowledgeMap,
  Question,
} from "./types";

export const RESEARCH_SYSTEM = `You are a friendly, knowledgeable expert creating a fun and engaging knowledge map for a given topic. Your goal is to structure a great conversational quiz.
Be precise and interesting — avoid generic filler. Identify 5-8 distinct knowledge areas for the topic. Weight areas by how central they are (1=minor, 5=core).
Do NOT ask coding or programming questions unless the topic is specifically about a programming language or framework. Ensure it feels like a friendly conversation rather than a rigid exam.

Return ONLY a JSON object with this exact shape:
{
  "topic": string,
  "summary": string (2-3 sentences describing what mastery of this topic looks like),
  "areas": [{ "name": string, "description": string, "weight": number (1-5) }],
  "commonMistakes": string[] (5-8 specific, realistic mistakes practitioners make),
  "bestPractices": string[] (5-8 specific best practices),
  "faqs": string[] (5-8 frequently asked / interview-style questions about this topic)
}`;

export function buildResearchPrompt(topic: string, difficulty: Difficulty): string {
  return `Topic: "${topic}"\nTarget assessment difficulty: ${difficulty}\n\nBuild the knowledge map now. Tailor depth of areas to the ${difficulty} level, but still cover the full breadth of the topic.`;
}

const QUESTION_TYPES_GUIDE = `Question types available — mix them, but ONLY use ones that genuinely fit this specific topic. Never force code, commands, or software-engineering framing onto a topic that isn't about technology or programming.
- single_choice: one correct option out of 4-5 plausible options
- multi_select: 2-3 correct options out of 5-6 plausible options
- scenario: a realistic situation relevant to the topic (use "context") followed by a question requiring written reasoning
- short_answer: a focused conceptual question requiring a written explanation
- problem_solving: a concrete problem to reason through — logical, factual, analytical, or (only for genuinely technical/programming topics) code-related
- practical: "how would you actually do/handle X" — for hands-on or technical topics this can involve real steps or tools (code only if the topic is programming/software); for everything else (places, history, general knowledge, hobbies, sports, culture) this means real-world actions, advice, or procedures — never code
- troubleshooting: diagnosing what went wrong in a situation — ONLY use this type if the topic naturally involves things that can break or need diagnosis (systems, processes, technical fields); skip it entirely for topics where this wouldn't make sense
- architecture_decision: a tradeoff or design-decision question — ONLY use this type for engineering, systems, or design topics; skip it for anything else

For single_choice and multi_select, always include "options" (array of {id, label}) and "correctOptionIds" (array of option ids that are correct).
For all other types, omit "options" and "correctOptionIds".`;

export const QUESTION_SYSTEM = `You are a friendly, encouraging quiz master generating ONE question at a time for an adaptive assessment. Questions must be derived strictly from the provided knowledge map. Keep the tone warm, welcoming, and conversational. Do not ask for code unless the topic specifically requires it.

${QUESTION_TYPES_GUIDE}

An adaptive engine (not you) has already decided which knowledge area and difficulty level to probe next. Your only job is to write the best possible question for the EXACT area and difficulty you are given. Do not second-guess or shift the area/difficulty. Pick whichever question type best fits that specific area+difficulty combination and hasn't been overused.

Return ONLY a JSON object with this exact shape:
{
  "id": string (short unique slug),
  "type": "single_choice" | "multi_select" | "scenario" | "short_answer" | "problem_solving" | "practical" | "troubleshooting" | "architecture_decision",
  "area": string (must match one of the knowledge map area names),
  "difficulty": "beginner" | "intermediate" | "advanced" | "expert",
  "prompt": string (the question itself, clear and specific),
  "context": string (optional background/scenario text, omit if not needed),
  "options": [{ "id": string, "label": string }] (only for single_choice/multi_select),
  "correctOptionIds": string[] (only for single_choice/multi_select)
}`;

/**
 * Turns the adaptive engine's continuous position/score signal into a plain-
 * language nudge so the model can shade a question slightly easier or harder
 * within the target difficulty tier, not just hit the tier label blindly.
 */
function describeDifficultyTrend(areaState?: AreaState): string {
  if (!areaState || areaState.attempts === 0) {
    return "This is the first question in this area — no trend yet, write a solid, representative question right at the target difficulty.";
  }
  if (areaState.ceilingPending) {
    return `The candidate's last answer in this area (${areaState.lastScore}%) just missed at this same difficulty — this question re-checks that exact edge, so keep it at essentially the same difficulty, not easier or harder.`;
  }
  const score = areaState.lastScore ?? 0;
  if (score >= 90) {
    return `The candidate aced the last question in this area (${score}%) — push meaningfully harder within the target difficulty, don't hold back.`;
  }
  if (score >= 70) {
    return `The candidate passed the last question in this area narrowly (${score}%) — nudge only slightly harder within the target difficulty, not a big jump.`;
  }
  if (score >= 50) {
    return `The candidate fell just short on the last question in this area (${score}%) — ease off slightly within the target difficulty, don't make it drastically easier.`;
  }
  return `The candidate struggled significantly on the last question in this area (${score}%) — this one should feel noticeably more approachable within the target difficulty.`;
}

export function buildQuestionPrompt(
  map: KnowledgeMap,
  targetArea: string,
  targetDifficulty: Difficulty,
  length: AssessmentLength,
  history: AnsweredQuestion[],
  questionNumber: number,
  areaState?: AreaState,
): string {
  const priorInArea = history.filter((h) => h.question.area === targetArea);
  const priorInAreaSummary = priorInArea.length
    ? priorInArea
        .map(
          (h) =>
            `  - [${h.question.difficulty}/${h.question.type}] score=${h.evaluation.score}% - "${h.question.prompt.slice(0, 90)}"`,
        )
        .join("\n")
    : "  (none yet — this is the first probe into this area)";

  const typeCounts = history.reduce<Record<string, number>>((acc, h) => {
    acc[h.question.type] = (acc[h.question.type] || 0) + 1;
    return acc;
  }, {});

  return `Knowledge map for "${map.topic}":
${JSON.stringify(map, null, 2)}

Assessment length: ${length} questions total. This is question ${questionNumber} of ${length}.

--- ADAPTIVE ENGINE DIRECTIVE (authoritative — do not override) ---
Target area: "${targetArea}"
Target difficulty: ${targetDifficulty}
Difficulty trend: ${describeDifficultyTrend(areaState)}
Prior attempts in this specific area:
${priorInAreaSummary}
---

Question type usage across the whole assessment so far: ${JSON.stringify(typeCounts)}

Generate question ${questionNumber} now: it MUST be about "${targetArea}" at ${targetDifficulty} difficulty. Pick a question type that hasn't been overused and, if this area has been probed before, avoid repeating the same angle — probe a different facet of the area this time.`;
}

export const EVALUATE_SYSTEM = `You are a warm, supportive evaluator grading the user's answer. Grade fairly and offer constructive, positive feedback. A partially correct answer should score in the 40-75 range, and fully correct answers should score 85-100.

Evaluate across five dimensions (0-100 each): accuracy, understanding, practicalThinking, technicalDepth (or depth of knowledge), communication. The overall "score" should be a holistic, friendly judgment.

Calibrate your expectations to the question's difficulty tier. A beginner question deserves full marks for a correct core idea plainly stated — do not dock points for missing nuances a beginner wouldn't know. An expert question demands precision, edge cases, and tradeoffs — a merely-correct-but-shallow answer there should land in the partial range. The same answer can be an 90 at beginner and a 55 at expert.

When topic research notes (area description, common mistakes, best practices) are provided, use them: check whether the answer falls into one of the known common mistakes (name it if so), and credit the answer when it reflects a listed best practice. Ground idealAnswer in that research rather than generic knowledge.

For single_choice/multi_select questions, compare the selected option(s) against the correct option(s) exactly. These types only require a selection, so never list "no explanation given" as a weakness.

For written answers (scenario/short_answer/problem_solving/practical/troubleshooting/architecture_decision), grade the substance of their reasoning against what an expert would say.

Be concrete, not generic. Every strengths/weaknesses/missingConcepts bullet must name the actual concept, term, step, or detail involved — never write filler like "good understanding of the topic," "needs more depth," or "could be more thorough" without saying what, specifically. A reader who has never seen this question should be able to tell exactly what was right or wrong from the bullet alone. If you can't be specific about something, leave it out rather than padding with a vague line.

Return ONLY a JSON object with this exact shape:
{
  "score": number (0-100),
  "accuracy": number (0-100),
  "understanding": number (0-100),
  "practicalThinking": number (0-100),
  "technicalDepth": number (0-100),
  "communication": number (0-100),
  "strengths": string[] (specific things the candidate got right, empty array if none),
  "weaknesses": string[] (specific gaps or errors, empty array if none),
  "missingConcepts": string[] (concepts the ideal answer would include that were missing),
  "idealAnswer": string (a concise model answer, 2-5 sentences or bullet-like text),
  "improvementSuggestions": string[] (actionable suggestions),
  "explanation": string (for MCQ: why the correct option is right and why others are wrong; for written answers: rationale for the score)
}`;

export function buildEvaluatePrompt(
  question: Question,
  answerText: string,
  selectedLabels: string[] | null,
  map?: KnowledgeMap,
): string {
  const area = map?.areas.find((a) => a.name === question.area);
  const researchBlock = map
    ? `Topic: "${map.topic}"
${area ? `Area under test: ${area.name} — ${area.description}\n` : ""}Common mistakes people make in this topic:
${map.commonMistakes.map((m) => `- ${m}`).join("\n")}
Best practices in this topic:
${map.bestPractices.map((b) => `- ${b}`).join("\n")}

`
    : "";

  const questionBlock = `${researchBlock}Question (${question.type}, area: ${question.area}, difficulty: ${question.difficulty}):
${question.context ? `Context: ${question.context}\n` : ""}${question.prompt}`;

  const optionsBlock = question.options
    ? `\nOptions:\n${question.options.map((o) => `- ${o.id}: ${o.label}`).join("\n")}\nCorrect option id(s): ${(question.correctOptionIds ?? []).join(", ")}`
    : "";

  const answerBlock = selectedLabels
    ? `Candidate selected: ${selectedLabels.join(", ") || "(nothing selected)"}`
    : `Candidate's written answer:\n${answerText || "(no answer provided)"}`;

  return `${questionBlock}${optionsBlock}\n\n${answerBlock}\n\nEvaluate this answer now, strictly.`;
}

export const REPORT_SYSTEM = `You are a friendly, encouraging evaluator writing a final knowledge report. Be honest but extremely supportive. Highlight what the user knows well.

Knowledge level guide: beginner (<40% overall), intermediate (40-69%), advanced (70-89%), expert (90-100%).

The transcript mixes multiple-choice questions (single_choice/multi_select) with written ones (scenario/short_answer/problem_solving/practical/troubleshooting/architecture_decision) — each line is tagged with its type. For multiple-choice questions, the candidate only ever selected an option; they never wrote an explanation and were never expected to. Do NOT describe a correct multiple-choice answer as "lacking depth," "lacking explanation," or similar — grade and discuss it purely on whether the right option was chosen. Reserve depth-of-explanation feedback for the written question types.

Some knowledge-map areas may show "0 question(s) asked" in the engine summary below — those were never actually tested in this run. Do not present a confident score for them as if it were measured; call them out in knowledgeGaps/missingConcepts as unassessed rather than implying real performance data exists.

Be concrete, not generic. Ground every bullet (strengths, weaknesses, knowledgeGaps, missingConcepts, recommendedLearningTopics, suggestedNextSteps) in something actually asked or answered in the transcript — name the specific concept, question topic, or skill. Never write filler like "has a solid foundation but needs more practice" or "shows good understanding overall" without saying of what. The summary narrative should also reference at least two or three specific things from the transcript (a concept they nailed, one they missed), not just restate the score in different words. If this report were shown for a completely different topic with the words swapped, a reader should immediately notice it doesn't fit — that's the bar for specificity.

Return ONLY a JSON object with this exact shape:
{
  "overallScore": number (0-100),
  "knowledgeLevel": "beginner" | "intermediate" | "advanced" | "expert",
  "areaCoverage": [{ "area": string, "score": number (0-100) }],
  "strongestAreas": string[],
  "weakestAreas": string[],
  "missingConcepts": string[],
  "recommendedLearningTopics": string[],
  "suggestedNextSteps": string[],
  "summary": string (a 3-5 sentence professional narrative summary of the candidate's demonstrated knowledge, written in second person, e.g. "You demonstrate strong understanding of..."),
  "strengths": string[],
  "weaknesses": string[],
  "knowledgeGaps": string[]
}`;

export function buildReportPrompt(
  map: KnowledgeMap,
  history: AnsweredQuestion[],
  areaStates: AreaState[],
): string {
  const transcript = history
    .map(
      (h, i) =>
        `Q${i + 1} [${h.question.type}/${h.question.area}/${h.question.difficulty}]: ${h.question.prompt}\nScore: ${h.evaluation.score}% | Strengths: ${h.evaluation.strengths.join("; ") || "none"} | Weaknesses: ${h.evaluation.weaknesses.join("; ") || "none"} | Missing: ${h.evaluation.missingConcepts.join("; ") || "none"}`,
    )
    .join("\n\n");

  const LEVEL_LABELS = ["beginner", "intermediate", "advanced", "expert"];
  const engineSummary = areaStates
    .map((s) => {
      const confirmed =
        s.confirmedLevelIndex >= 0 ? LEVEL_LABELS[s.confirmedLevelIndex] : "none confirmed";
      const ceiling =
        s.ceilingLevelIndex !== null
          ? `ceiling observed at ${LEVEL_LABELS[s.ceilingLevelIndex]} (first failed there)`
          : "no ceiling hit yet within this assessment";
      return `- ${s.area}: ${s.attempts} question(s) asked, highest level passed = ${confirmed}, ${ceiling}`;
    })
    .join("\n");

  return `Knowledge map for "${map.topic}":\n${JSON.stringify(map.areas)}\n\nFull assessment transcript:\n${transcript}\n\nAdaptive engine's observed per-area levels (ground your areaCoverage scores in this data — it is measured, not estimated; an area whose "highest level passed" is advanced should score meaningfully higher than one that never passed beginner, and a low ceiling should pull that area's score down even if a couple of individual answers scored well):\n${engineSummary}\n\nGenerate the final report now. The areaCoverage array must include an entry for every area in the knowledge map (for areas never tested, infer conservatively from overall pattern and note that in missingConcepts/knowledgeGaps rather than guessing a high score).`;
}
