"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { Loader2 } from "lucide-react";

export function InlineSpinner({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const animation = animate(ref.current, { rotate: 360, duration: 900, loop: true, ease: "linear" });
    return () => {
      animation.pause();
    };
  }, []);

  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-border bg-card/60 py-24 text-sm text-muted-foreground">
      <div ref={ref}>
        <Loader2 className="size-5 text-primary" />
      </div>
      {label}
    </div>
  );
}
