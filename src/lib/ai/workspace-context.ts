/** Shared workspace context sent with every Polaris chat request. */

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

export function buildWorkspaceSystemPrompt(context: WorkspaceChatContext) {
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
    "You can create and update files with the writeFile tool, read files with readFile, and explore with listFiles.",
    "When the user asks you to create or change code in the project, use writeFile — do not only paste code in chat.",
    "Use the workspace context below as ground truth. Prefer paths that already exist in the file tree.",
    "If you need another file's full contents, call readFile before editing.",
    "Prefer concise conventional paths (e.g. src/components/Card.tsx).",
    "Be concise and practical. Use markdown for explanations; use tools for file changes.",
    sections.length > 0
      ? `\nWorkspace context:\n${sections.join("\n\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
