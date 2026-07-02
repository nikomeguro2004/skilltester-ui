"use client";

import { useLayoutEffect, useRef } from "react";
import { animate, createScope, stagger } from "animejs";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Compass,
  RotateCcw,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/lib/use-count-up";
import type { FinalReport } from "@/lib/types";

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

export function ReportView({ topic, report }: { topic: string; report: FinalReport }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const sortedCoverage = [...report.areaCoverage].sort((a, b) => b.score - a.score);

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
          {sortedCoverage.map((area) => (
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
          ))}
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
        <p className="text-sm leading-relaxed text-foreground/90">{report.summary}</p>
      </section>

      <div data-report-section style={{ opacity: 0 }} className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-3xl border-2 border-border bg-card p-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <TrendingUp className="size-4 text-chart-2" />
            You Know This Well
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {report.strongestAreas.map((a) => (
              <span
                key={a}
                className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-foreground/85"
              >
                {a}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border-2 border-border bg-card p-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <TrendingDown className="size-4 text-destructive" />
            Room to Grow
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {report.weakestAreas.map((a) => (
              <span
                key={a}
                className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-foreground/85"
              >
                {a}
              </span>
            ))}
          </div>
        </section>
      </div>

      <div data-report-section style={{ opacity: 0 }} className="mt-6 grid gap-6 sm:grid-cols-2">
        <ListSection title="Strengths" items={report.strengths} />
        <ListSection title="Weaknesses" items={report.weaknesses} />
        <ListSection title="Knowledge Gaps" items={report.knowledgeGaps} />
        <ListSection title="Things You Missed" items={report.missingConcepts} />
      </div>

      <section
        data-report-section
        style={{ opacity: 0 }}
        className="mt-6 rounded-3xl border-2 border-border bg-card p-6 sm:p-8"
      >
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <BookOpen className="size-4 text-primary" />
          Worth Learning More About
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {report.recommendedLearningTopics.map((t) => (
            <span
              key={t}
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <section
        data-report-section
        style={{ opacity: 0 }}
        className="mt-6 rounded-3xl border-2 border-border bg-card p-6 sm:p-8"
      >
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Compass className="size-4 text-primary" />
          What&apos;s Next
        </h3>
        <ul className="space-y-2">
          {report.suggestedNextSteps.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/85">
              <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
              {s}
            </li>
          ))}
        </ul>
      </section>

      <div data-report-section style={{ opacity: 0 }} className="mt-10 flex justify-center">
        <Button
          size="lg"
          variant="outline"
          className="rounded-2xl font-semibold"
          onClick={() => router.push("/")}
        >
          <RotateCcw className="mr-1 size-4" />
          Try Another Topic
        </Button>
      </div>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-3xl border-2 border-border bg-card p-6">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed text-foreground/85">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
