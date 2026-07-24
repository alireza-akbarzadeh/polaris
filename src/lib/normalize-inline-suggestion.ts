/**
 * Turn messy LLM completion output into plain text suitable for Monaco
 * inline ghost-text (no fences, no XML wrappers, no commentary).
 */
export function normalizeInlineSuggestion(raw: string): string | null {
  let text = raw.replace(/^\uFEFF/, "").trim();
  if (!text) return null;

  // Prefer explicit <suggestion> body when the model wraps output.
  const tagged = text.match(/<suggestion>\s*([\s\S]*?)\s*<\/suggestion>/i);
  if (tagged?.[1] != null) {
    text = tagged[1].trim();
  }

  // Unwrap a single surrounding markdown fence.
  const fenced = text.match(/^```(?:[\w+-]*)?[ \t]*\r?\n?([\s\S]*?)\r?\n?```$/);
  if (fenced?.[1] != null) {
    text = fenced[1].trim();
  }

  // Models sometimes emit fragmented fences mid-string — strip markers.
  text = text
    .replace(/```[\w+-]*[ \t]*/g, "")
    .replace(/```/g, "")
    .replace(/<\/?suggestion>/gi, "")
    .trim();

  if (!text) return null;

  // Drop obvious chatty preambles.
  if (
    /^(here'?s|sure[,!]?\s|i (?:would )?suggest|the (?:suggested )?code|completion:)/i.test(
      text,
    )
  ) {
    return null;
  }

  // Cap runaway completions (inline suggest should stay short).
  if (text.length > 800) {
    text = text.slice(0, 800);
  }

  return text;
}
