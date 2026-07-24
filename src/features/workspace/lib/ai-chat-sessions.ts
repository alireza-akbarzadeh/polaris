import type { UIMessage } from "ai";
import { nanoid } from "nanoid";

import {
  DEFAULT_AI_CHAT_MODE,
  isAiChatMode,
  type AiChatMode,
} from "@/lib/ai/chat-mode";

export type AiChatSession = {
  id: string;
  title: string;
  subtitle?: string;
  mode?: AiChatMode;
  messages: UIMessage[];
  createdAt: number;
  updatedAt: number;
};

export type AiChatSessionGroup = {
  label: string;
  sessions: AiChatSession[];
};

const STORAGE_PREFIX = "polaris-ai-sessions:";

function storageKey(projectId: string) {
  return `${STORAGE_PREFIX}${projectId}`;
}

export function loadAiChatSessions(projectId: string): AiChatSession[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiChatSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((session) => ({
      ...session,
      mode: isAiChatMode(session.mode) ? session.mode : DEFAULT_AI_CHAT_MODE,
    }));
  } catch {
    return [];
  }
}

export function saveAiChatSessions(
  projectId: string,
  sessions: AiChatSession[],
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(projectId), JSON.stringify(sessions));
}

export function createAiChatSession(
  title = "New chat",
  mode: AiChatMode = DEFAULT_AI_CHAT_MODE,
): AiChatSession {
  const now = Date.now();
  return {
    id: nanoid(),
    title,
    subtitle: "Start a conversation",
    mode,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function deriveSessionTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "New chat";
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

export function deriveSessionSubtitle(messages: UIMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "Start a conversation";

  const text = lastUser.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();

  if (!text) return "Attachment sent";
  return text.length > 64 ? `${text.slice(0, 64)}…` : text;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

export function groupAiChatSessions(
  sessions: AiChatSession[],
): AiChatSessionGroup[] {
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const todayStart = startOfDay(new Date());
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 6 * 86_400_000;

  const today: AiChatSession[] = [];
  const yesterday: AiChatSession[] = [];
  const thisWeek: AiChatSession[] = [];
  const older: AiChatSession[] = [];

  for (const session of sorted) {
    if (session.updatedAt >= todayStart) {
      today.push(session);
    } else if (session.updatedAt >= yesterdayStart) {
      yesterday.push(session);
    } else if (session.updatedAt >= weekStart) {
      thisWeek.push(session);
    } else {
      older.push(session);
    }
  }

  return [
    { label: "Today", sessions: today },
    { label: "Yesterday", sessions: yesterday },
    { label: "This week", sessions: thisWeek },
    { label: "Older", sessions: older },
  ].filter((group) => group.sessions.length > 0);
}
