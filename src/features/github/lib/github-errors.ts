export function parseConvexErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (typeof error === "string" && error.trim()) {
    return cleanConvexMessage(error);
  }

  if (error instanceof Error) {
    return cleanConvexMessage(error.message);
  }

  if (typeof error === "object" && error !== null) {
    const record = error as { message?: unknown; data?: unknown };
    if (typeof record.message === "string" && record.message.trim()) {
      return cleanConvexMessage(record.message);
    }
    if (typeof record.data === "string" && record.data.trim()) {
      return cleanConvexMessage(record.data);
    }
  }

  return fallback;
}

function cleanConvexMessage(message: string): string {
  const uncaughtMatch = message.match(/Uncaught Error:\s*(.+)$/s);
  if (uncaughtMatch?.[1]) {
    return uncaughtMatch[1].trim();
  }

  return message
    .replace(/^\[CONVEX[^\]]+\]\s*/i, "")
    .replace(/^Server Error\s*/i, "")
    .replace(/^\[Request ID:[^\]]+\]\s*/i, "")
    .trim();
}
