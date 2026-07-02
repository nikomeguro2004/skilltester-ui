"use client";

import { useEffect, useRef } from "react";
import { scrambleTo } from "@/lib/scramble-text";

export function ScrambleHeading({ lines }: { lines: string[] }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const timeouts = lines.map((line, i) =>
      setTimeout(() => {
        const el = refs.current[i];
        if (el) scrambleTo(el, line, 850);
      }, i * 220),
    );
    return () => timeouts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <h1 className="max-w-3xl text-balance text-center text-[2.75rem] leading-[0.95] font-bold tracking-tight text-foreground sm:text-6xl md:text-[4.75rem]">
      {lines.map((line, i) => (
        <span
          key={line}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="block"
        />
      ))}
    </h1>
  );
}
