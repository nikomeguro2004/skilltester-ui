"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { cn } from "@/lib/utils";

export function ProgressHeader({
  topic,
  current,
  total,
}: {
  topic: string;
  current: number;
  total: number;
}) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;
    const animation = animate(el, {
      opacity: [0.4, 1, 0.4],
      duration: 1600,
      loop: true,
      ease: "inOutQuad",
    });
    return () => {
      animation.pause();
    };
  }, [current]);

  return (
    <div className="mb-10 w-full">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          {topic}
        </p>
        <p className="text-sm tabular-nums text-muted-foreground">
          Question {current} of {total}
        </p>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const filled = i < current - 1;
          const active = i === current - 1;
          return (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 overflow-hidden rounded-full transition-all duration-500",
                filled && "bg-primary",
                active && "bg-primary/25",
                !filled && !active && "bg-secondary",
              )}
              style={
                filled
                  ? { boxShadow: "0 0 8px -1px var(--primary)" }
                  : undefined
              }
            >
              {active && <div ref={activeRef} className="h-full w-full rounded-full bg-primary" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
