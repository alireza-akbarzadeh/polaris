"use client";

import { getFuzzyMatchIndices } from "@/features/workspace/lib/search";
import { cn } from "@/lib/utils";

type HighlightedTextProps = {
  text: string;
  query: string;
  className?: string;
  markClassName?: string;
};

/** JetBrains-style yellow marks on matched characters. */
export function HighlightedText({
  text,
  query,
  className,
  markClassName,
}: HighlightedTextProps) {
  const indices = query.trim() ? getFuzzyMatchIndices(query, text) : [];

  if (!indices || indices.length === 0) {
    return <span className={cn("truncate", className)}>{text}</span>;
  }

  const matched = new Set(indices);
  return (
    <span className={cn("truncate", className)}>
      {Array.from(text).map((ch, i) =>
        matched.has(i) ? (
          <mark
            key={`${i}-${ch}`}
            className={cn(
              "rounded-[1px] bg-ws-mark p-0 text-ws-text",
              markClassName,
            )}
          >
            {ch}
          </mark>
        ) : (
          <span key={`${i}-${ch}`}>{ch}</span>
        ),
      )}
    </span>
  );
}
