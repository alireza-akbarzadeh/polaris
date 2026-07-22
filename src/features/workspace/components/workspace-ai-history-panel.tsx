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
      <div className="space-y-2 border-b border-[#1e1f22] p-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#787878]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search agents…"
            className="h-8 border-[#4e5155] bg-[#1e1f22] pl-8 text-[12px] text-[#dfdfdf] placeholder:text-[#787878]"
          />
        </div>

        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 flex-1 justify-start gap-1.5 border-[#4e5155] bg-[#1e1f22] text-[11px] text-[#dfdfdf] hover:bg-[#3c3f41]"
            onClick={onNewAgent}
          >
            <ListFilterIcon className="size-3.5" />
            New Agent
            <span className="ml-auto text-[10px] text-[#787878]">Ctrl+N</span>
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-2">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <SparklesIcon className="size-5 text-[#6a9bf5]" />
              <p className="text-[12px] font-medium text-[#bcbec4]">
                No agents yet
              </p>
              <p className="text-[11px] text-[#787878]">
                Start a new agent to plan changes, debug, or draft code.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-1 h-7 bg-[#3574f0] text-[11px] hover:bg-[#2d66d8]"
                onClick={onNewAgent}
              >
                New Agent
              </Button>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.label}>
                <h3 className="px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-[#787878] uppercase">
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
                              ? "bg-[#3574f0]/15 text-[#dfdfdf]"
                              : "text-[#bcbec4] hover:bg-[#3c3f41]",
                          )}
                        >
                          <Icon
                            className={cn(
                              "mt-0.5 size-3.5 shrink-0",
                              hasMessages ? "text-[#6a9bf5]" : "text-[#787878]",
                            )}
                            strokeWidth={1.75}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-medium">
                              {session.title}
                            </span>
                            {session.subtitle ? (
                              <span className="mt-0.5 block truncate text-[10px] text-[#787878]">
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
