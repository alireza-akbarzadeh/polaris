/** Shared workspace context sent with every Polaris chat request. */

import {
  DEFAULT_AI_CHAT_MODE,
  type AiChatMode,
} from "@/lib/ai/chat-mode";

export const WORKSPACE_CONTEXT_LIMITS = {
  maxFilePaths: 200,
  maxOpenTabs: 12,
  maxActiveContentChars: 12_000,
} as const;

export type WorkspaceChatContext = {
  projectName?: string;
  activeFilePath?: string;
  activeFileContent?: string;
  openFiles?: string[];
  fileTree?: string[];
  changedFiles?: string[];
};

export function truncateForContext(
  value: string | undefined,
  maxChars: number,
): string | undefined {
  if (!value) return undefined;
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n…[truncated ${value.length - maxChars} chars]`;
}

function buildModeInstructions(mode: AiChatMode) {
  if (mode === "plan") {
    return [
      "You are currently in PLAN MODE.",
      "Do not modify the project. You do not have writeFile.",
      "You may use readFile and listFiles to inspect the codebase.",
      "Produce a clear, actionable implementation plan with:",
      "1. Goal — one sentence",
      "2. Assumptions / risks",
      "3. Numbered steps (ordered, concrete file paths when relevant)",
      "4. Out of scope",
      "Keep the plan concise. Prefer markdown headings and numbered lists.",
      "Do not claim you edited files. End by inviting the user to switch to Task mode to execute.",
    ].join("\n");
  }

  return [
    "You are currently in TASK MODE.",
    "You can create and update files with writeFile, read files with readFile, and explore with listFiles.",
    "When the user asks you to create or change code in the project, use writeFile with an explicit path — do not only paste code in chat.",
    "Always choose a concrete file path before writing (e.g. src/components/Card.tsx). If the target path is unclear, ask the user for the file name/path first.",
    "If you show code in a markdown fence (examples or review), label it with the target path using fence meta: ```tsx title=\"src/components/Card.tsx\"",
    "If you need another file's full contents, call readFile before editing.",
    "Prefer concise conventional paths (e.g. src/components/Card.tsx).",
    "Be concise and practical. Use markdown for explanations; use tools for file changes.",
  ].join("\n");
}

export function buildWorkspaceSystemPrompt(
  context: WorkspaceChatContext,
  mode: AiChatMode = DEFAULT_AI_CHAT_MODE,
) {
  const fileTree = (context.fileTree ?? []).slice(
    0,
    WORKSPACE_CONTEXT_LIMITS.maxFilePaths,
  );
  const openFiles = (context.openFiles ?? []).slice(
    0,
    WORKSPACE_CONTEXT_LIMITS.maxOpenTabs,
  );
  const changedFiles = context.changedFiles ?? [];
  const activeContent = truncateForContext(
    context.activeFileContent,
    WORKSPACE_CONTEXT_LIMITS.maxActiveContentChars,
  );

  const sections = [
    context.projectName ? `Project: ${context.projectName}` : null,
    context.activeFilePath
      ? `Active file: ${context.activeFilePath}`
      : null,
    openFiles.length > 0
      ? `Open tabs:\n${openFiles.map((path) => `- ${path}`).join("\n")}`
      : null,
    changedFiles.length > 0
      ? `Changed files:\n${changedFiles.map((path) => `- ${path}`).join("\n")}`
      : null,
    fileTree.length > 0
      ? `Project file tree (${fileTree.length}${
          (context.fileTree?.length ?? 0) > fileTree.length ? "+" : ""
        } files):\n${fileTree.map((path) => `- ${path}`).join("\n")}`
      : null,
    context.activeFilePath && activeContent != null
      ? `Active file contents (${context.activeFilePath}):\n\`\`\`\n${activeContent}\n\`\`\``
      : null,
  ].filter(Boolean);

  return [
    "You are Polaris, an expert AI pair programmer embedded in a web IDE.",
    "Help users understand code, plan changes, debug issues, and edit the project.",
    buildModeInstructions(mode),
    "Use the workspace context below as ground truth. Prefer paths that already exist in the file tree.",
    sections.length > 0
      ? `\nWorkspace context:\n${sections.join("\n\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
