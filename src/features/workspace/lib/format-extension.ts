import { keymap } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { toast } from "sonner";

import { canFormatPath, formatCode } from "@/features/workspace/lib/format-code";

async function runFormat(view: EditorView, filePath: string, tabSize: number) {
  if (view.state.readOnly || !canFormatPath(filePath)) {
    toast.message("Formatting is not available for this file");
    return;
  }

  const before = view.state.doc.toString();
  try {
    const formatted = await formatCode(before, filePath, tabSize);
    if (formatted === before) {
      toast.message("Already formatted");
      return;
    }

    view.dispatch({
      changes: { from: 0, to: before.length, insert: formatted },
      userEvent: "format",
    });
    toast.success("Formatted with Prettier");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not format document";
    toast.error("Format failed", { description: message });
  }
}

/** Shift+Alt+F / ⌥⇧F — format the current document with Prettier. */
export function formatDocumentExtension(
  filePath: string,
  tabSize: number,
): Extension {
  return keymap.of([
    {
      key: "Alt-Shift-f",
      run: (view) => {
        void runFormat(view, filePath, tabSize);
        return true;
      },
    },
    {
      key: "Mod-Shift-i",
      run: (view) => {
        void runFormat(view, filePath, tabSize);
        return true;
      },
    },
  ]);
}
