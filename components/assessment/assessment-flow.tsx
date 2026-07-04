"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { computeAreaStates, computeNextProbe } from "@/lib/adaptive-engine";
import {
  fetchFinalReport,
  fetchKnowledgeMap,
  fetchNextQuestionStream,
  submitAnswerForEvaluation,
} from "@/lib/api-client";
import { clearSession, loadSession, saveSession } from "@/lib/session-storage";
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
  | "loading-report"
  | "report"
  | "error";

// Which async step failed, so retry can re-run just that step instead of
// restarting the whole assessment (and losing everything answered so far).
type FailedStep = "research" | "question" | "evaluate" | "report" | null;

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

// Pulls out a readable preview of the "prompt" field from the raw, still-
// growing JSON text a streamed question response is made of.
function extractPromptPreview(raw: string): string {
  const match = raw.match(/"prompt"\s*:\s*"((?:\\.|[^"\\])*)/);
  if (!match) return "";
  return match[1].replace(/\\n/g, " ").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
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
  const [streamingPreview, setStreamingPreview] = useState("");
  const streamBufferRef = useRef("");

  // The live per-area staircase state driving both question selection and the
  // knowledge radar — recomputed deterministically from history, never stored.
  const areaStates = useMemo(
    () => (knowledgeMap ? computeAreaStates(knowledgeMap, difficulty, history) : []),
    [knowledgeMap, difficulty, history],
  );

  // Guards against React StrictMode's dev-only double effect invocation (and
  // stale in-flight requests on retry) stomping on each other's setState calls.
  const requestIdRef = useRef(0);
  const hydratedRef = useRef(false);
  const failedStepRef = useRef<FailedStep>(null);
  // Stashed so a failed evaluate call can be retried with the exact same
  // submission instead of forcing the user to re-answer.
  const pendingAnswerRef = useRef<AnswerSubmission | null>(null);

  const runQuestionFetch = useCallback(
    async (map: KnowledgeMap, hist: AnsweredQuestion[], qNum: number, requestId: number) => {
      streamBufferRef.current = "";
      setStreamingPreview("");
      try {
        const probe = computeNextProbe(map, difficulty, hist, length);
        const question = await fetchNextQuestionStream(
          map,
          probe.area,
          probe.difficulty,
          probe.areaState,
          length,
          hist,
          qNum,
          (delta) => {
            if (requestIdRef.current !== requestId) return;
            streamBufferRef.current += delta;
            setStreamingPreview(extractPromptPreview(streamBufferRef.current));
          },
        );
        if (requestIdRef.current !== requestId) return;
        failedStepRef.current = null;
        setCurrentQuestion(question);
        setQuestionNumber(qNum);
        setStreamingPreview("");
        setStage("question");
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        failedStepRef.current = "question";
        setStreamingPreview("");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load next question.");
        setStage("error");
      }
    },
    [difficulty, length],
  );

  const runReport = useCallback(
    async (map: KnowledgeMap, hist: AnsweredQuestion[], requestId: number) => {
      try {
        const finalReport = await fetchFinalReport(map, difficulty, hist);
        if (requestIdRef.current !== requestId) return;
        failedStepRef.current = null;
        clearSession();
        setReport(finalReport);
        setStage("report");
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        failedStepRef.current = "report";
        setErrorMessage(err instanceof Error ? err.message : "Failed to generate report.");
        setStage("error");
      }
    },
    [difficulty],
  );

  const runEvaluate = useCallback(
    async (
      map: KnowledgeMap,
      question: Question,
      answer: AnswerSubmission,
      hist: AnsweredQuestion[],
      requestId: number,
    ) => {
      try {
        const evaluation = await submitAnswerForEvaluation(question, answer, map);
        if (requestIdRef.current !== requestId) return;
        pendingAnswerRef.current = null;
        const newHistory = [...hist, { question, answer, evaluation }];
        setHistory(newHistory);

        if (newHistory.length >= length) {
          setStage("loading-report");
          await runReport(map, newHistory, requestId);
          return;
        }

        setStage("loading-question");
        await runQuestionFetch(map, newHistory, newHistory.length + 1, requestId);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        failedStepRef.current = "evaluate";
        pendingAnswerRef.current = answer;
        setErrorMessage(err instanceof Error ? err.message : "Failed to evaluate answer.");
        setStage("error");
      }
    },
    [length, runQuestionFetch, runReport],
  );

  const runResearch = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const map = await fetchKnowledgeMap(topic, difficulty);
      if (requestIdRef.current !== requestId) return;
      failedStepRef.current = null;
      setKnowledgeMap(map);
      setHistory([]);
      setStage("loading-question");
      await runQuestionFetch(map, [], 1, requestId);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      failedStepRef.current = "research";
      setErrorMessage(err instanceof Error ? err.message : "Failed to start assessment.");
      setStage("error");
    }
  }, [topic, difficulty, runQuestionFetch]);

  // On mount: resume a matching in-progress session from sessionStorage, or
  // clear a stale one (different topic/difficulty/length) and start fresh.
  useEffect(() => {
    if (!topic || hydratedRef.current) return;
    hydratedRef.current = true;

    const stored = loadSession();
    if (
      stored &&
      stored.topic === topic &&
      stored.difficulty === difficulty &&
      stored.length === length
    ) {
      const requestId = ++requestIdRef.current;
      /* eslint-disable react-hooks/set-state-in-effect -- one-time resume of a
         prior session on mount, not a reactive sync of external state */
      setKnowledgeMap(stored.knowledgeMap);
      setHistory(stored.history);
      if (stored.currentQuestion) {
        setQuestionNumber(stored.questionNumber);
        setCurrentQuestion(stored.currentQuestion);
        setStage("question");
      } else {
        setStage("loading-question");
        runQuestionFetch(stored.knowledgeMap, stored.history, stored.history.length + 1, requestId);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    clearSession();
    runResearch();
  }, [topic, difficulty, length, runQuestionFetch, runResearch]);

  // Persist progress after every meaningful change so a refresh (or the home
  // page's resume banner) can pick the assessment back up.
  useEffect(() => {
    if (!knowledgeMap || stage === "report") return;
    saveSession({
      topic,
      difficulty,
      length,
      knowledgeMap,
      history,
      currentQuestion,
      questionNumber,
      updatedAt: Date.now(),
    });
  }, [topic, difficulty, length, knowledgeMap, history, currentQuestion, questionNumber, stage]);

  function handleRetry() {
    if (!topic) {
      router.push("/");
      return;
    }
    setErrorMessage("");
    const step = failedStepRef.current;

    if (step === "question" && knowledgeMap) {
      setStage("loading-question");
      const requestId = ++requestIdRef.current;
      runQuestionFetch(knowledgeMap, history, history.length + 1, requestId);
      return;
    }
    if (step === "evaluate" && knowledgeMap && currentQuestion && pendingAnswerRef.current) {
      setStage("loading-evaluation");
      const requestId = ++requestIdRef.current;
      runEvaluate(knowledgeMap, currentQuestion, pendingAnswerRef.current, history, requestId);
      return;
    }
    if (step === "report" && knowledgeMap) {
      setStage("loading-report");
      const requestId = ++requestIdRef.current;
      runReport(knowledgeMap, history, requestId);
      return;
    }

    setStage("loading-research");
    runResearch();
  }

  function handleSubmitAnswer(answer: AnswerSubmission) {
    if (!currentQuestion || stage !== "question" || !knowledgeMap) return;
    const requestId = ++requestIdRef.current;
    setStage("loading-evaluation");
    runEvaluate(knowledgeMap, currentQuestion, answer, history, requestId);
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
        <ReportView topic={topic} report={report} history={history} />
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
        {stage === "loading-question" &&
          (streamingPreview ? (
            <div className="flex w-full flex-col gap-3 rounded-3xl border-2 border-border bg-card/60 px-6 py-8">
              <span className="text-xs font-medium text-muted-foreground">
                writing your next question…
              </span>
              <p className="text-lg leading-snug font-semibold text-foreground/90">
                {streamingPreview}
                <span className="ml-0.5 inline-block h-5 w-[2px] animate-pulse bg-primary align-middle" />
              </p>
            </div>
          ) : (
            <InlineSpinner label="preparing next question…" />
          ))}
        {(stage === "question" || stage === "loading-evaluation") && currentQuestion && (
          <QuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            onSubmit={handleSubmitAnswer}
            submitting={stage === "loading-evaluation"}
          />
        )}
      </div>
    </div>
  );
}
