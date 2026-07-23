const PREVIEWABLE_RE = /\.(tsx?|jsx?|html?|md)$/i;

const ENTRY_CANDIDATES = [
  "src/main.tsx",
  "src/main.jsx",
  "src/main.ts",
  "src/main.js",
  "src/index.tsx",
  "src/index.jsx",
  "src/index.ts",
  "src/index.js",
  "main.tsx",
  "main.jsx",
  "index.tsx",
  "index.jsx",
] as const;

const NEXT_PAGE_CANDIDATES = [
  "src/app/page.tsx",
  "src/app/page.jsx",
  "app/page.tsx",
  "app/page.jsx",
] as const;

export function isPreviewableFile(filePath: string) {
  return PREVIEWABLE_RE.test(filePath);
}

export function normalizeProjectPath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/^\/+/, "");
}

export function findProjectEntryPath(paths: Iterable<string>): string | null {
  const set = new Set(
    [...paths].map((path) => normalizeProjectPath(path)),
  );

  if (set.has("index.html")) {
    return "index.html";
  }

  for (const candidate of ENTRY_CANDIDATES) {
    if (set.has(candidate)) return candidate;
  }

  for (const candidate of NEXT_PAGE_CANDIDATES) {
    if (set.has(candidate)) return candidate;
  }

  return null;
}

export function isProjectPreviewable(paths: Iterable<string>) {
  return findProjectEntryPath(paths) !== null;
}
