import { toast } from "sonner";

import { useEditorSettingsStore } from "@/features/settings/store/editor-settings-store";
import { getActiveMonacoEditor } from "@/features/workspace/lib/active-monaco-editor";
import { runFormatDocument } from "@/features/workspace/lib/monaco-format";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

/** Format the currently open workspace file (toolbar / settings / commands). */
export async function formatActiveDocument(): Promise<boolean> {
  const path = useWorkspaceStore.getState().currentFilePath;
  if (!path) {
    toast.message("Open a file to format");
    return false;
  }

  const ed = getActiveMonacoEditor(path);
  if (!ed) {
    toast.message("Editor is not ready");
    return false;
  }

  const tabSize = useEditorSettingsStore.getState().tabSize;
  return runFormatDocument(ed, path, tabSize);
}
