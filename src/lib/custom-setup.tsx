import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { lintKeymap } from "@codemirror/lint";
import {
  highlightSelectionMatches,
  openSearchPanel,
  search,
  searchKeymap,
} from "@codemirror/search";
import { EditorState, type Extension } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";

import type { EditorSettings } from "@/features/settings/lib/editor-settings";
import { createEditorSearchPanel } from "@/features/workspace/lib/editor-search-panel";

const foldGutterClosedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right-icon lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>`;
const foldGutterOpenSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down-icon lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>`;

export type EditorSetupOptions = Pick<
  EditorSettings,
  | "tabSize"
  | "wordWrap"
  | "lineNumbers"
  | "highlightActiveLine"
  | "bracketMatching"
>;

const editorSearchTheme = EditorView.theme({
  ".cm-panels": {
    backgroundColor: "var(--ws-panel)",
    color: "var(--ws-text)",
    borderBottom: "1px solid var(--ws-border)",
  },
  ".cm-panels.cm-panels-top": {
    borderBottom: "1px solid var(--ws-border)",
  },
  ".cm-panel.cm-jb-search": {
    padding: "6px 8px",
    fontFamily: "var(--font-sans), system-ui, sans-serif",
    fontSize: "12px",
  },
  ".cm-jb-search-row": {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    minHeight: "26px",
  },
  ".cm-jb-search-row + .cm-jb-search-row": {
    marginTop: "4px",
  },
  ".cm-jb-search-label": {
    width: "52px",
    flexShrink: "0",
    color: "var(--ws-text-muted)",
    fontSize: "11px",
  },
  ".cm-jb-search-input": {
    flex: "1 1 auto",
    minWidth: "0",
    height: "24px",
    padding: "0 8px",
    border: "1px solid var(--ws-border)",
    borderRadius: "3px",
    backgroundColor: "var(--ws-bg)",
    color: "var(--ws-text)",
    outline: "none",
    fontSize: "12px",
    fontFamily: "inherit",
  },
  ".cm-jb-search-input:focus": {
    borderColor: "var(--ws-accent)",
  },
  ".cm-jb-search-count": {
    flexShrink: "0",
    minWidth: "4.5em",
    textAlign: "right",
    color: "var(--ws-text-muted)",
    fontSize: "11px",
    padding: "0 4px",
  },
  ".cm-jb-search-icon-btn, .cm-jb-search-toggle, .cm-jb-search-text-btn": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: "24px",
    border: "1px solid transparent",
    borderRadius: "3px",
    background: "transparent",
    color: "var(--ws-text-secondary)",
    cursor: "pointer",
    fontSize: "11px",
    fontFamily: "inherit",
    padding: "0 6px",
  },
  ".cm-jb-search-icon-btn": {
    width: "24px",
    padding: "0",
  },
  ".cm-jb-search-icon-btn:hover, .cm-jb-search-toggle:hover, .cm-jb-search-text-btn:hover":
    {
      backgroundColor: "var(--ws-hover)",
      color: "var(--ws-text)",
    },
  ".cm-jb-search-toggle": {
    minWidth: "24px",
    fontWeight: "600",
    letterSpacing: "0.02em",
  },
  ".cm-jb-search-toggle-on": {
    backgroundColor: "color-mix(in srgb, var(--ws-accent) 22%, transparent)",
    borderColor: "var(--ws-accent)",
    color: "var(--ws-accent)",
  },
  ".cm-jb-search-text-btn": {
    borderColor: "var(--ws-border)",
    backgroundColor: "var(--ws-bg)",
    whiteSpace: "nowrap",
  },
  ".cm-searchMatch": { backgroundColor: "var(--ws-mark)" },
  ".cm-searchMatch-selected": {
    backgroundColor: "color-mix(in srgb, var(--ws-accent) 35%, var(--ws-mark))",
  },
});

export function createEditorSetup(options: EditorSetupOptions): Extension[] {
  const extensions: Extension[] = [
    highlightSpecialChars(),
    history(),
    foldGutter({
      markerDOM(open) {
        const icon = document.createElement("div");
        icon.className =
          "flex items-center justify-center size-4 cursor-pointer pt-0.5";
        icon.innerHTML = open ? foldGutterOpenSvg : foldGutterClosedSvg;
        return icon;
      },
    }),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    EditorState.tabSize.of(options.tabSize),
    indentUnit.of(" ".repeat(options.tabSize)),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightSelectionMatches(),
    search({
      top: true,
      createPanel: createEditorSearchPanel,
    }),
    editorSearchTheme,
    keymap.of([
      indentWithTab,
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      { key: "Mod-h", run: openSearchPanel, scope: "editor search-panel" },
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
    ]),
  ];

  if (options.lineNumbers) {
    extensions.unshift(lineNumbers());
  }

  if (options.highlightActiveLine) {
    extensions.push(highlightActiveLine(), highlightActiveLineGutter());
  }

  if (options.bracketMatching) {
    extensions.push(bracketMatching());
  }

  if (options.wordWrap) {
    extensions.push(EditorView.lineWrapping);
  }

  return extensions;
}

/** Default setup when no user prefs are available. */
export const customSetup: Extension[] = createEditorSetup({
  tabSize: 2,
  wordWrap: false,
  lineNumbers: true,
  highlightActiveLine: true,
  bracketMatching: true,
});
