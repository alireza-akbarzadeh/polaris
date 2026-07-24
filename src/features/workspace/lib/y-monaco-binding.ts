/**
 * Local Monaco ↔ Yjs binding (ported from y-monaco).
 *
 * Upstream imports `monaco-editor/esm/vs/editor/editor.api.js`, which breaks
 * under monaco-editor@0.56+ package exports with Turbopack/webpack.
 */
import { unexpectedCase } from "lib0/error";
import { createMutex } from "lib0/mutex";
import type { Awareness } from "y-protocols/awareness";
import * as monaco from "monaco-editor";
import * as Y from "yjs";

class RelativeSelection {
  constructor(
    readonly start: Y.RelativePosition,
    readonly end: Y.RelativePosition,
    readonly direction: monaco.SelectionDirection,
  ) {}
}

function createRelativeSelection(
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoModel: monaco.editor.ITextModel,
  type: Y.Text,
): RelativeSelection | null {
  const sel = editor.getSelection();
  if (sel === null) return null;
  const startPos = sel.getStartPosition();
  const endPos = sel.getEndPosition();
  return new RelativeSelection(
    Y.createRelativePositionFromTypeIndex(
      type,
      monacoModel.getOffsetAt(startPos),
    ),
    Y.createRelativePositionFromTypeIndex(
      type,
      monacoModel.getOffsetAt(endPos),
    ),
    sel.getDirection(),
  );
}

function createMonacoSelectionFromRelativeSelection(
  editor: monaco.editor.IEditor,
  type: Y.Text,
  relSel: RelativeSelection,
  doc: Y.Doc,
): monaco.Selection | null {
  const start = Y.createAbsolutePositionFromRelativePosition(relSel.start, doc);
  const end = Y.createAbsolutePositionFromRelativePosition(relSel.end, doc);
  if (
    start === null ||
    end === null ||
    start.type !== type ||
    end.type !== type
  ) {
    return null;
  }
  const model = editor.getModel() as monaco.editor.ITextModel;
  const startPos = model.getPositionAt(start.index);
  const endPos = model.getPositionAt(end.index);
  return monaco.Selection.createWithDirection(
    startPos.lineNumber,
    startPos.column,
    endPos.lineNumber,
    endPos.column,
    relSel.direction,
  );
}

export class MonacoBinding {
  readonly doc: Y.Doc;
  readonly ytext: Y.Text;
  readonly monacoModel: monaco.editor.ITextModel;
  readonly editors: Set<monaco.editor.IStandaloneCodeEditor>;
  readonly mux: ReturnType<typeof createMutex>;
  awareness: Awareness | null = null;

  private _savedSelections = new Map<
    monaco.editor.IStandaloneCodeEditor,
    RelativeSelection
  >();
  private _decorations = new Map<
    monaco.editor.IStandaloneCodeEditor,
    string[]
  >();
  private readonly _beforeTransaction: () => void;
  private readonly _rerenderDecorations: () => void;
  private readonly _ytextObserver: (event: Y.YTextEvent) => void;
  private readonly _monacoChangeHandler: monaco.IDisposable;
  private readonly _monacoDisposeHandler: monaco.IDisposable;

