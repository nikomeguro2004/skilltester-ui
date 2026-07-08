"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { animate, createScope, stagger } from "animejs";
import { ArrowRight, Layers, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { renderInlineCode } from "@/lib/inline-code";
import type { AnswerSubmission, Question } from "@/lib/types";

const TYPE_LABELS: Record<Question["type"], string> = {
  single_choice: "Multiple Choice",
  multi_select: "Select All That Apply",
  scenario: "Scenario",
  short_answer: "Short Answer",
  problem_solving: "Problem Solving",
  practical: "Practical",
  troubleshooting: "Troubleshooting",
  architecture_decision: "Decision Making",
};

const MIN_TEXT_LENGTH = 15;

function MetaTag({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}

export function QuestionCard({
  question,
  onSubmit,
  submitting,
}: {
  question: Question;
  onSubmit: (answer: AnswerSubmission) => void;
  submitting: boolean;
}) {
  const isChoice = question.type === "single_choice" || question.type === "multi_select";
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  const canSubmit = isChoice ? selected.length > 0 : text.trim().length >= MIN_TEXT_LENGTH;

  useLayoutEffect(() => {
    const scope = createScope({ root: cardRef }).add(() => {
      if (!cardRef.current) return;
      animate(cardRef.current, {
        opacity: [0, 1],
        translateY: [18, 0],
        duration: 420,
        ease: "outQuad",
      });
      const rows = cardRef.current.querySelectorAll("[data-option-row]");
      if (rows.length) {
        animate(rows, {
          opacity: [0, 1],
          translateX: [-10, 0],
          delay: stagger(55, { start: 180 }),
          duration: 340,
          ease: "outQuad",
        });
      }
    });
    return () => scope.revert();
  }, [question.id]);

  function pulseOptionRow(optionId: string) {
    const row = document.getElementById(optionId)?.closest("[data-option-row]");
    if (row) animate(row, { scale: [0.98, 1.01, 1], duration: 320, ease: "outElastic(1, .6)" });
  }

  function selectSingle(id: string) {
    setSelected([id]);
    pulseOptionRow(id);
  }

  function toggleMulti(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    pulseOptionRow(id);
  }

  function handleSubmit() {
    if (!canSubmit || submitting) return;
    if (submitBtnRef.current) {
      animate(submitBtnRef.current, { scale: [1, 0.95, 1], duration: 260, ease: "outQuad" });
    }
    onSubmit(
      isChoice
        ? { questionId: question.id, selectedOptionIds: selected }
        : { questionId: question.id, text: text.trim() },
    );
  }

  function handleSkip() {
    if (submitting) return;
    onSubmit({ questionId: question.id, skipped: true });
  }

  return (
    <div
      ref={cardRef}
      style={{ opacity: 0 }}
      className="w-full overflow-hidden rounded-3xl border-2 border-border bg-card p-6 shadow-xl sm:p-8"
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <MetaTag icon={<Layers className="size-3" />}>{question.area}</MetaTag>
        <MetaTag icon={<ListChecks className="size-3" />}>{TYPE_LABELS[question.type]}</MetaTag>
        <MetaTag>{question.difficulty}</MetaTag>
      </div>

      {question.context && (
        <div className="mb-5 rounded-2xl border border-border bg-secondary/40 p-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {renderInlineCode(question.context)}
        </div>
      )}

      <h2 className="text-balance text-xl leading-relaxed font-semibold text-foreground sm:text-2xl">
        {renderInlineCode(question.prompt)}
      </h2>

      <div className="mt-6">
        {question.type === "single_choice" && (
          <RadioGroup value={selected[0] ?? ""} onValueChange={selectSingle}>
            <div className="space-y-2.5">
              {question.options?.map((opt) => (
                <Label
                  key={opt.id}
                  htmlFor={opt.id}
                  data-option-row
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-normal transition-colors",
                    selected[0] === opt.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/60 hover:border-primary/30",
                  )}
                >
                  <RadioGroupItem value={opt.id} id={opt.id} className="mt-0.5" />
                  <span className="leading-relaxed whitespace-pre-wrap">
                    {renderInlineCode(opt.label)}
                  </span>
                </Label>
              ))}
            </div>
          </RadioGroup>
        )}

        {question.type === "multi_select" && (
          <div className="space-y-2.5">
            {question.options?.map((opt) => (
              <Label
                key={opt.id}
                htmlFor={opt.id}
                data-option-row
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-normal transition-colors",
                  selected.includes(opt.id)
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background/60 hover:border-primary/30",
                )}
              >
                <Checkbox
                  id={opt.id}
                  checked={selected.includes(opt.id)}
                  onCheckedChange={() => toggleMulti(opt.id)}
                  className="mt-0.5"
                />
                <span className="leading-relaxed whitespace-pre-wrap">
                  {renderInlineCode(opt.label)}
                </span>
              </Label>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Select all that apply
            </p>
          </div>
        )}

        {!isChoice && (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your answer — be specific and explain your thinking…"
            className="min-h-40 resize-y rounded-2xl bg-background/60 text-sm leading-relaxed"
          />
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {isChoice
            ? `${selected.length} selected`
            : `${text.trim().length < MIN_TEXT_LENGTH ? `${MIN_TEXT_LENGTH - text.trim().length} more characters needed` : "Ready to submit"}`}
        </p>
        <Button
          ref={submitBtnRef}
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          size="lg"
          className="rounded-2xl font-semibold"
        >
          {submitting ? "Checking…" : "Submit Answer"}
          {!submitting && <ArrowRight className="ml-1 size-4" />}
        </Button>
      </div>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={handleSkip}
          disabled={submitting}
          className="text-xs font-medium text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 outline-none transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          I don&apos;t know, skip this one
        </button>
      </div>
    </div>
  );
}
