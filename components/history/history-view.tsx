"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportView } from "@/components/report/report-view";
import { cn } from "@/lib/utils";
import { deleteQuizRecord, loadQuizHistory, type QuizRecord } from "@/lib/quiz-history";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scoreTone(score: number) {
  if (score >= 70) return "bg-chart-2/15 text-chart-2";
  if (score >= 40) return "bg-chart-3/15 text-chart-3";
  return "bg-destructive/15 text-destructive";
}

export function HistoryView() {
  const [records, setRecords] = useState<QuizRecord[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of localStorage on mount, not a reactive sync of external state
    setRecords(loadQuizHistory());
  }, []);

  if (records === null) return null;

  const selected = selectedId ? records.find((r) => r.id === selectedId) : null;

  if (selected) {
    return (
      <div className="flex-1 px-4 py-16">
        <div className="mx-auto mb-6 w-full max-w-3xl">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to History
          </button>
        </div>
        <ReportView
          topic={selected.topic}
          report={selected.report}
          history={selected.history}
          difficulty={selected.difficulty}
          length={selected.length}
          backHref="/history"
          backLabel="Back to History"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Your Quiz History</h1>
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          New Quiz
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border p-10 text-center">
          <Clock className="mx-auto mb-3 size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            You haven&apos;t finished a quiz yet. Once you do, it&apos;ll show up here.
          </p>
          <Button asChild className="mt-5 rounded-2xl font-semibold">
            <Link href="/">Start a Quiz</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div
              key={r.id}
              className="group relative flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <button
                type="button"
                onClick={() => setSelectedId(r.id)}
                className="flex flex-1 items-center gap-4 text-left outline-none"
              >
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                    scoreTone(r.report.overallScore),
                  )}
                >
                  {r.report.overallScore}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{r.topic}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {r.difficulty} · {r.length} questions · {formatDate(r.completedAt)}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteQuizRecord(r.id);
                  setRecords(loadQuizHistory());
                }}
                className="shrink-0 rounded-full p-2 text-muted-foreground/50 opacity-0 transition-opacity outline-none hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Delete ${r.topic} record`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
