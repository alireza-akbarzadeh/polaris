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
          className="h-7 max-w-[220px] gap-2 rounded-sm px-1.5 text-[#dfdfdf] hover:bg-[#3c3f41] hover:text-white"
        >
          <Image
            src="/logo.svg"
            alt=""
            width={16}
            height={16}
            className="size-4 shrink-0"
          />
          <span className="truncate text-[13px] font-medium">
            {projectName ?? "Project"}
          </span>
          <ChevronsUpDownIcon className="size-3 shrink-0 text-[#787878]" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-80 border-[#4e5155] bg-[#2b2d30] p-0 text-[#dfdfdf]"
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#787878]">
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
                className="h-8 border-[#4e5155] bg-[#1e1f22] text-[13px] text-[#dfdfdf]"
              />
              <Button
                type="button"
                size="icon-sm"
                className="size-8 shrink-0 bg-[#3574f0] hover:bg-[#2d66d8]"
                onClick={() => void saveName()}
              >
                <CheckIcon className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-md border border-[#4e5155] bg-[#1e1f22] px-2.5 py-2">
              <span className="truncate text-[13px] font-medium">
                {projectName ?? "Project"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 shrink-0 text-[#afb1b3] hover:bg-[#3c3f41] hover:text-[#dfdfdf]"
                onClick={() => setIsRenaming(true)}
              >
                <PencilIcon className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        <Separator className="bg-[#4e5155]" />

        <div className="max-h-56 overflow-y-auto p-1.5">
          {projects === undefined ? (
            <p className="px-2 py-3 text-[12px] text-[#787878]">Loading…</p>
          ) : otherProjects.length === 0 ? (
            <p className="px-2 py-3 text-[12px] text-[#787878]">
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
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-[#3c3f41]"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-[#1e1f22]">
                  {getProjectsIcons(project)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {project.name}
                  </span>
                  <span className="block truncate text-[11px] text-[#787878]">
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

        <Separator className="bg-[#4e5155]" />

        <div className="flex flex-col gap-0.5 p-1.5">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-2 py-2 text-[13px] text-[#bcbec4] transition-colors hover:bg-[#3c3f41]"
          >
            <HomeIcon className="size-3.5 text-[#afb1b3]" />
            All workspaces
          </Link>
          <button
            type="button"
            onClick={() => {
              router.push("/");
              setOpen(false);
            }}
            className="flex items-center gap-2 rounded-md px-2 py-2 text-[13px] text-[#bcbec4] transition-colors hover:bg-[#3c3f41]"
          >
            <FolderOpenIcon className="size-3.5 text-[#afb1b3]" />
            Open workspace picker
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
