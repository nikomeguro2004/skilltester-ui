"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { animate, createScope, stagger } from "animejs";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  Compass,
  Copy,
  ListChecks,
  RotateCcw,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { renderInlineCode } from "@/lib/inline-code";
import { useCountUp } from "@/lib/use-count-up";
import type { AnsweredQuestion, AssessmentLength, Difficulty, FinalReport } from "@/lib/types";

function levelColor(score: number) {
  if (score >= 85) return "text-chart-2";
  if (score >= 65) return "text-primary";
  if (score >= 40) return "text-chart-3";
  return "text-destructive";
}

function barColor(score: number) {
  if (score >= 85) return "bg-chart-2";
  if (score >= 65) return "bg-primary";
  if (score >= 40) return "bg-chart-3";
  return "bg-destructive";
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ScoreRing({ score }: { score: number }) {
  const circleRef = useRef<SVGCircleElement>(null);
  const animatedScore = useCountUp(score, 1100);

  useLayoutEffect(() => {
    if (!circleRef.current) return;
    const offset = CIRCUMFERENCE * (1 - score / 100);
    const animation = animate(circleRef.current, {
      strokeDashoffset: [CIRCUMFERENCE, offset],
      duration: 1100,
      ease: "outExpo",
    });
    return () => {
      animation.pause();
    };
  }, [score]);

  return (
    <div className="relative flex size-32 shrink-0 items-center justify-center sm:size-36">
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="8" className="stroke-secondary" />
        <circle
          ref={circleRef}
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
          className={cn(levelColor(score), "stroke-current")}
          style={{ filter: "drop-shadow(0 0 6px currentColor)" }}
        />
      </svg>
      <p className={cn("text-4xl font-bold tabular-nums", levelColor(score))}>{animatedScore}</p>
    </div>
  );
}

const PASS_THRESHOLD = 70;

function QuestionReviewRow({ index, item }: { index: number; item: AnsweredQuestion }) {
  const [open, setOpen] = useState(false);
  const { question, answer, evaluation } = item;
  const passed = evaluation.score >= PASS_THRESHOLD;
  const isChoice = question.type === "single_choice" || question.type === "multi_select";
  const correctIds = new Set(question.correctOptionIds ?? []);
  const selectedIds = new Set(answer.selectedOptionIds ?? []);

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            passed ? "bg-chart-2/15 text-chart-2" : "bg-destructive/15 text-destructive",
          )}
        >
          {passed ? <Check className="size-4" /> : <X className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            Question {index + 1} · {question.area}
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            {renderInlineCode(question.prompt)}
          </p>
        </div>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {answer.skipped ? "Skipped" : `${evaluation.score}%`}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-4 pt-4 pb-5 text-sm">
          {question.context && (
            <p className="rounded-xl bg-secondary/40 p-3 whitespace-pre-wrap text-muted-foreground">
              {renderInlineCode(question.context)}
            </p>
          )}
          <p className="font-medium text-foreground/90">{renderInlineCode(question.prompt)}</p>

          {isChoice && question.options ? (
            <div className="space-y-1.5">
              {question.options.map((opt) => {
                const isCorrect = correctIds.has(opt.id);
                const isSelected = selectedIds.has(opt.id);
                return (
                  <div
                    key={opt.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 whitespace-pre-wrap",
                      isCorrect && "bg-chart-2/10 text-chart-2",
                      isSelected && !isCorrect && "bg-destructive/10 text-destructive",
                      !isCorrect && !isSelected && "text-muted-foreground",
                    )}
                  >
                    {isCorrect && <Check className="size-3.5 shrink-0" />}
                    {isSelected && !isCorrect && <X className="size-3.5 shrink-0" />}
                    <span className="flex-1">{renderInlineCode(opt.label)}</span>
                    {isSelected && <span className="shrink-0 text-xs opacity-70">your pick</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Your answer</p>
              <p className="rounded-xl bg-secondary/30 p-3 whitespace-pre-wrap text-foreground/85">
                {answer.skipped
                  ? "(you skipped this question)"
                  : answer.text
                    ? renderInlineCode(answer.text)
                    : "(no answer provided)"}
              </p>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Ideal answer</p>
            <p className="whitespace-pre-wrap text-foreground/80">
              {renderInlineCode(evaluation.idealAnswer)}
            </p>
          </div>

          {evaluation.explanation && (
            <p className="text-foreground/70">{renderInlineCode(evaluation.explanation)}</p>
          )}
        </div>
      )}
    </div>
  );
}

function InsightCard({
  icon,
  title,
  chips,
  items,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  chips?: string[];
  items?: string[];
  tone?: "default" | "primary";
}) {
  const empty = (chips && chips.length === 0) || (items && items.length === 0);
  if (empty) return null;

  return (
    <section
      className={cn(
        "mb-5 break-inside-avoid rounded-3xl border-2 p-6",
        tone === "primary" ? "border-primary/20 bg-primary/5" : "border-border bg-card",
      )}
    >
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </h3>
      {chips && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                tone === "primary"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-secondary/50 text-foreground/85",
              )}
            >
              {renderInlineCode(c)}
            </span>
          ))}
        </div>
      )}
      {items && (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed text-foreground/85">
              {renderInlineCode(item)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatResultsAsText(topic: string, report: FinalReport): string {
  const lines = [
    `${topic} — Quiz Results`,
    `Score: ${report.overallScore}% (${report.knowledgeLevel} level)`,
    "",
    "What I covered:",
    ...report.areaCoverage.map((a) =>
      a.assessed ? `  - ${a.area}: ${a.score}%` : `  - ${a.area}: not assessed`,
    ),
  ];
  if (report.strongestAreas.length) {
    lines.push("", "Strongest areas:", ...report.strongestAreas.map((a) => `  - ${a}`));
  }
  if (report.weakestAreas.length) {
    lines.push("", "Room to grow:", ...report.weakestAreas.map((a) => `  - ${a}`));
  }
  lines.push("", report.summary);
  return lines.join("\n");
}

function CopyResultsButton({ topic, report }: { topic: string; report: FinalReport }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatResultsAsText(topic, report));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard permission denied or unavailable — nothing to fall back to
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      variant="outline"
      className="rounded-2xl font-semibold"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <CheckCheck className="mr-1 size-4" />
          Copied
        </>
      ) : (
        <>
          <Copy className="mr-1 size-4" />
          Copy Results
        </>
      )}
    </Button>
  );
}

