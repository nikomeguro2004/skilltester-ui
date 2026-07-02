"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { animate, createScope } from "animejs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scrambleTo } from "@/lib/scramble-text";
import { DIFFICULTY_OPTIONS, EXAMPLE_TOPICS, LENGTH_OPTIONS } from "@/lib/constants";
import type { AssessmentLength, Difficulty } from "@/lib/types";

export function AssessmentSetupForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [length, setLength] = useState<AssessmentLength>(10);
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

  const rootRef = useRef<HTMLFormElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);

  // Blinking cursor next to the input — a continuous anime.js loop, scoped for cleanup.
  useEffect(() => {
    const scope = createScope({ root: rootRef }).add(() => {
      if (cursorRef.current) {
        animate(cursorRef.current, {
          opacity: [{ to: 1, duration: 0 }, { to: 1, duration: 500 }, { to: 0, duration: 0 }, { to: 0, duration: 500 }],
          loop: true,
        });
      }
    });
    return () => scope.revert();
  }, []);

  // Cycles the ghost example-topic text through a scramble/decode transition
  // whenever the input is empty and idle — pauses the moment the user types.
  // The span is left contentless in JSX and seeded imperatively here, so React's
  // reconciliation never fights anime.js's direct textContent mutations.
  useEffect(() => {
    if (topic) return;
    const el = ghostRef.current;
    if (!el) return;

    el.textContent = EXAMPLE_TOPICS[0];

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let index = 0;
    const SCRAMBLE_DURATION = 650;
    const HOLD_DURATION = 1700;

    function cycle() {
      if (cancelled || !el) return;
      index = (index + 1) % EXAMPLE_TOPICS.length;
      scrambleTo(el, EXAMPLE_TOPICS[index], SCRAMBLE_DURATION);
      timeoutId = setTimeout(cycle, SCRAMBLE_DURATION + HOLD_DURATION);
    }

    timeoutId = setTimeout(cycle, 2200);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [topic]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);

    if (submitBtnRef.current) {
      animate(submitBtnRef.current, {
        scale: [1, 0.96, 1],
        duration: 280,
        ease: "outQuad",
      });
    }

    const params = new URLSearchParams({
      topic: trimmed,
      difficulty,
      length: String(length),
    });
    router.push(`/assessment?${params.toString()}`);
  }

  function handleDifficultyClick(el: HTMLButtonElement | null, value: Difficulty) {
    setDifficulty(value);
    if (el) animate(el, { scale: [0.96, 1], duration: 280, ease: "outElastic(1, .6)" });
  }

  function handleLengthClick(el: HTMLButtonElement | null, value: AssessmentLength) {
    setLength(value);
    if (el) animate(el, { scale: [0.96, 1], duration: 280, ease: "outElastic(1, .6)" });
  }

  return (
    <form ref={rootRef} onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div
        className={cn(
          "overflow-hidden rounded-3xl border-2 bg-card shadow-xl transition-colors",
          focused ? "border-primary" : "border-border",
        )}
      >
        <div className="flex items-center gap-3 px-6 py-5">
          <Sparkles className="size-5 shrink-0 text-primary" />
          <div className="relative flex-1">
            {!topic && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-base text-muted-foreground/60 sm:text-lg"
              >
                <span ref={ghostRef} />
              </span>
            )}
            <input
              autoFocus
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="relative w-full bg-transparent text-base text-foreground outline-none sm:text-lg"
            />
          </div>
          <span ref={cursorRef} className="h-5 w-[2px] shrink-0 bg-primary" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLE_TOPICS.map((example) => (
          <button
            type="button"
            key={example}
            onClick={(e) => {
              setTopic(example);
              animate(e.currentTarget, { scale: [0.9, 1], duration: 260, ease: "outElastic(1, .6)" });
            }}
            className="rounded-full border border-border bg-secondary/50 px-3.5 py-1.5 text-sm text-muted-foreground transition-all outline-none hover:border-primary/40 hover:bg-secondary hover:text-foreground active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {example}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Difficulty
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={(e) => handleDifficultyClick(e.currentTarget, opt.value)}
                className={cn(
                  "rounded-2xl border-2 px-3.5 py-3 text-left text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  difficulty === opt.value
                    ? "border-primary bg-primary/10 text-foreground shadow-sm"
                    : "border-border bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                <span className="block font-semibold">{opt.label}</span>
                <span className="block text-xs text-muted-foreground/90">
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            How Many Questions?
          </p>
          <div className="grid grid-cols-3 gap-2">
            {LENGTH_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={(e) => handleLengthClick(e.currentTarget, opt.value)}
                className={cn(
                  "rounded-2xl border-2 px-3 py-3 text-center text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  length === opt.value
                    ? "border-primary bg-primary/10 text-foreground shadow-sm"
                    : "border-border bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                <span className="block font-semibold">{opt.label}</span>
                <span className="block text-xs text-muted-foreground/90">
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <Button
          ref={submitBtnRef}
          type="submit"
          size="lg"
          disabled={!topic.trim() || submitting}
          className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/20"
        >
          {submitting ? "Getting things ready…" : "Start the Quiz"}
          {!submitting && <ArrowRight className="ml-1 size-4" />}
        </Button>
      </div>
    </form>
  );
}
