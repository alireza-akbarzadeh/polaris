"use client";

import {
  CheckCircle2Icon,
  CircleDashedIcon,
  ListFilterIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  groupAiChatSessions,
  type AiChatSession,
} from "@/features/workspace/lib/ai-chat-sessions";

type WorkspaceAiHistoryPanelProps = {
  sessions: AiChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewAgent: () => void;
};

export function WorkspaceAiHistoryPanel({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewAgent,
}: WorkspaceAiHistoryPanelProps) {
  const [query, setQuery] = useState("");

  const filteredSessions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sessions;

    return sessions.filter((session) => {
      const haystack = `${session.title} ${session.subtitle ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, sessions]);

  const groups = useMemo(
    () => groupAiChatSessions(filteredSessions),
    [filteredSessions],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-ws-border-subtle p-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ws-text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search agents…"
            className="h-8 border-ws-border bg-ws-bg pl-8 text-[12px] text-ws-text placeholder:text-ws-text-muted"
          />
        </div>

        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 flex-1 justify-start gap-1.5 border-ws-border bg-ws-bg text-[11px] text-ws-text hover:bg-ws-hover"
            onClick={onNewAgent}
          >
            <ListFilterIcon className="size-3.5" />
            New Agent
            <span className="ml-auto text-[10px] text-ws-text-muted">Ctrl+N</span>
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-2">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <SparklesIcon className="size-5 text-ws-accent-soft" />
              <p className="text-[12px] font-medium text-ws-text-secondary">
                No agents yet
              </p>
              <p className="text-[11px] text-ws-text-muted">
                Start a new agent to plan changes, debug, or draft code.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-1 h-7 bg-ws-accent text-[11px] hover:bg-ws-accent-hover"
                onClick={onNewAgent}
              >
                New Agent
              </Button>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.label}>
                <h3 className="px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-ws-text-muted uppercase">
                  {group.label}
                </h3>
                <ul className="space-y-0.5">
                  {group.sessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    const hasMessages = session.messages.length > 0;
                    const Icon = hasMessages ? CheckCircle2Icon : CircleDashedIcon;

                    return (
                      <li key={session.id}>
                        <button
                          type="button"
                          onClick={() => onSelectSession(session.id)}
                          className={cn(
                            "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors",
                            isActive
                              ? "bg-ws-accent/15 text-ws-text"
                              : "text-ws-text-secondary hover:bg-ws-hover",
                          )}
                        >
                          <Icon
                            className={cn(
                              "mt-0.5 size-3.5 shrink-0",
                              hasMessages ? "text-ws-accent-soft" : "text-ws-text-muted",
                            )}
                            strokeWidth={1.75}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-medium">
                              {session.title}
                            </span>
                            {session.subtitle ? (
                              <span className="mt-0.5 block truncate text-[10px] text-ws-text-muted">
                                {session.subtitle}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
