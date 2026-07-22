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
  return /\.(tsx?|jsx?|mjs|cjs)$/.test(filePath.toLowerCase());
}
