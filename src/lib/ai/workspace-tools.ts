import { tool } from "ai";
import { z } from "zod";

import type { AiChatMode } from "@/lib/ai/chat-mode";

const writeFileTool = tool({
  description:
    "Create or overwrite a file in the Polaris project workspace. Creates parent folders automatically. Always pass a concrete relative path (ask the user for the file name if unknown). Prefer this over only pasting code in chat when the user wants project changes.",
  inputSchema: z.object({
    path: z
      .string()
      .describe(
        "Required path relative to project root, e.g. src/components/Card.tsx",
      ),
    content: z.string().describe("Full file contents to write"),
  }),
});

const readFileTool = tool({
  description: "Read the current contents of a file in the project workspace.",
  inputSchema: z.object({
    path: z.string().describe("Path relative to project root"),
  }),
});

const listFilesTool = tool({
  description:
    "List file paths in the project (files only). Optionally filter by path prefix.",
  inputSchema: z.object({
    prefix: z
      .string()
      .optional()
      .describe("Optional path prefix, e.g. src/components"),
  }),
});

/** Client-executed workspace tools (no server `execute`). */
export const workspaceChatTools = {
  writeFile: writeFileTool,
  readFile: readFileTool,
  listFiles: listFilesTool,
};

/** Read-only tools for plan mode (no file writes). */
export const workspacePlanTools = {
  readFile: readFileTool,
  listFiles: listFilesTool,
};

export function toolsForChatMode(mode: AiChatMode) {
  return mode === "plan" ? workspacePlanTools : workspaceChatTools;
}

export type WorkspaceChatTools = typeof workspaceChatTools;
