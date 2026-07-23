"use client";

import { useAuth } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import { CopyIcon, Loader2Icon, UserPlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { parseConvexErrorMessage } from "@/features/github/lib/github-errors";
import { copyInviteLink } from "@/features/sharing/lib/invite-link";

type ProjectSharingPanelProps = {
  projectId: string;
  canManage: boolean;
};

type InviteRole = "editor" | "viewer";

export function ProjectSharingPanel({
  projectId,
  canManage,
}: ProjectSharingPanelProps) {
  const { userId } = useAuth();
  const members = useQuery(api.sharing.listMembers, {
    projectId: projectId as Id<"projects">,
  });
  const invites = useQuery(
    api.sharing.listInvites,
    canManage ? { projectId: projectId as Id<"projects"> } : "skip",
  );
  const inviteByEmail = useAction(api.sharing.inviteByEmail);
  const updateMemberRole = useMutation(api.sharing.updateMemberRole);
  const removeMember = useMutation(api.sharing.removeMember);
  const revokeInvite = useMutation(api.sharing.revokeInvite);
  const ensureInviteToken = useMutation(api.sharing.ensureInviteToken);
  const leaveProject = useMutation(api.sharing.leaveProject);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("editor");
  const [submitting, setSubmitting] = useState(false);

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage || submitting) return;

    setSubmitting(true);
    try {
      const result = await inviteByEmail({
        projectId: projectId as Id<"projects">,
        email: email.trim(),
        role,
      });
      if (result.kind === "added") {
        toast.success("Member added");
      } else {
        try {
          await copyInviteLink(result.token);
          toast.success("Invite link copied — share it with them");
        } catch {
          toast.success("Invite created — copy the link from pending invites");
        }
      }
      setEmail("");
    } catch (error) {
      toast.error(parseConvexErrorMessage(error, "Failed to invite"));
    } finally {
      setSubmitting(false);
    }
  }

  const myMembership = members?.find((member) => member.userId === userId);

  return (
    <div className="space-y-5">
      {canManage ? (
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="share-email" className="text-[12px]">
              Invite by email
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="share-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@example.com"
                className="h-8 flex-1 bg-ws-panel text-[13px]"
                required
              />
              <Select
                value={role}
                onValueChange={(value) => setRole(value as InviteRole)}
              >
                <SelectTrigger size="sm" className="h-8 w-full bg-ws-panel sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Can edit</SelectItem>
                  <SelectItem value="viewer">Can view</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !email.trim()}
                className="h-8 gap-1.5"
              >
                {submitting ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <UserPlusIcon className="size-3.5" />
                )}
                Invite
              </Button>
            </div>
          </div>
          <p className="text-[12px] text-ws-text-muted">
            We don&apos;t send emails yet. If they already have an account,
            they&apos;re added right away. Otherwise copy the invite link from
            Pending invites and send it to them.
          </p>
        </form>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-[12px] font-medium text-ws-text-muted">Members</h3>
        <ul className="divide-y divide-ws-border-subtle rounded-md border border-ws-border">
          {(members ?? []).map((member) => (
            <li
              key={member._id}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <Avatar size="sm" style={{ boxShadow: `0 0 0 2px ${member.color}` }}>
                {member.imageUrl ? (
                  <AvatarImage src={member.imageUrl} alt="" />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {(member.name ?? member.email ?? "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-ws-text">
                  {member.name ?? member.email ?? member.userId}
                  {member.userId === userId ? (
                    <span className="text-ws-text-muted"> (you)</span>
                  ) : null}
                </p>
                {member.email ? (
                  <p className="truncate text-[11px] text-ws-text-muted">
                    {member.email}
                  </p>
                ) : null}
              </div>
              {canManage &&
              member.role !== "owner" &&
              !String(member._id).startsWith("legacy-") ? (
                <Select
                  value={member.role}
                  onValueChange={(value) => {
                    void updateMemberRole({
                      projectId: projectId as Id<"projects">,
                      memberId: member._id,
                      role: value as InviteRole,
                    }).catch((error) =>
                      toast.error(
                        parseConvexErrorMessage(error, "Failed to update role"),
                      ),
                    );
                  }}
                >
                  <SelectTrigger size="sm" className="h-7 w-28 bg-ws-panel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className="capitalize">
                  {member.role}
                </Badge>
              )}
              {canManage &&
              member.role !== "owner" &&
              !String(member._id).startsWith("legacy-") ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove member"
                  onClick={() => {
                    void removeMember({
                      projectId: projectId as Id<"projects">,
                      memberId: member._id,
                    }).catch((error) =>
                      toast.error(
                        parseConvexErrorMessage(error, "Failed to remove member"),
                      ),
                    );
                  }}
                >
                  <XIcon className="size-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
          {members === undefined ? (
            <li className="px-3 py-3 text-[12px] text-ws-text-muted">
              Loading members…
            </li>
          ) : null}
        </ul>
      </div>

      {canManage && invites && invites.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-[12px] font-medium text-ws-text-muted">
            Pending invites
          </h3>
          <ul className="divide-y divide-ws-border-subtle rounded-md border border-ws-border">
            {invites.map((invite) => (
              <li
                key={invite._id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-ws-text">
                    {invite.email}
                  </p>
                  <p className="text-[11px] capitalize text-ws-text-muted">
                    {invite.role} · share the invite link (no email sent)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-[11px]"
                  onClick={() => {
                    void (async () => {
                      try {
                        const token =
                          invite.token ??
                          (await ensureInviteToken({
                            projectId: projectId as Id<"projects">,
                            inviteId: invite._id,
                          }));
                        await copyInviteLink(token);
                        toast.success("Invite link copied — send it to them");
                      } catch (error) {
                        toast.error(
                          parseConvexErrorMessage(
                            error,
                            "Could not copy invite link",
                          ),
                        );
                      }
                    })();
                  }}
                >
                  <CopyIcon className="size-3.5" />
                  Copy link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Revoke invite"
                  onClick={() => {
                    void revokeInvite({
                      projectId: projectId as Id<"projects">,
                      inviteId: invite._id,
                    }).catch((error) =>
                      toast.error(
                        parseConvexErrorMessage(error, "Failed to revoke invite"),
                      ),
                    );
                  }}
                >
                  <XIcon className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {myMembership && myMembership.role !== "owner" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => {
            void leaveProject({ projectId: projectId as Id<"projects"> })
              .then(() => toast.success("Left project"))
              .catch((error) =>
                toast.error(parseConvexErrorMessage(error, "Failed to leave")),
              );
          }}
        >
          Leave project
        </Button>
      ) : null}
    </div>
  );
}
