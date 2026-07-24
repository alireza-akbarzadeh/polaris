import { Prec, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  keymap,
} from "@codemirror/view";

import { fetcher } from "./suggestion-fetcher";

const setSuggestionEffect = StateEffect.define<string | null>();
const suggestionState = StateField.define<string | null>({
  create() {
    return null;
  },
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setSuggestionEffect)) {
        return effect.value;
      }
    }
    // Clear ghost text after any document edit so Tab doesn't insert stale text.
    if (transaction.docChanged) {
      return null;
    }
    return value;
  },
});

class SuggestionWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.text;
    span.className = "cm-ai-suggestion";
    span.style.opacity = "0.45";
    span.style.pointerEvents = "none";
    return span;
  }

  eq(other: SuggestionWidget) {
    return other.text === this.text;
  }
}

let debounceTimer: number | null = null;
let isWaitingForSuggestion = false;
let currentAbortController: AbortController | null = null;
const DEBOUNCE_DELAY = 300;

/** CodeMirror forbids view.dispatch while an update is in progress. */
function dispatchWhenIdle(
  view: EditorView,
  spec: Parameters<EditorView["dispatch"]>[0],
) {
  queueMicrotask(() => {
    if (!view.dom.isConnected) return;
    view.dispatch(spec);
  });
}

const generatePayload = (view: EditorView, fileName: string) => {
  const code = view.state.doc.toString();

  if (!code || code.trim().length === 0) {
    return null;
  }

  const cursorPosition = view.state.selection.main.head;
  const currentLine = view.state.doc.lineAt(cursorPosition);
  const cursorInLine = cursorPosition - currentLine.from;

  const previousLines: string[] = [];
  const previousLinesToFetch = Math.min(5, currentLine.number - 1);

  for (let i = previousLinesToFetch; i >= 1; i--) {
    previousLines.push(view.state.doc.line(currentLine.number - i).text);
  }

  const nextLines: string[] = [];
  const totalLines = view.state.doc.lines;
  const linesToFetch = Math.min(5, totalLines - currentLine.number);

  for (let i = 1; i <= linesToFetch; i++) {
    nextLines.push(view.state.doc.line(currentLine.number + i).text);
  }

  return {
    fileName,
    code,
    currentLine: currentLine.text,
    previousLines: previousLines.join("\n"),
    textBeforeCursor: currentLine.text.slice(0, cursorInLine),
    textAfterCursor: currentLine.text.slice(cursorInLine),
    nextLines: nextLines.join("\n"),
    lineNumber: currentLine.number,
  };
};

const createDebouncePlugin = (fileName: string) =>
  ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        // Constructor can run during an editor update (e.g. Liveblocks/AI
        // applying a doc change) — never dispatch synchronously here.
        this.triggerSuggestion(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet) {
          this.triggerSuggestion(update.view);
        }
      }

      triggerSuggestion(view: EditorView) {
        if (debounceTimer !== null) {
          clearTimeout(debounceTimer);
        }

        if (currentAbortController !== null) {
          currentAbortController.abort();
        }

        isWaitingForSuggestion = true;

        // Doc changes already clear suggestionState; for selection moves we
        // still clear — but always outside the current update cycle.
        if (view.state.field(suggestionState) !== null) {
          dispatchWhenIdle(view, {
            effects: setSuggestionEffect.of(null),
          });
        }

        debounceTimer = window.setTimeout(async () => {
          if (!view.dom.isConnected) {
            isWaitingForSuggestion = false;
            return;
          }

          const payload = generatePayload(view, fileName);

          if (!payload) {
            isWaitingForSuggestion = false;
            dispatchWhenIdle(view, {
              effects: setSuggestionEffect.of(null),
            });
            return;
          }

          currentAbortController = new AbortController();
          const suggestion = await fetcher(
            payload,
            currentAbortController.signal,
          );
          isWaitingForSuggestion = false;

          if (!view.dom.isConnected) {
            return;
          }

          dispatchWhenIdle(view, {
            effects: setSuggestionEffect.of(suggestion || null),
          });
        }, DEBOUNCE_DELAY);
      }

      destroy() {
        if (debounceTimer !== null) {
          clearTimeout(debounceTimer);
        }
        if (currentAbortController !== null) {
          currentAbortController.abort();
        }
      }
    },
  );

const renderPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(update: ViewUpdate) {
      const suggestionChanged = update.transactions.some((transaction) =>
        transaction.effects.some((effect) => effect.is(setSuggestionEffect)),
      );
      const shouldRebuild =
        update.docChanged || update.selectionSet || suggestionChanged;

      if (shouldRebuild) {
        this.decorations = this.build(update.view);
      }
    }

    build(view: EditorView) {
      if (isWaitingForSuggestion) {
        return Decoration.none;
      }

      const suggestion = view.state.field(suggestionState);
      if (!suggestion) {
        return Decoration.none;
      }

      const cursor = view.state.selection.main.head;
      return Decoration.set([
        Decoration.widget({
          widget: new SuggestionWidget(suggestion),
          side: 1,
        }).range(cursor),
      ]);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

function acceptSuggestion(view: EditorView): boolean {
  const suggestion = view.state.field(suggestionState);
  if (!suggestion) {
    return false;
  }

  const cursor = view.state.selection.main.head;
  view.dispatch({
    changes: { from: cursor, insert: suggestion },
    selection: { anchor: cursor + suggestion.length },
    effects: setSuggestionEffect.of(null),
  });
  return true;
}

/** Highest precedence so Tab accepts AI ghost text before indent/autocomplete. */
const acceptSuggestionKeymap = Prec.highest(
  keymap.of([
    {
      key: "Tab",
      run: acceptSuggestion,
    },
    {
      // Cursor-like: accept with → when a suggestion is showing
      key: "ArrowRight",
      run: (view) => {
        const suggestion = view.state.field(suggestionState);
        if (!suggestion) return false;
        const sel = view.state.selection.main;
        if (!sel.empty) return false;
        const line = view.state.doc.lineAt(sel.head);
        // Only intercept → at end of line (otherwise move cursor normally)
        if (sel.head !== line.to) return false;
        return acceptSuggestion(view);
      },
    },
    {
      key: "Escape",
      run: (view) => {
        if (!view.state.field(suggestionState)) return false;
        view.dispatch({ effects: setSuggestionEffect.of(null) });
        return true;
      },
    },
  ]),
);

export const suggestion = (fileName: string) => [
  suggestionState,
  createDebouncePlugin(fileName),
  renderPlugin,
  acceptSuggestionKeymap,
];
