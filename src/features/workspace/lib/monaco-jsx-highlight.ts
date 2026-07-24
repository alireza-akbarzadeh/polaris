import type { Monaco } from "@monaco-editor/react";
import type { editor, IDisposable } from "monaco-editor";
import {
  getWorker,
  MonacoJsxSyntaxHighlight,
} from "monaco-jsx-syntax-highlight";

/** True when Monaco needs the extra JSX decoration highlighter. */
export function isJsxFilePath(filePath: string): boolean {
  return /\.(tsx|jsx)$/i.test(filePath);
}

/**
 * Monaco does not color JSX tags natively — only validates them.
 * This wires monaco-jsx-syntax-highlight decorations for .tsx / .jsx.
 */
export function registerJsxSyntaxHighlight(
  monaco: Monaco,
  editorInstance: editor.IStandaloneCodeEditor,
  filePath: string,
): IDisposable | null {
  if (!isJsxFilePath(filePath)) return null;

  const controller = new MonacoJsxSyntaxHighlight(getWorker(), monaco);
  const modelUri = editorInstance.getModel()?.uri.toString();
  const { highlighter, dispose } = controller.highlighterBuilder({
    editor: editorInstance,
    filePath: modelUri ?? monacoModelUriHint(filePath),
  });

  highlighter();
  const contentSub = editorInstance.onDidChangeModelContent(() => {
    highlighter();
  });

  return {
    dispose: () => {
      contentSub.dispose();
      dispose();
      controller.dispose();
    },
  };
}

function monacoModelUriHint(filePath: string): string {
  const cleaned = filePath.replace(/^\/+/, "").replace(/\\/g, "/");
  return `file:///${cleaned}`;
}
