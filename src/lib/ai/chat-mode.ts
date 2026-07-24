/** Plan vs Task agent modes for the workspace AI panel. */

export const AI_CHAT_MODES = ["plan", "task"] as const;

export type AiChatMode = (typeof AI_CHAT_MODES)[number];

export const DEFAULT_AI_CHAT_MODE: AiChatMode = "task";

export function isAiChatMode(value: unknown): value is AiChatMode {
  return value === "plan" || value === "task";
}

export const AI_CHAT_MODE_META: Record<
  AiChatMode,
  { label: string; shortLabel: string; description: string }
> = {
  plan: {
    label: "Plan",
    shortLabel: "Plan",
    description: "Outline steps without editing files",
  },
  task: {
    label: "Task",
    shortLabel: "Task",
    description: "Execute changes with tools",
  },
};
