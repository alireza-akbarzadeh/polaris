/** Monaco language id keyed by file path. */
export function monacoLanguageForPath(filePath: string): string {
  const lower = filePath.toLowerCase();

  if (/\.tsx$/.test(lower)) return "typescript";
  if (/\.ts$/.test(lower)) return "typescript";
  if (/\.jsx$/.test(lower)) return "javascript";
  if (/\.(mjs|cjs|js)$/.test(lower)) return "javascript";
  if (/\.module\.css$/.test(lower)) return "css";
  if (/\.css$/.test(lower)) return "css";
  if (/\.scss$/.test(lower)) return "scss";
  if (/\.less$/.test(lower)) return "less";
  if (/\.(html?|htm)$/.test(lower)) return "html";
  if (/\.(json|jsonc)$/.test(lower)) return "json";
  if (/\.(md|mdx|markdown)$/.test(lower)) return "markdown";
  if (/\.ya?ml$/.test(lower)) return "yaml";
  if (/\.svg$/.test(lower)) return "xml";
  if (/\.sql$/.test(lower)) return "sql";
  if (/\.py$/.test(lower)) return "python";
  if (/\.rs$/.test(lower)) return "rust";
  if (/\.go$/.test(lower)) return "go";
  if (/\.sh$/.test(lower)) return "shell";
  if (/\.toml$/.test(lower)) return "ini";

  return "plaintext";
}

export function supportsAiSuggestion(filePath: string): boolean {
  return /\.(tsx?|jsx?|mjs|cjs|css|scss|less|html?|jsonc?|mdx?)$/i.test(
    filePath,
  );
}

const LANGUAGE_LABELS: Array<{ test: RegExp; label: string }> = [
  { test: /\.tsx$/i, label: "TypeScript React" },
  { test: /\.ts$/i, label: "TypeScript" },
  { test: /\.jsx$/i, label: "JavaScript React" },
  { test: /\.(mjs|cjs|js)$/i, label: "JavaScript" },
  { test: /\.module\.css$/i, label: "CSS Module" },
  { test: /\.scss$/i, label: "SCSS" },
  { test: /\.less$/i, label: "Less" },
  { test: /\.css$/i, label: "CSS" },
  { test: /\.html?$/i, label: "HTML" },
  { test: /\.jsonc?$/i, label: "JSON" },
  { test: /\.mdx?$/i, label: "Markdown" },
];

export function getLanguageLabel(filePath: string | null | undefined): string {
  if (!filePath) {
    return "Plain Text";
  }
  const lower = filePath.toLowerCase();
  return (
    LANGUAGE_LABELS.find((entry) => entry.test.test(lower))?.label ??
    "Plain Text"
  );
}
