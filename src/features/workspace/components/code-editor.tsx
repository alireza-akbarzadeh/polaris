"use client";

import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";

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

function languageExtension(filePath: string) {
  if (/\.(tsx?|jsx?)$/.test(filePath)) {
    return javascript({
      typescript: /\.tsx?$/.test(filePath),
      jsx: /\.jsx?$/.test(filePath),
    });
  }
  return [];
}

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

  const extensions = useMemo(() => {
    const base = [
      customSetup,
      languageExtension(filePath),
    ];

    if (readOnly) {
      return base;
    }

    return [...base, ...suggestion(fileName)];
  }, [fileName, filePath, readOnly]);

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={[vscodeDark, editorFontTheme]}
      extensions={extensions}
      onChange={onChange}
      readOnly={readOnly}
      basicSetup={false}
      className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:min-h-full [&_.cm-scroller]:overflow-auto"
    />
  );
}
