"use client";

import { FileIcon } from "@react-symbols/icons/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { useProject } from "@/features/projects/hooks/use-projects";
import { useChangedFiles } from "@/features/workspace/hooks/use-project-files";
import { cn } from "@/lib/utils";

type WorkspaceChangeListProps = {
  projectId: string;
  emptyMessage?: string;
};

export function WorkspaceChangeList({
  projectId,
  emptyMessage = "No modified files",
}: WorkspaceChangeListProps) {
  const project = useProject({ projectId });
  const changedFiles = useChangedFiles(projectId);
  const pathname = usePathname();

  if (project === undefined || changedFiles === undefined) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-[#787878]">
        <Loader2Icon className="size-3.5 animate-spin" />
        Loading changes…
      </div>
    );
  }

  if (!project.syncedAt) {
    return (
      <p className="px-3 py-4 text-[11px] leading-relaxed text-[#787878]">
        Change tracking is not available for this project yet. Re-import from
        GitHub or create a new project to enable the change list.
      </p>
    );
  }

  if (changedFiles.length === 0) {
    return (
      <p className="px-3 py-4 text-[11px] text-[#787878]">{emptyMessage}</p>
    );
  }

  return (
    <ul className="space-y-0.5 p-1.5">
      {changedFiles.map((file) => {
        const href = `/projects/${projectId}/files/${file.path}`;
        const active = pathname === href;

        return (
          <li key={file._id}>
            <Link
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-sm py-0.5 pr-2 pl-2 text-[12px] transition-colors",
                active
                  ? "bg-[#3c3f41] text-[#dfdfdf]"
                  : "text-[#9a9a9a] hover:bg-[#3c3f41] hover:text-[#dfdfdf]",
              )}
            >
              <span className="size-3.5 shrink-0 text-[#6a8759]">M</span>
              <span className="size-3.5 shrink-0 [&_svg]:size-full">
                <FileIcon fileName={file.name} autoAssign />
              </span>
              <span className="min-w-0 flex-1 truncate">{file.path}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
