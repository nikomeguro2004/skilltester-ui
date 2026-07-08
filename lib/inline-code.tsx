import { Fragment, type ReactNode } from "react";

/**
 * The model occasionally wraps terms in backticks (markdown inline-code
 * convention) even though nothing renders markdown here — without this,
 * users see literal backtick characters around file/variable names. Splits
 * on backtick-delimited segments and renders them in a monospace pill;
 * plain text passes through untouched.
 */
export function renderInlineCode(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.length > 1 && part.startsWith("`") && part.endsWith("`") ? (
      <code
        key={i}
        className="rounded bg-secondary px-1 py-0.5 font-mono text-[0.9em] text-foreground/90"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
