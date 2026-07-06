"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function ExitButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="fixed top-5 left-5 z-20 flex items-center gap-2 rounded-full border border-border/70 bg-card/80 py-1.5 pr-1.5 pl-3.5 text-[13px] backdrop-blur sm:top-7 sm:left-7">
        <span className="text-muted-foreground">Quit? Progress is saved.</span>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full bg-destructive/10 px-2.5 py-1 font-medium text-destructive transition-colors hover:bg-destructive/20"
        >
          Exit
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-full px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Stay
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="Exit quiz"
      className="fixed top-5 left-5 z-20 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/50 px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground sm:top-7 sm:left-7"
    >
      <X className="size-3.5" />
      Exit
    </button>
  );
}
