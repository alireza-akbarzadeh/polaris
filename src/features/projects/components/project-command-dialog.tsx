"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowRightIcon, FolderOpenIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { Doc } from "@/convex/_generated/dataModel";
import { ProjectListSkeleton } from "@/features/projects/components/project-list-loading";
import { getProjectsIcons } from "@/features/projects/components/project-row";
import { useProjects } from "@/features/projects/hooks/use-projects";

interface ProjectCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ProjectCommandItemContent({ project }: { project: Doc<"projects"> }) {
  const status =
    project.importStatus === "importing"
      ? "Importing…"
      : project.exportStatus === "exporting"
        ? "Exporting…"
        : null;

  return (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-foreground/6 text-muted-foreground">
        {getProjectsIcons(project)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium tracking-tight">
          {project.name}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
          {status ??
            `Updated ${formatDistanceToNow(project.updatedAt, { addSuffix: true })}`}
        </span>
      </span>
      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
    </>
  );
}

export function ProjectCommandDialog({
  open,
  onOpenChange,
}: ProjectCommandDialogProps) {
  const projects = useProjects();
  const router = useRouter();

  const onOpenProject = (project: Doc<"projects">) => {
    router.push(`/projects/${project._id}`);
    onOpenChange(false);
  };

  const latest = projects?.[0];
  const rest = projects?.slice(1) ?? [];

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Projects"
      description="Search and open a project"
      showCloseButton={false}
      className="top-[18%] translate-y-0 sm:max-w-lg"
    >
      <CommandInput placeholder="Search projects…" />
      {projects === undefined ? (
        <div className="py-2">
          <ProjectListSkeleton />
        </div>
      ) : (
        <CommandList className="max-h-[min(56vh,420px)]">
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
              <FolderOpenIcon className="size-5 opacity-50" />
              <p className="text-sm">No projects found.</p>
            </div>
          </CommandEmpty>

          {latest ? (
            <CommandGroup heading="Continue">
              <CommandItem
                value={`continue ${latest.name} ${latest._id}`}
                onSelect={() => onOpenProject(latest)}
                className="group gap-3 py-2.5"
              >
                <ProjectCommandItemContent project={latest} />
              </CommandItem>
            </CommandGroup>
          ) : null}

          {latest && rest.length > 0 ? <CommandSeparator /> : null}

          {rest.length > 0 ? (
            <CommandGroup heading="All projects">
              {rest.map((project) => (
                <CommandItem
                  key={project._id}
                  value={`${project.name} ${project._id}`}
                  onSelect={() => onOpenProject(project)}
                  className="group gap-3 py-2.5"
                >
                  <ProjectCommandItemContent project={project} />
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      )}
    </CommandDialog>
  );
}
