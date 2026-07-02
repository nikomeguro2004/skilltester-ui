"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { Compass } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AreaState } from "@/lib/adaptive-engine";

const LEVEL_LABELS = ["beginner", "intermediate", "advanced", "expert"];

function statusColor(state: AreaState) {
  if (state.ceilingLevelIndex !== null) return "bg-chart-3";
  if (state.attempts > 0) return "bg-primary";
  return "bg-muted-foreground/30";
}

function statusRing(state: AreaState) {
  if (state.ceilingLevelIndex !== null) return "ring-chart-3/30";
  if (state.attempts > 0) return "ring-primary/30";
  return "ring-transparent";
}

function RadarPingDot({ state }: { state: AreaState }) {
  const ref = useRef<HTMLSpanElement>(null);
  const probing = state.attempts > 0 && state.ceilingLevelIndex === null;

  useEffect(() => {
    if (!probing || !ref.current) return;
    const animation = animate(ref.current, {
      scale: [1, 1.8],
      opacity: [0.6, 0],
      duration: 1600,
      loop: true,
      ease: "outSine",
    });
    return () => {
      animation.pause();
    };
  }, [probing]);

  return (
    <span className="relative flex size-1.5 shrink-0">
      {probing && (
        <span
          ref={ref}
          className={cn("absolute inline-flex h-full w-full rounded-full", statusColor(state))}
        />
      )}
      <span className={cn("relative inline-flex size-1.5 rounded-full", statusColor(state))} />
    </span>
  );
}

function RadarPill({ state }: { state: AreaState }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const prevCeilingRef = useRef(state.ceilingLevelIndex);

  // Fires a one-shot "impact" bounce the instant this area's limit is found.
  useEffect(() => {
    const justFoundCeiling = prevCeilingRef.current === null && state.ceilingLevelIndex !== null;
    prevCeilingRef.current = state.ceilingLevelIndex;
    if (justFoundCeiling && rowRef.current) {
      animate(rowRef.current, {
        scale: [1, 1.14, 1],
        duration: 520,
        ease: "outElastic(1, .5)",
      });
    }
  }, [state.ceilingLevelIndex]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={rowRef}
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 ring-2 transition-colors",
            statusRing(state),
          )}
        >
          <RadarPingDot state={state} />
          <span className="max-w-[9rem] truncate text-xs text-muted-foreground">
            {state.area}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="text-xs">
        {state.attempts === 0 ? (
          <p>Not explored yet</p>
        ) : (
          <div className="space-y-0.5">
            <p>{state.attempts} question{state.attempts > 1 ? "s" : ""} asked</p>
            <p>
              Mastered up to:{" "}
              {state.confirmedLevelIndex >= 0 ? LEVEL_LABELS[state.confirmedLevelIndex] : "none yet"}
            </p>
            {state.ceilingLevelIndex !== null && (
              <p className="text-chart-3">Found your limit at: {LEVEL_LABELS[state.ceilingLevelIndex]}</p>
            )}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function KnowledgeRadar({ areaStates }: { areaStates: AreaState[] }) {
  const probed = areaStates.filter((s) => s.attempts > 0).length;
  const ceilingsFound = areaStates.filter((s) => s.ceilingLevelIndex !== null).length;

  return (
    <div className="mb-8 rounded-2xl border-2 border-border bg-card/60 px-4 py-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Compass className="size-3.5" />
          Topics
        </p>
        <p className="text-xs text-muted-foreground">
          {probed} of {areaStates.length} explored
          {ceilingsFound > 0 && (
            <span className="text-chart-3"> · {ceilingsFound} limit{ceilingsFound > 1 ? "s" : ""} found</span>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {areaStates.map((state) => (
          <RadarPill key={state.area} state={state} />
        ))}
      </div>
    </div>
  );
}
