import type {
  editor,
  IDisposable,
  languages,
  Position,
} from "monaco-editor";

import { supportsAiSuggestion } from "@/features/workspace/lib/editor-languages";
import { fetcher } from "@/lib/suggestion-fetcher";

type SuggestionPayload = {
  fileName: string;
  code: string;
  currentLine: string;
  previousLines: string;
  textBeforeCursor: string;
  textAfterCursor: string;
  nextLines: string;
  lineNumber: number;
};

function buildPayload(
  model: editor.ITextModel,
  position: Position,
  fileName: string,
): SuggestionPayload | null {
  const code = model.getValue();
  if (!code || code.trim().length === 0) return null;

  const lineNumber = position.lineNumber;
  const column = position.column;
  const currentLine = model.getLineContent(lineNumber);
  const totalLines = model.getLineCount();

  const previous: string[] = [];
  const previousCount = Math.min(5, lineNumber - 1);
  for (let i = previousCount; i >= 1; i--) {
    previous.push(model.getLineContent(lineNumber - i));
  }

  const next: string[] = [];
  const nextCount = Math.min(5, totalLines - lineNumber);
  for (let i = 1; i <= nextCount; i++) {
    next.push(model.getLineContent(lineNumber + i));
  }

  return {
    fileName,
    code,
    currentLine,
    previousLines: previous.join("\n"),
    textBeforeCursor: currentLine.slice(0, column - 1),
    textAfterCursor: currentLine.slice(column - 1),
    nextLines: next.join("\n"),
    lineNumber,
  };
}

function languageSelectorForPath(
  filePath: string,
): languages.LanguageSelector {
  if (/\.tsx?$/i.test(filePath)) return ["typescript", "javascript"];
  if (/\.jsx?$/i.test(filePath)) return "javascript";
  if (/\.css$/i.test(filePath)) return "css";
  if (/\.html?$/i.test(filePath)) return "html";
  if (/\.jsonc?$/i.test(filePath)) return "json";
  if (/\.mdx?$/i.test(filePath)) return "markdown";
  return { pattern: "**/*" };
}

/**
 * Copilot-style ghost text via Monaco inline completions.
 * Registers the provider and triggers it on idle typing (like the old CM plugin).
 */
export function registerAiInlineCompletions(
  monaco: typeof import("monaco-editor"),
  editorInstance: editor.IStandaloneCodeEditor,
  filePath: string,
  fileName: string,
): IDisposable | null {
  if (!supportsAiSuggestion(filePath)) return null;

  let abortController: AbortController | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const provider: languages.InlineCompletionsProvider = {
    provideInlineCompletions: async (model, position, _context, token) => {
      abortController?.abort();
      abortController = new AbortController();

      if (token.isCancellationRequested) {
        return { items: [] };
      }

      const payload = buildPayload(model, position, fileName);
      if (!payload) return { items: [] };

      const suggestion = await fetcher(payload, abortController.signal);
      if (!suggestion || token.isCancellationRequested) {
        return { items: [] };
      }

      return {
        items: [
          {
            insertText: suggestion,
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
          },
        ],
      };
    },
    disposeInlineCompletions: () => {},
  };

  const providerDisposable = monaco.languages.registerInlineCompletionsProvider(
    languageSelectorForPath(filePath),
    provider,
  );

  const trigger = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (!editorInstance.getModel()) return;
      void editorInstance.trigger(
        "polaris-ai",
        "editor.action.inlineSuggest.trigger",
        null,
      );
    }, 350);
  };

  const contentSub = editorInstance.onDidChangeModelContent(trigger);
  const cursorSub = editorInstance.onDidChangeCursorPosition(trigger);

  // Kick once after mount so the first pause can show a completion.
  trigger();

  return {
    dispose: () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      abortController?.abort();
      contentSub.dispose();
      cursorSub.dispose();
      providerDisposable.dispose();
    },
  };
}
