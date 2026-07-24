import type { editor } from "monaco-editor";

const activeByPath = new Map<string, editor.IStandaloneCodeEditor>();

/** Track the live Monaco instance for a file path (toolbar / command palette). */
export function registerActiveMonacoEditor(
  path: string,
  ed: editor.IStandaloneCodeEditor,
): () => void {
  activeByPath.set(path, ed);
  return () => {
    if (activeByPath.get(path) === ed) {
      activeByPath.delete(path);
    }
  };
}

export function getActiveMonacoEditor(
  path: string,
): editor.IStandaloneCodeEditor | null {
  return activeByPath.get(path) ?? null;
}
