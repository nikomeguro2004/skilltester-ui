"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { computeAreaStates, computeNextProbe } from "@/lib/adaptive-engine";
import {
  fetchFinalReport,
  fetchKnowledgeMap,
  fetchNextQuestion,
  submitAnswerForEvaluation,
} from "@/lib/api-client";
import type {
  AnsweredQuestion,
  AnswerSubmission,
  AssessmentLength,
  Difficulty,
  FinalReport,
  KnowledgeMap,
  Question,
} from "@/lib/types";
import { ProgressHeader } from "./progress-header";
import { KnowledgeRadar } from "./knowledge-radar";
import { QuestionCard } from "./question-card";
import { ResearchLoading, ReportLoading } from "./research-loading";
import { InlineSpinner } from "./inline-spinner";
import { ErrorState } from "./error-state";
import { ReportView } from "@/components/report/report-view";

type Stage =
  | "loading-research"
  | "loading-question"
  | "question"
  | "loading-evaluation"
  | "feedback"
  | "loading-report"
  | "report"
  | "error";

function parseDifficulty(value: string | null): Difficulty {
  if (value === "beginner" || value === "intermediate" || value === "advanced" || value === "expert") {
    return value;
  }
  return "intermediate";
}

function parseLength(value: string | null): AssessmentLength {
  const n = Number(value);
  return n === 5 || n === 15 ? n : 10;
}

export function AssessmentFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = (searchParams.get("topic") || "").trim();
  const difficulty = parseDifficulty(searchParams.get("difficulty"));
  const length = parseLength(searchParams.get("length"));

  const [stage, setStage] = useState<Stage>(() => (topic ? "loading-research" : "error"));
  const [knowledgeMap, setKnowledgeMap] = useState<KnowledgeMap | null>(null);
  const [history, setHistory] = useState<AnsweredQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [errorMessage, setErrorMessage] = useState(() =>
    topic ? "" : "No topic was provided.",
  );

  // The live per-area staircase state driving both question selection and the
  // knowledge radar — recomputed deterministically from history, never stored.
  const areaStates = useMemo(
    () => (knowledgeMap ? computeAreaStates(knowledgeMap, difficulty, history) : []),
    [knowledgeMap, difficulty, history],
  );

  // Guards against React StrictMode's dev-only double effect invocation (and
  // stale in-flight requests on retry) stomping on each other's setState calls.
  const requestIdRef = useRef(0);

  const startResearch = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const map = await fetchKnowledgeMap(topic, difficulty);
      if (requestIdRef.current !== requestId) return;
      setKnowledgeMap(map);
      setQuestionNumber(1);
      setStage("loading-question");
      const probe = computeNextProbe(map, difficulty, []);
      const question = await fetchNextQuestion(map, probe.area, probe.difficulty, length, [], 1);
      if (requestIdRef.current !== requestId) return;
      setCurrentQuestion(question);
      setStage("question");
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setErrorMessage(err instanceof Error ? err.message : "Failed to start assessment.");
      setStage("error");
    }
  }, [topic, difficulty, length]);

  useEffect(() => {
    if (!topic) return;
    // Kicks off the async research→question fetch chain on mount; all setState
    // calls inside startResearch happen after an await, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startResearch();
  }, [topic, startResearch]);

  function handleRetry() {
    if (!topic) {
      router.push("/");
      return;
    }
    setErrorMessage("");
    setStage("loading-research");
    startResearch();
  }

  async function handleSubmitAnswer(answer: AnswerSubmission) {
    if (!currentQuestion || stage !== "question" || !knowledgeMap) return;
    setStage("loading-evaluation");
    try {
      const evaluation = await submitAnswerForEvaluation(currentQuestion, answer);
      const newHistory = [...history, { question: currentQuestion, answer, evaluation }];
      setHistory(newHistory);

      if (newHistory.length >= length) {
        setStage("loading-report");
        try {
          const finalReport = await fetchFinalReport(knowledgeMap, difficulty, newHistory);
          setReport(finalReport);
          setStage("report");
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : "Failed to generate report.");
          setStage("error");
        }
        return;
      }

      setStage("loading-question");
      try {
        const nextNumber = questionNumber + 1;
        const probe = computeNextProbe(knowledgeMap, difficulty, newHistory);
        const question = await fetchNextQuestion(
          knowledgeMap,
          probe.area,
          probe.difficulty,
          length,
          newHistory,
          nextNumber,
        );
        setCurrentQuestion(question);
        setQuestionNumber(nextNumber);
        setStage("question");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load next question.");
        setStage("error");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to evaluate answer.");
      setStage("error");
    }
  }

  if (stage === "error") {
    return (
      <ErrorState
        message={errorMessage}
        onRetry={handleRetry}
        actionLabel={topic ? "try again" : "go home"}
        isHomeAction={!topic}
      />
    );
  }

  if (stage === "loading-research") {
    return <ResearchLoading topic={topic} />;
  }

  if (stage === "loading-report") {
    return <ReportLoading topic={topic} />;
  }

  if (stage === "report" && report) {
    return (
      <div className="flex-1 px-6 py-16">
        <ReportView topic={topic} report={report} />
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <div
        aria-hidden
        className="bg-dot-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,black,transparent)]"
      />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
        <ProgressHeader topic={topic} current={questionNumber} total={length} />
        {areaStates.length > 0 && <KnowledgeRadar areaStates={areaStates} />}
        {stage === "loading-question" && <InlineSpinner label="preparing next question…" />}
        {stage === "question" && currentQuestion && (
          <QuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            onSubmit={handleSubmitAnswer}
            submitting={stage !== "question"}
          />
        )}
        {stage === "loading-evaluation" && <InlineSpinner label="submitting your answer…" />}
      </div>
    </div>
  );
}
