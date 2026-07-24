"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor, IDisposable } from "monaco-editor";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { useEditorSettingsStore } from "@/features/settings/store/editor-settings-store";
import {
  monacoLanguageForPath,
  supportsAiSuggestion,
} from "@/features/workspace/lib/editor-languages";
import { registerActiveMonacoEditor } from "@/features/workspace/lib/active-monaco-editor";
import { registerAiInlineCompletions } from "@/features/workspace/lib/monaco-ai-suggestion";
import { registerFormatAction } from "@/features/workspace/lib/monaco-format";
import {
  configureMonacoLanguages,
  monacoModelPath,
} from "@/features/workspace/lib/monaco-languages";
import { buildMonacoOptions } from "@/features/workspace/lib/monaco-options";
import {
  POLARIS_THEME_DARK,
  POLARIS_THEME_LIGHT,
  registerPolarisThemes,
} from "@/features/workspace/lib/monaco-theme";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

function fileNameFromPath(filePath: string) {
  const parts = filePath.split("/");
  return parts.at(-1) ?? filePath;
}

type CodeEditorProps = {
  value: string;
  filePath: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  /** When true, React does not own the document — Yjs / MonacoBinding does. */
  collaborative?: boolean;
  onCreateEditor?: (editor: editor.IStandaloneCodeEditor) => void;
};

export function CodeEditor({
  value,
  filePath,
  onChange,
  readOnly = false,
  collaborative = false,
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
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const disposablesRef = useRef<IDisposable[]>([]);

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

  const language = useMemo(
    () => monacoLanguageForPath(filePath),
    [filePath],
  );

  const theme = isDark ? POLARIS_THEME_DARK : POLARIS_THEME_LIGHT;

  const options = useMemo(
    () =>
      buildMonacoOptions(
        {
          fontSize,
          tabSize,
          wordWrap,
          lineNumbers,
          highlightActiveLine,
          bracketMatching,
          lineHeight,
        },
        readOnly,
      ),
    [
      bracketMatching,
      fontSize,
      highlightActiveLine,
      lineHeight,
      lineNumbers,
      readOnly,
      tabSize,
      wordWrap,
    ],
  );

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !pendingReveal || pendingReveal.path !== filePath) {
      return;
    }

    const model = ed.getModel();
    if (!model) return;
    if (model.getValueLength() === 0 && !value) return;

    const lineNumber = Math.min(
      Math.max(1, pendingReveal.line),
      model.getLineCount(),
    );
    const maxCol = model.getLineMaxColumn(lineNumber);
    const startCol = Math.min(Math.max(1, pendingReveal.column), maxCol);
    const endCol =
      pendingReveal.matchLength != null
        ? Math.min(startCol + pendingReveal.matchLength, maxCol)
        : startCol;

    ed.setSelection({
      startLineNumber: lineNumber,
      startColumn: startCol,
      endLineNumber: lineNumber,
      endColumn: endCol,
    });
    ed.revealPositionInCenter({ lineNumber, column: startCol });
    ed.focus();
    clearPendingEditorReveal();
  }, [clearPendingEditorReveal, filePath, pendingReveal, value]);

  useEffect(() => {
    return () => {
      for (const d of disposablesRef.current) d.dispose();
      disposablesRef.current = [];
    };
  }, []);

  const handleMount: OnMount = (ed, monaco) => {
    for (const d of disposablesRef.current) d.dispose();
    disposablesRef.current = [];

    registerPolarisThemes(monaco);
    monaco.editor.setTheme(theme);
    configureMonacoLanguages(monaco);

    // Ensure model language + URI extension stay aligned for JSX/TSX/CSS.
    const model = ed.getModel();
    if (model && language) {
      monaco.editor.setModelLanguage(model, language);
    }

    if (!readOnly) {
      disposablesRef.current.push(
        registerFormatAction(ed, monaco, filePath, tabSize),
      );
    }

    disposablesRef.current.push({
      dispose: registerActiveMonacoEditor(filePath, ed),
    });

    if (!readOnly && supportsAiSuggestion(filePath)) {
      const ai = registerAiInlineCompletions(monaco, ed, filePath, fileName);
      if (ai) disposablesRef.current.push(ai);
    }

    editorRef.current = ed;
    onCreateEditor?.(ed);
  };

  const modelPath = useMemo(() => monacoModelPath(filePath), [filePath]);

  return (
    <div className="polaris-monaco h-full min-h-0">
      <Editor
        height="100%"
        // file:///… keeps .tsx/.jsx/.css so Monaco enables JSX + CSS services.
        path={modelPath}
        language={language}
        theme={theme}
        value={collaborative ? undefined : value}
        onChange={
          collaborative
            ? undefined
            : (next) => {
                if (next == null) return;
                onChange?.(next);
              }
        }
        options={options}
        beforeMount={(monaco) => {
          registerPolarisThemes(monaco);
          configureMonacoLanguages(monaco);
        }}
        onMount={handleMount}
        loading={
          <div className="flex h-full items-center justify-center bg-ws-bg text-[12px] text-ws-text-muted">
            Loading editor…
          </div>
        }
      />
    </div>
  );
}
