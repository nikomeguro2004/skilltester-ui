"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { Compass, Globe } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AreaState } from "@/lib/adaptive-engine";
import type { KnowledgeArea, WebSource } from "@/lib/types";

const LEVEL_LABELS = ["beginner", "intermediate", "advanced", "expert"];

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

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

function RadarPill({ state, description }: { state: AreaState; description?: string }) {
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
            "flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 ring-2 transition-colors",
            statusRing(state),
          )}
        >
          <RadarPingDot state={state} />
          <span className="max-w-[9rem] truncate text-xs text-muted-foreground">
            {state.area}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs">
        <div className="space-y-1">
          {description && <p className="text-foreground/90">{description}</p>}
          {state.attempts === 0 ? (
            <p className="text-muted-foreground">Not explored yet</p>
          ) : (
            <div className="space-y-0.5 text-muted-foreground">
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
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function KnowledgeRadar({
  areaStates,
  areas,
  sources,
}: {
  areaStates: AreaState[];
  areas?: KnowledgeArea[];
  sources?: WebSource[];
}) {
  const descriptionByArea = new Map(areas?.map((a) => [a.name, a.description]));
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
      <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {areaStates.map((state) => (
          <RadarPill key={state.area} state={state} description={descriptionByArea.get(state.area)} />
        ))}
      </div>
      {sources && sources.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-border/70 pt-2.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground/80">
                <Globe className="size-3" />
                Grounded in live search
              </span>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              <p>This quiz is grounded in real, current sources.</p>
            </TooltipContent>
          </Tooltip>
          <div className="scrollbar-none flex min-w-0 gap-1.5 overflow-x-auto">
            {sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                title={source.title}
                className="shrink-0 truncate rounded-full bg-secondary/60 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {hostnameOf(source.url)}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
