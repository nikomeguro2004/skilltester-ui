"use client";

import { ArrowLeft, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  message,
  onRetry,
  actionLabel = "try again",
  isHomeAction = false,
}: {
  message: string;
  onRetry: () => void;
  actionLabel?: string;
  isHomeAction?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border-2 border-destructive/30 bg-destructive/10">
        <TriangleAlert className="size-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Oops, something went wrong</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
      <Button onClick={onRetry} className="mt-6 rounded-2xl font-semibold">
        {isHomeAction ? (
          <ArrowLeft className="mr-1 size-4" />
        ) : (
          <RotateCcw className="mr-1 size-4" />
        )}
        {actionLabel}
      </Button>
    </div>
  );
}
