import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";

export type RemoteCursor = {
  sessionId: string;
  name: string;
  color: string;
  anchor: number;
  head: number;
};

export const setRemoteCursors = StateEffect.define<RemoteCursor[]>();

class CursorLabel extends WidgetType {
  constructor(
    readonly name: string,
    readonly color: string,
  ) {
    super();
  }

  eq(other: CursorLabel) {
    return this.name === other.name && this.color === other.color;
  }

  toDOM() {
    const el = document.createElement("span");
    el.className = "cm-collab-cursor-label";
    el.textContent = this.name;
    el.style.backgroundColor = this.color;
    return el;
  }
}

function buildDecorations(
  cursors: RemoteCursor[],
  docLength: number,
): DecorationSet {
  const ranges = [];
  for (const cursor of cursors) {
    const head = Math.max(0, Math.min(cursor.head, docLength));
    const anchor = Math.max(0, Math.min(cursor.anchor, docLength));
    const from = Math.min(anchor, head);
    const to = Math.max(anchor, head);

    if (from !== to) {
      ranges.push(
        Decoration.mark({
          attributes: {
            style: `background-color: ${cursor.color}33`,
          },
        }).range(from, to),
      );
    }

    ranges.push(
      Decoration.widget({
        widget: new CursorLabel(cursor.name, cursor.color),
        side: 1,
      }).range(head),
    );
  }

  return Decoration.set(ranges, true);
}

export const remoteCursorsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setRemoteCursors)) {
        return buildDecorations(effect.value, transaction.state.doc.length);
      }
    }
    if (transaction.docChanged) {
      return decorations.map(transaction.changes);
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

export const remoteCursorsTheme = EditorView.baseTheme({
  ".cm-collab-cursor-label": {
    position: "absolute",
    transform: "translateY(-100%)",
    fontSize: "10px",
    lineHeight: "1.2",
    padding: "1px 4px",
    borderRadius: "2px 2px 2px 0",
    color: "#fff",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: "10",
  },
});

export function remoteCursorsExtension() {
  return [remoteCursorsField, remoteCursorsTheme];
}
