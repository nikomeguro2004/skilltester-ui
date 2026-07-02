"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession, loadSession, type StoredSession } from "@/lib/session-storage";

export function ResumeBanner() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of sessionStorage on mount, not a reactive sync of external state
    setSession(loadSession());
  }, []);

  if (!session) return null;

  function handleContinue() {
    if (!session) return;
    const params = new URLSearchParams({
      topic: session.topic,
      difficulty: session.difficulty,
      length: String(session.length),
    });
    router.push(`/assessment?${params.toString()}`);
  }

  function handleStartDifferent() {
    clearSession();
    setSession(null);
  }

  return (
    <div className="mb-8 flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border-2 border-primary/25 bg-primary/5 px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
      <p className="text-sm text-foreground/85">
        You have an unfinished quiz on <span className="font-semibold">{session.topic}</span> —
        question {session.questionNumber} of {session.length}.
      </p>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={handleStartDifferent}
        >
          <RotateCcw className="mr-1 size-3.5" />
          Start Different Topic
        </Button>
        <Button type="button" size="sm" className="rounded-xl" onClick={handleContinue}>
          Continue
          <ArrowRight className="ml-1 size-3.5" />
        </Button>
      </div>
    </div>
  );
}
