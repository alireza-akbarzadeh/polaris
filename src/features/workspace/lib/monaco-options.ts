import type { editor } from "monaco-editor";

import type { EditorSettings } from "@/features/settings/lib/editor-settings";

const EDITOR_FONT =
  "var(--font-editor-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

export type MonacoEditorSettings = Pick<
  EditorSettings,
  | "fontSize"
  | "tabSize"
  | "wordWrap"
  | "lineNumbers"
  | "highlightActiveLine"
  | "bracketMatching"
  | "lineHeight"
>;

/** JetBrains-leaning Monaco options — denser chrome, softer chrome, no VS Code defaults. */
export function buildMonacoOptions(
  settings: MonacoEditorSettings,
  readOnly: boolean,
): editor.IStandaloneEditorConstructionOptions {
  return {
    readOnly,
    fontFamily: EDITOR_FONT,
    fontSize: settings.fontSize,
    lineHeight: Math.round(settings.fontSize * settings.lineHeight),
    fontLigatures: true,
    letterSpacing: 0.2,
    tabSize: settings.tabSize,
    insertSpaces: true,
    detectIndentation: false,
    wordWrap: settings.wordWrap ? "on" : "off",
    lineNumbers: settings.lineNumbers ? "on" : "off",
    lineNumbersMinChars: 3,
    glyphMargin: false,
    folding: true,
    foldingHighlight: false,
    showFoldingControls: "mouseover",
    renderLineHighlight: settings.highlightActiveLine ? "line" : "none",
    renderLineHighlightOnlyWhenFocus: true,
    matchBrackets: settings.bracketMatching ? "near" : "never",
    bracketPairColorization: { enabled: settings.bracketMatching },
    guides: {
      indentation: true,
      bracketPairs: false,
      highlightActiveIndentation: true,
    },
    minimap: {
      enabled: true,
      maxColumn: 80,
      renderCharacters: false,
      showSlider: "mouseover",
      size: "proportional",
    },
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      verticalSliderSize: 8,
      horizontalSliderSize: 8,
      useShadows: false,
    },
    overviewRulerLanes: 2,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    padding: { top: 10, bottom: 16 },
    smoothScrolling: true,
    cursorBlinking: "smooth",
    cursorSmoothCaretAnimation: "on",
    cursorStyle: "line",
    cursorWidth: 2,
    roundedSelection: false,
    multiCursorModifier: "alt",
    accessibilitySupport: "auto",
    automaticLayout: true,
    scrollBeyondLastLine: false,
    linkedEditing: true,
    formatOnPaste: false,
    formatOnType: false,
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false,
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: "on",
    tabCompletion: "on",
    wordBasedSuggestions: "currentDocument",
    parameterHints: { enabled: true },
    hover: { enabled: "on", delay: 300 },
    contextmenu: true,
    find: {
      addExtraSpaceOnTop: false,
      autoFindInSelection: "multiline",
      seedSearchStringFromSelection: "selection",
    },
    inlineSuggest: {
      enabled: true,
      showToolbar: "onHover",
    },
    stickyScroll: { enabled: false },
    // Feels less like stock VS Code chrome
    renderWhitespace: "selection",
    rulers: [],
    colorDecorators: true,
    dragAndDrop: true,
    dropIntoEditor: { enabled: true },
    links: true,
    mouseWheelZoom: false,
  };
}
