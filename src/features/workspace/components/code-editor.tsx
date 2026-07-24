"use client";

import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { useEditorSettingsStore } from "@/features/settings/store/editor-settings-store";
import {
  languageExtensionForPath,
  supportsAiSuggestion,
} from "@/features/workspace/lib/editor-languages";
import { formatDocumentExtension } from "@/features/workspace/lib/format-extension";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";
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
  const viewRef = useRef<EditorView | null>(null);

  const pendingReveal = useWorkspaceStore((s) => s.pendingEditorReveal);
  const clearPendingEditorReveal = useWorkspaceStore(
    (s) => s.clearPendingEditorReveal,
  );

  const fontSize = useEditorSettingsStore((s) => s.fontSize);
  const tabSize = useEditorSettingsStore((s) => s.tabSize);
  const wordWrap = useEditorSettingsStore((s) => s.wordWrap);
  const lineNumbers = useEditorSettingsStore((s) => s.lineNumbers);
  const highlightActiveLine = useEditorSettingsStore(
    (s) => s.highlightActiveLine,
  );
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

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !pendingReveal || pendingReveal.path !== filePath) {
      return;
    }
    if (view.state.doc.length === 0 && !value) {
      return;
    }

    const lineNumber = Math.min(
      Math.max(1, pendingReveal.line),
      view.state.doc.lines,
    );
    const line = view.state.doc.line(lineNumber);
    const col = Math.max(0, pendingReveal.column - 1);
    const from = Math.min(line.from + col, line.to);
    const to =
      pendingReveal.matchLength != null
        ? Math.min(from + pendingReveal.matchLength, line.to)
        : from;

    view.dispatch({
      selection: { anchor: from, head: to },
      effects: EditorView.scrollIntoView(from, { y: "center" }),
    });
    view.focus();
    clearPendingEditorReveal();
  }, [clearPendingEditorReveal, filePath, pendingReveal, value]);

  return (
    <CodeMirror
      value={isCollab ? undefined : value}
      height="100%"
      theme={theme}
      extensions={extensions}
      onChange={isCollab ? undefined : onChange}
      readOnly={readOnly}
      basicSetup={false}
      onCreateEditor={(view) => {
        viewRef.current = view;
        onCreateEditor?.(view);
      }}
      className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:min-h-full [&_.cm-scroller]:overflow-auto"
    />
  );
}
