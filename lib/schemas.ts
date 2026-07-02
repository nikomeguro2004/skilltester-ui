import { z } from "zod";

export const difficultySchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
  "expert",
]);

export const areaStateSchema = z.object({
  area: z.string(),
  weight: z.number(),
  attempts: z.number(),
  position: z.number(),
  nextLevelIndex: z.number(),
  lastScore: z.number().nullable(),
  confirmedLevelIndex: z.number(),
  ceilingLevelIndex: z.number().nullable(),
  ceilingPending: z.boolean(),
});

export const knowledgeMapSchema = z.object({
  topic: z.string().min(1),
  summary: z.string().min(1),
  areas: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        weight: z.number().min(1).max(5),
      }),
    )
    .min(3),
  commonMistakes: z.array(z.string()).min(1),
  bestPractices: z.array(z.string()).min(1),
  faqs: z.array(z.string()).min(1),
});

const questionTypeSchema = z.enum([
  "single_choice",
  "multi_select",
  "scenario",
  "short_answer",
  "problem_solving",
  "practical",
  "troubleshooting",
  "architecture_decision",
]);

export const questionSchema = z
  .object({
    id: z.string().min(1),
    type: questionTypeSchema,
    area: z.string().min(1),
    difficulty: difficultySchema,
    prompt: z.string().min(1),
    context: z.string().optional(),
    options: z
      .array(z.object({ id: z.string().min(1), label: z.string().min(1) }))
      .optional(),
    correctOptionIds: z.array(z.string()).optional(),
  })
  .refine(
    (q) =>
      ["single_choice", "multi_select"].includes(q.type)
        ? !!q.options?.length && !!q.correctOptionIds?.length
        : true,
    { message: "choice questions require options and correctOptionIds" },
  );

export const evaluationSchema = z.object({
  score: z.number().min(0).max(100),
  accuracy: z.number().min(0).max(100),
  understanding: z.number().min(0).max(100),
  practicalThinking: z.number().min(0).max(100),
  technicalDepth: z.number().min(0).max(100),
  communication: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  idealAnswer: z.string(),
  improvementSuggestions: z.array(z.string()),
  explanation: z.string(),
});

export const answerSubmissionSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionIds: z.array(z.string()).optional(),
  text: z.string().optional(),
});

export const answeredQuestionSchema = z.object({
  question: questionSchema,
  answer: answerSubmissionSchema,
  evaluation: evaluationSchema,
});

export const assessmentLengthSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
]);

export const finalReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  knowledgeLevel: difficultySchema,
  areaCoverage: z
    .array(z.object({ area: z.string().min(1), score: z.number().min(0).max(100) }))
    .min(1),
  strongestAreas: z.array(z.string()),
  weakestAreas: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  recommendedLearningTopics: z.array(z.string()),
  suggestedNextSteps: z.array(z.string()),
  summary: z.string().min(1),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  knowledgeGaps: z.array(z.string()),
});
