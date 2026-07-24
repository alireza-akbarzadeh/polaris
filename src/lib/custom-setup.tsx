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
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
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
    keymap.of([
      indentWithTab,
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
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
