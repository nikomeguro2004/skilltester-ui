"use client";

import { useLayoutEffect, useRef } from "react";
import { animate, createScope, stagger } from "animejs";
import { Sparkles } from "lucide-react";
import { scrambleTo } from "@/lib/scramble-text";

const RESEARCH_STEPS = [
  "Learning about your topic",
  "Mapping out what's worth knowing",
  "Thinking up some good questions",
];

export function ResearchLoading({ topic }: { topic: string }) {
  return (
    <StageLoading
      title={topic ? `Getting ready to explore ${topic}` : "Getting ready…"}
      subtitle="Just a moment while we put together your quiz."
      steps={RESEARCH_STEPS}
    />
  );
}

const REPORT_STEPS = [
  "Reviewing your answers",
  "Spotting your strengths & gaps",
  "Writing up your results",
];

export function ReportLoading({ topic }: { topic: string }) {
  return (
    <StageLoading
      title={`Wrapping up your ${topic} quiz`}
      subtitle="Putting together your final results."
      steps={REPORT_STEPS}
    />
  );
}

export function StageLoading({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle: string;
  steps: string[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const scope = createScope({ root: rootRef }).add(() => {
      if (iconRef.current) {
        animate(iconRef.current, {
          rotate: [-8, 8],
          duration: 1400,
          loop: true,
          alternate: true,
          ease: "inOutSine",
        });
      }
      if (titleRef.current) {
        scrambleTo(titleRef.current, title, 900);
      }
      const stepEls = rootRef.current?.querySelectorAll("[data-step]");
      if (stepEls?.length) {
        animate(stepEls, {
          opacity: [0, 1],
          translateX: [-8, 0],
          delay: stagger(400),
          duration: 400,
          ease: "outQuad",
        });
      }
    });
    return () => scope.revert();
  }, [title]);

  return (
    <div
      ref={rootRef}
      className="relative flex flex-1 flex-col items-center justify-center px-4 py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_50%_40%_at_50%_40%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_65%)]"
      />

      <div
        ref={iconRef}
        className="mb-6 flex size-14 items-center justify-center rounded-2xl border-2 border-border bg-secondary/50"
      >
        <Sparkles className="size-6 text-primary" />
      </div>

      <h2 className="text-center text-lg font-semibold tracking-tight text-foreground">
        <span ref={titleRef} />
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">{subtitle}</p>

      <div className="mt-10 w-full max-w-sm space-y-2.5">
        {steps.map((step) => (
          <div
            key={step}
            data-step
            style={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-primary/70" />
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}
