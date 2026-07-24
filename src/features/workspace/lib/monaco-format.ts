import type { editor } from "monaco-editor";
import { toast } from "sonner";

import { canFormatPath, formatCode } from "@/features/workspace/lib/format-code";

export const FORMAT_DOCUMENT_ACTION_ID = "polaris.formatDocument";

/** Format the given Monaco editor buffer with Prettier. */
export async function runFormatDocument(
  ed: editor.IStandaloneCodeEditor,
  filePath: string,
  tabSize: number,
): Promise<boolean> {
  if (ed.getRawOptions().readOnly || !canFormatPath(filePath)) {
    toast.message("Formatting is not available for this file");
    return false;
  }

  const model = ed.getModel();
  if (!model) return false;

  const before = model.getValue();
  try {
    const formatted = await formatCode(before, filePath, tabSize);
    if (formatted === before) {
      toast.message("Already formatted");
      return true;
    }

    const fullRange = model.getFullModelRange();
    ed.executeEdits("polaris-format", [{ range: fullRange, text: formatted }]);
    toast.success("Formatted with Prettier");
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not format document";
    toast.error("Format failed", { description: message });
    return false;
  }
}

/** Shift+Alt+F / ⌥⇧F — format the current document with Prettier. */
export function registerFormatAction(
  editorInstance: editor.IStandaloneCodeEditor,
  monaco: typeof import("monaco-editor"),
  filePath: string,
  tabSize: number,
) {
  return editorInstance.addAction({
    id: FORMAT_DOCUMENT_ACTION_ID,
    label: "Format Document",
    keybindings: [
      monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI,
    ],
    run: async (ed) => {
      await runFormatDocument(
        ed as editor.IStandaloneCodeEditor,
        filePath,
        tabSize,
      );
    },
  });
}
