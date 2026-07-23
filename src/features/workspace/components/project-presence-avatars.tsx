"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import usePresence from "@convex-dev/presence/react";
import { useQuery } from "convex/react";
import { useMemo } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type ProjectPresenceAvatarsProps = {
  projectId: string;
};

type MemberInfo = Pick<
  Doc<"projectMembers">,
  "userId" | "name" | "imageUrl" | "color"
>;

export function ProjectPresenceAvatars({
  projectId,
}: ProjectPresenceAvatarsProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const members = useQuery(api.sharing.listMembers, {
    projectId: projectId as Id<"projects">,
  });

  const presenceUserId = userId ?? "anonymous";
  const presenceState = usePresence(api.presence, projectId, presenceUserId);

  const memberById = useMemo(() => {
    const map = new Map<string, MemberInfo>();
    for (const member of members ?? []) {
      map.set(member.userId, member);
    }
    return map;
  }, [members]);

  const online = useMemo(() => {
    if (!presenceState) return [];
    return presenceState
      .filter((entry) => entry.online)
      .map((entry) => {
        const member = memberById.get(entry.userId);
        const isSelf = entry.userId === userId;
        return {
          userId: entry.userId,
          name:
            member?.name ??
            (isSelf
              ? user?.fullName ||
                user?.primaryEmailAddress?.emailAddress ||
                "You"
              : entry.userId),
          imageUrl: member?.imageUrl ?? (isSelf ? user?.imageUrl : undefined),
          color: member?.color ?? "#90A4AE",
          isSelf,
        };
      })
      .sort((a, b) => Number(b.isSelf) - Number(a.isSelf));
  }, [memberById, presenceState, user, userId]);

  if (online.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center -space-x-1.5 pr-1">
      {online.slice(0, 6).map((person) => (
        <Tooltip key={person.userId}>
          <TooltipTrigger asChild>
            <span
              className="relative inline-flex rounded-full"
              style={{ boxShadow: `0 0 0 2px ${person.color}` }}
            >
              <Avatar
                size="sm"
                className={cn(
                  "size-6 border border-ws-panel",
                  person.isSelf && "ring-1 ring-ws-accent",
                )}
              >
                {person.imageUrl ? (
                  <AvatarImage src={person.imageUrl} alt="" />
                ) : null}
                <AvatarFallback
                  className="text-[9px] text-white"
                  style={{ backgroundColor: person.color }}
                >
                  {person.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="border border-ws-border-strong bg-ws-hover px-2 py-1 text-ws-text"
          >
            <span className="text-xs">
              {person.name}
              {person.isSelf ? " (you)" : ""}
            </span>
          </TooltipContent>
        </Tooltip>
      ))}
      {online.length > 6 ? (
        <span className="z-10 rounded-full bg-ws-hover px-1.5 py-0.5 text-[10px] text-ws-text-muted">
          +{online.length - 6}
        </span>
      ) : null}
    </div>
  );
}