export function ReportView({
  topic,
  report,
  history,
  difficulty,
  length,
  backHref,
  backLabel,
}: {
  topic: string;
  report: FinalReport;
  history: AnsweredQuestion[];
  difficulty?: Difficulty;
  length?: AssessmentLength;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const sortedCoverage = [...report.areaCoverage].sort((a, b) => {
    if (a.assessed !== b.assessed) return a.assessed ? -1 : 1;
    return b.score - a.score;
  });
  const correctCount = history.filter((h) => h.evaluation.score >= PASS_THRESHOLD).length;

  useLayoutEffect(() => {
    const scope = createScope({ root: rootRef }).add(() => {
      if (!rootRef.current) return;

      const sections = rootRef.current.querySelectorAll("[data-report-section]");
      animate(sections, {
        opacity: [0, 1],
        translateY: [16, 0],
        delay: stagger(90),
        duration: 420,
        ease: "outQuad",
      });

      const bars = rootRef.current.querySelectorAll<HTMLElement>("[data-bar-fill]");
      bars.forEach((bar, i) => {
        animate(bar, {
          width: [`0%`, `${bar.dataset.value}%`],
          delay: 480 + i * 40,
          duration: 700,
          ease: "outExpo",
        });
      });
    });
    return () => scope.revert();
  }, [report]);

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-3xl">
      <div
        data-report-section
        style={{ opacity: 0 }}
        className="mb-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-center sm:gap-10 sm:text-left"
      >
        <ScoreRing score={report.overallScore} />
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {topic} — Your Results
          </p>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-sm text-foreground capitalize">
            <span className="size-1.5 rounded-full bg-primary" />
            {report.knowledgeLevel} level
          </p>
        </div>
      </div>

      <section
        data-report-section
        style={{ opacity: 0 }}
        className="rounded-3xl border-2 border-border bg-card p-6 shadow-lg sm:p-8"
      >
        <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Target className="size-4 text-primary" />
          What You Covered
        </h3>
        <div className="space-y-4">
          {sortedCoverage.map((area) =>
            area.assessed ? (
              <div key={area.area}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-foreground/90">{area.area}</span>
                  <span className="tabular-nums text-muted-foreground">{area.score}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    data-bar-fill
                    data-value={area.score}
                    style={{ width: 0 }}
                    className={cn("h-full rounded-full", barColor(area.score))}
                  />
                </div>
              </div>
            ) : (
              <div key={area.area} className="flex items-center justify-between text-sm opacity-60">
                <span className="text-foreground/70">{area.area}</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  Not assessed
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      <section
        data-report-section
        style={{ opacity: 0 }}
        className="mt-6 rounded-3xl border-2 border-primary/20 bg-primary/5 p-6 sm:p-8"
      >
        <h3 className="mb-3 text-sm font-semibold text-primary">
          Your Summary
        </h3>
        <p className="text-sm leading-relaxed text-foreground/90">
          {renderInlineCode(report.summary)}
        </p>
      </section>

      <section data-report-section style={{ opacity: 0 }} className="mt-6">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <ListChecks className="size-4 text-primary" />
          Question by Question
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {correctCount} of {history.length} correct
          </span>
        </h3>
        <div className="space-y-2.5">
          {history.map((item, i) => (
            <QuestionReviewRow key={item.question.id} index={i} item={item} />
          ))}
        </div>
      </section>

      <div data-report-section style={{ opacity: 0 }} className="mt-6 columns-1 gap-5 sm:columns-2">
        <InsightCard
          icon={<TrendingUp className="size-4 text-chart-2" />}
          title="You Know This Well"
          chips={report.strongestAreas}
        />
        <InsightCard
          icon={<TrendingDown className="size-4 text-destructive" />}
          title="Room to Grow"
          chips={report.weakestAreas}
        />
        <InsightCard icon={<Target className="size-4 text-chart-2" />} title="Strengths" items={report.strengths} />
        <InsightCard
          icon={<Target className="size-4 text-destructive" />}
          title="Weaknesses"
          items={report.weaknesses}
        />
        <InsightCard title="Knowledge Gaps" icon={<Compass className="size-4 text-foreground/60" />} items={report.knowledgeGaps} />
        <InsightCard title="Things You Missed" icon={<Compass className="size-4 text-foreground/60" />} items={report.missingConcepts} />
        <InsightCard
          icon={<BookOpen className="size-4 text-primary" />}
          title="Worth Learning More About"
          chips={report.recommendedLearningTopics}
          tone="primary"
        />
        <InsightCard
          icon={<ArrowRight className="size-4 text-primary" />}
          title="What's Next"
          items={report.suggestedNextSteps}
          tone="primary"
        />
      </div>

      <div
        data-report-section
        style={{ opacity: 0 }}
        className="mt-10 flex flex-wrap justify-center gap-3"
      >
        {difficulty && length && (
          <Button
            size="lg"
            className="rounded-2xl font-semibold"
            onClick={() =>
              router.push(
                `/assessment?${new URLSearchParams({ topic, difficulty, length: String(length) }).toString()}`,
              )
            }
          >
            <RotateCcw className="mr-1 size-4" />
            Retake This Topic
          </Button>
        )}
        <Button
          size="lg"
          variant="outline"
          className="rounded-2xl font-semibold"
          onClick={() => router.push(backHref ?? "/")}
        >
          {backLabel ?? "Try Another Topic"}
        </Button>
        <CopyResultsButton topic={topic} report={report} />
      </div>
    </div>
  );
}