  constructor(
    ytext: Y.Text,
    monacoModel: monaco.editor.ITextModel,
    editors: Set<monaco.editor.IStandaloneCodeEditor> = new Set(),
    awareness: Awareness | null = null,
  ) {
    this.doc = ytext.doc as Y.Doc;
    this.ytext = ytext;
    this.monacoModel = monacoModel;
    this.editors = editors;
    this.mux = createMutex();

    this._beforeTransaction = () => {
      this.mux(() => {
        this._savedSelections = new Map();
        editors.forEach((editor) => {
          if (editor.getModel() === monacoModel) {
            const rsel = createRelativeSelection(editor, monacoModel, ytext);
            if (rsel !== null) {
              this._savedSelections.set(editor, rsel);
            }
          }
        });
      });
    };
    this.doc.on("beforeAllTransactions", this._beforeTransaction);

    this._rerenderDecorations = () => {
      editors.forEach((editor) => {
        if (awareness && editor.getModel() === monacoModel) {
          const currentDecorations = this._decorations.get(editor) || [];
          const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
          awareness.getStates().forEach((state, clientID) => {
            if (
              clientID === this.doc.clientID ||
              state.selection == null ||
              state.selection.anchor == null ||
              state.selection.head == null
            ) {
              return;
            }
            const anchorAbs = Y.createAbsolutePositionFromRelativePosition(
              state.selection.anchor,
              this.doc,
            );
            const headAbs = Y.createAbsolutePositionFromRelativePosition(
              state.selection.head,
              this.doc,
            );
            if (
              anchorAbs === null ||
              headAbs === null ||
              anchorAbs.type !== ytext ||
              headAbs.type !== ytext
            ) {
              return;
            }
            let start: monaco.Position;
            let end: monaco.Position;
            let afterContentClassName: string | null;
            let beforeContentClassName: string | null;
            if (anchorAbs.index < headAbs.index) {
              start = monacoModel.getPositionAt(anchorAbs.index);
              end = monacoModel.getPositionAt(headAbs.index);
              afterContentClassName = `yRemoteSelectionHead yRemoteSelectionHead-${clientID}`;
              beforeContentClassName = null;
            } else {
              start = monacoModel.getPositionAt(headAbs.index);
              end = monacoModel.getPositionAt(anchorAbs.index);
              afterContentClassName = null;
              beforeContentClassName = `yRemoteSelectionHead yRemoteSelectionHead-${clientID}`;
            }
            newDecorations.push({
              range: new monaco.Range(
                start.lineNumber,
                start.column,
                end.lineNumber,
                end.column,
              ),
              options: {
                className: `yRemoteSelection yRemoteSelection-${clientID}`,
                afterContentClassName: afterContentClassName ?? undefined,
                beforeContentClassName: beforeContentClassName ?? undefined,
              },
            });
          });
          this._decorations.set(
            editor,
            editor.deltaDecorations(currentDecorations, newDecorations),
          );
        } else {
          this._decorations.delete(editor);
        }
      });
    };

    this._ytextObserver = (event) => {
      this.mux(() => {
        let index = 0;
        event.delta.forEach((op) => {
          if (op.retain !== undefined) {
            index += op.retain;
          } else if (op.insert !== undefined) {
            const pos = monacoModel.getPositionAt(index);
            const range = new monaco.Selection(
              pos.lineNumber,
              pos.column,
              pos.lineNumber,
              pos.column,
            );
            const insert = op.insert as string;
            monacoModel.applyEdits([{ range, text: insert }]);
            index += insert.length;
          } else if (op.delete !== undefined) {
            const pos = monacoModel.getPositionAt(index);
            const endPos = monacoModel.getPositionAt(index + op.delete);
            const range = new monaco.Selection(
              pos.lineNumber,
              pos.column,
              endPos.lineNumber,
              endPos.column,
            );
            monacoModel.applyEdits([{ range, text: "" }]);
          } else {
            unexpectedCase();
          }
        });
        this._savedSelections.forEach((rsel, editor) => {
          const sel = createMonacoSelectionFromRelativeSelection(
            editor,
            ytext,
            rsel,
            this.doc,
          );
          if (sel !== null) {
            editor.setSelection(sel);
          }
        });
      });
      this._rerenderDecorations();
    };
    ytext.observe(this._ytextObserver);

    {
      const ytextValue = ytext.toString();
      if (monacoModel.getValue() !== ytextValue) {
        monacoModel.setValue(ytextValue);
      }
    }

    this._monacoChangeHandler = monacoModel.onDidChangeContent((event) => {
      this.mux(() => {
        this.doc.transact(() => {
          event.changes
            .sort((a, b) => b.rangeOffset - a.rangeOffset)
            .forEach((change) => {
              ytext.delete(change.rangeOffset, change.rangeLength);
              ytext.insert(change.rangeOffset, change.text);
            });
        }, this);
      });
    });

    this._monacoDisposeHandler = monacoModel.onWillDispose(() => {
      this.destroy();
    });

    if (awareness) {
      editors.forEach((editor) => {
        editor.onDidChangeCursorSelection(() => {
          if (editor.getModel() !== monacoModel) return;
          const sel = editor.getSelection();
          if (sel === null) return;
          let anchor = monacoModel.getOffsetAt(sel.getStartPosition());
          let head = monacoModel.getOffsetAt(sel.getEndPosition());
          if (sel.getDirection() === monaco.SelectionDirection.RTL) {
            const tmp = anchor;
            anchor = head;
            head = tmp;
          }
          awareness.setLocalStateField("selection", {
            anchor: Y.createRelativePositionFromTypeIndex(ytext, anchor),
            head: Y.createRelativePositionFromTypeIndex(ytext, head),
          });
        });
        awareness.on("change", this._rerenderDecorations);
      });
      this.awareness = awareness;
    }
  }

  destroy() {
    this._monacoChangeHandler.dispose();
    this._monacoDisposeHandler.dispose();
    this.ytext.unobserve(this._ytextObserver);
    this.doc.off("beforeAllTransactions", this._beforeTransaction);
    if (this.awareness) {
      this.awareness.off("change", this._rerenderDecorations);
    }
  }
}
