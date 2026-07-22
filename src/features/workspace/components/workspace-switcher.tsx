"use client";

import { formatDistanceToNow } from "date-fns";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  FolderOpenIcon,
  HomeIcon,
  PencilIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { Id } from "@/convex/_generated/dataModel";
import { getProjectsIcons } from "@/features/projects/components/project-row";
import {
  useProjects,
  useUpdateProject,
} from "@/features/projects/hooks/use-projects";

type WorkspaceSwitcherProps = {
  projectId: string;
  projectName?: string;
};

export function WorkspaceSwitcher({
  projectId,
  projectName,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const projects = useProjects();
  const updateProject = useUpdateProject();
  const [open, setOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(projectName ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftName(projectName ?? "");
  }, [projectName]);

  useEffect(() => {
    if (isRenaming) inputRef.current?.focus();
  }, [isRenaming]);

  const saveName = async () => {
    const nextName = draftName.trim();
    if (!nextName || nextName === projectName) {
      setDraftName(projectName ?? "");
      setIsRenaming(false);
      return;
    }

    await updateProject({
      projectId: projectId as Id<"projects">,
      name: nextName,
    });
    setIsRenaming(false);
  };

  const otherProjects =
    projects?.filter((project) => project._id !== projectId) ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-7 max-w-55 gap-2 rounded-sm text-ws-text hover:bg-ws-hover -ml-4 hover:text-white"
        >
          <Image
            src="/logo.svg"
            alt=""
            width={19}
            height={19}
            className="size-5 shrink-0"
          />
          <span className="truncate text-[13px] font-medium">
            {projectName ?? "Project"}
          </span>
          <ChevronsUpDownIcon className="size-3 shrink-0 text-ws-text-muted" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-80 border-ws-border bg-ws-panel p-0 text-ws-text"
        sideOffset={6}
      >
        <div className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt=""
              width={20}
              height={20}
              className="size-5"
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ws-text-muted">
              Workspace
            </p>
          </div>

          {isRenaming ? (
            <div className="flex items-center gap-1.5">
              <Input
                ref={inputRef}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void saveName();
                  if (event.key === "Escape") {
                    setDraftName(projectName ?? "");
                    setIsRenaming(false);
                  }
                }}
                className="h-8 border-ws-border bg-ws-bg text-[13px] text-ws-text"
              />
              <Button
                type="button"
                size="icon-sm"
                className="size-8 shrink-0 bg-ws-accent hover:bg-ws-accent-hover"
                onClick={() => void saveName()}
              >
                <CheckIcon className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-md border border-ws-border bg-ws-bg px-2.5 py-2">
              <span className="truncate text-[13px] font-medium">
                {projectName ?? "Project"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 shrink-0 text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
                onClick={() => setIsRenaming(true)}
              >
                <PencilIcon className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        <Separator className="bg-ws-border" />

        <div className="max-h-56 overflow-y-auto p-1.5">
          {projects === undefined ? (
            <p className="px-2 py-3 text-[12px] text-ws-text-muted">Loading…</p>
          ) : otherProjects.length === 0 ? (
            <p className="px-2 py-3 text-[12px] text-ws-text-muted">
              No other workspaces yet.
            </p>
          ) : (
            otherProjects.map((project) => (
              <button
                key={project._id}
                type="button"
                onClick={() => {
                  router.push(`/projects/${project._id}`);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-ws-hover"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-ws-bg">
                  {getProjectsIcons(project)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {project.name}
                  </span>
                  <span className="block truncate text-[11px] text-ws-text-muted">
                    Updated{" "}
                    {formatDistanceToNow(project.updatedAt, {
                      addSuffix: true,
                    })}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <Separator className="bg-ws-border" />

        <div className="flex flex-col gap-0.5 p-1.5">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-2 py-2 text-[13px] text-ws-text-secondary transition-colors hover:bg-ws-hover"
          >
            <HomeIcon className="size-3.5 text-ws-text-muted" />
            All workspaces
          </Link>
          <button
            type="button"
            onClick={() => {
              router.push("/");
              setOpen(false);
            }}
            className="flex items-center gap-2 rounded-md px-2 py-2 text-[13px] text-ws-text-secondary transition-colors hover:bg-ws-hover"
          >
            <FolderOpenIcon className="size-3.5 text-ws-text-muted" />
            Open workspace picker
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
