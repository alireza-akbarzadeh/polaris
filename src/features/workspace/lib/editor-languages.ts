import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import type { Extension } from "@codemirror/state";

/** CodeMirror language support keyed by file extension. */
export function languageExtensionForPath(filePath: string): Extension[] {
  const lower = filePath.toLowerCase();

  if (/\.(tsx?|jsx?|mjs|cjs)$/.test(lower)) {
    return [
      javascript({
        typescript: /\.tsx?$/.test(lower),
        jsx: /\.(tsx?|jsx)$/.test(lower),
      }),
    ];
  }

  if (/\.(css|module\.css)$/.test(lower)) {
    return [css()];
  }

  if (/\.(html?|htm)$/.test(lower)) {
    return [html()];
  }

  if (/\.(json|jsonc)$/.test(lower)) {
    return [json()];
  }

  if (/\.(md|mdx|markdown)$/.test(lower)) {
    return [markdown()];
  }

  return [];
}

export function supportsAiSuggestion(filePath: string): boolean {
  return /\.(tsx?|jsx?|mjs|cjs|css|html?|jsonc?|mdx?)$/i.test(filePath);
}

const LANGUAGE_LABELS: Array<{ test: RegExp; label: string }> = [
  { test: /\.tsx$/i, label: "TypeScript React" },
  { test: /\.ts$/i, label: "TypeScript" },
  { test: /\.jsx$/i, label: "JavaScript React" },
  { test: /\.(mjs|cjs|js)$/i, label: "JavaScript" },
  { test: /\.module\.css$/i, label: "CSS Module" },
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
  return LANGUAGE_LABELS.find((entry) => entry.test.test(lower))?.label ?? "Plain Text";
}
