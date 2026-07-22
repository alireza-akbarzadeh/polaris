"use client";

import { EditorView } from "@codemirror/view";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { useMemo, useSyncExternalStore } from "react";

import {
  languageExtensionForPath,
  supportsAiSuggestion,
} from "@/features/workspace/lib/editor-languages";
import { customSetup } from "@/lib/custom-setup";
import { suggestion } from "@/lib/suggestion-extension";

const EDITOR_FONT =
  "var(--font-editor-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

const editorFontTheme = EditorView.theme({
  ".cm-content": {
    fontFamily: EDITOR_FONT,
    fontSize: "14px",
    lineHeight: "1.6",
  },
  ".cm-gutters": {
    fontFamily: EDITOR_FONT,
    fontSize: "14px",
  },
});

function fileNameFromPath(filePath: string) {
  const parts = filePath.split("/");
  return parts.at(-1) ?? filePath;
}

type CodeEditorProps = {
  value: string;
  filePath: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
};

export function CodeEditor({
  value,
  filePath,
  onChange,
  readOnly = false,
}: CodeEditorProps) {
  const fileName = fileNameFromPath(filePath);
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = !mounted || (resolvedTheme ?? "dark") === "dark";

  const extensions = useMemo(() => {
    const base = [customSetup, ...languageExtensionForPath(filePath)];

    if (readOnly || !supportsAiSuggestion(filePath)) {
      return base;
    }

    return [...base, ...suggestion(fileName)];
  }, [fileName, filePath, readOnly]);

  const theme = useMemo(
    () => [isDark ? vscodeDark : vscodeLight, editorFontTheme],
    [isDark],
  );

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={theme}
      extensions={extensions}
      onChange={onChange}
      readOnly={readOnly}
      basicSetup={false}
      className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:min-h-full [&_.cm-scroller]:overflow-auto"
    />
  );
}
