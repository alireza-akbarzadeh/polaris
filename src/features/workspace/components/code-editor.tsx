"use client";

import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { useMemo, useSyncExternalStore } from "react";

import { useEditorSettingsStore } from "@/features/settings/store/editor-settings-store";
import {
  languageExtensionForPath,
  supportsAiSuggestion,
} from "@/features/workspace/lib/editor-languages";
import { formatDocumentExtension } from "@/features/workspace/lib/format-extension";
import { createEditorSetup } from "@/lib/custom-setup";
import { suggestion } from "@/lib/suggestion-extension";

const EDITOR_FONT =
  "var(--font-editor-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

function fileNameFromPath(filePath: string) {
  const parts = filePath.split("/");
  return parts.at(-1) ?? filePath;
}

type CodeEditorProps = {
  value: string;
  filePath: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  collabExtensions?: Extension[];
  onCreateEditor?: (view: EditorView) => void;
};

export function CodeEditor({
  value,
  filePath,
  onChange,
  readOnly = false,
  collabExtensions,
  onCreateEditor,
}: CodeEditorProps) {
  const fileName = fileNameFromPath(filePath);
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = !mounted || (resolvedTheme ?? "dark") === "dark";

  const fontSize = useEditorSettingsStore((s) => s.fontSize);
  const tabSize = useEditorSettingsStore((s) => s.tabSize);
  const wordWrap = useEditorSettingsStore((s) => s.wordWrap);
  const lineNumbers = useEditorSettingsStore((s) => s.lineNumbers);
  const highlightActiveLine = useEditorSettingsStore((s) => s.highlightActiveLine);
  const bracketMatching = useEditorSettingsStore((s) => s.bracketMatching);
  const lineHeight = useEditorSettingsStore((s) => s.lineHeight);

  const editorFontTheme = useMemo(
    () =>
      EditorView.theme({
        ".cm-content": {
          fontFamily: EDITOR_FONT,
          fontSize: `${fontSize}px`,
          lineHeight: String(lineHeight),
        },
        ".cm-gutters": {
          fontFamily: EDITOR_FONT,
          fontSize: `${fontSize}px`,
        },
      }),
    [fontSize, lineHeight],
  );

  const extensions = useMemo(() => {
    const setup = createEditorSetup({
      tabSize,
      wordWrap,
      lineNumbers,
      highlightActiveLine,
      bracketMatching,
    });
    const base = [
      ...setup,
      ...languageExtensionForPath(filePath),
      ...(readOnly ? [] : [formatDocumentExtension(filePath, tabSize)]),
    ];
    const withCollab = collabExtensions?.length
      ? [...base, ...collabExtensions]
      : base;

    if (readOnly || !supportsAiSuggestion(filePath)) {
      return withCollab;
    }

    return [...withCollab, ...suggestion(fileName)];
  }, [
    bracketMatching,
    collabExtensions,
    fileName,
    filePath,
    highlightActiveLine,
    lineNumbers,
    readOnly,
    tabSize,
    wordWrap,
  ]);

  const theme = useMemo(
    () => [isDark ? vscodeDark : vscodeLight, editorFontTheme],
    [editorFontTheme, isDark],
  );

  const isCollab = Boolean(collabExtensions?.length);

  return (
    <CodeMirror
      value={isCollab ? undefined : value}
      height="100%"
      theme={theme}
      extensions={extensions}
      onChange={isCollab ? undefined : onChange}
      readOnly={readOnly}
      basicSetup={false}
      onCreateEditor={onCreateEditor}
      className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:min-h-full [&_.cm-scroller]:overflow-auto"
    />
  );
}
