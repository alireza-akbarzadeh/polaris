"use client";

import {
  DefaultFolderOpenedIcon,
  FileIcon,
  FolderIcon,
} from "@react-symbols/icons/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  useProjectFiles,
  useSeedProjectFiles,
} from "@/features/workspace/hooks/use-project-files";
import type { Id } from "@/convex/_generated/dataModel";
import {
  buildFileTree,
  type FileTreeNode,
} from "@/features/workspace/lib/file-tree";
import { cn } from "@/lib/utils";

type WorkspaceFileTreeProps = {
  projectId: string;
};

export function WorkspaceFileTree({ projectId }: WorkspaceFileTreeProps) {
  const files = useProjectFiles(projectId);
  const seedDefaults = useSeedProjectFiles();
  const tree = useMemo(
    () => (files ? buildFileTree(files) : undefined),
    [files],
  );

  useEffect(() => {
    if (files !== undefined && files.length === 0) {
      void seedDefaults({ projectId: projectId as Id<"projects"> });
    }
  }, [files, projectId, seedDefaults]);

  if (files === undefined) {
    return (
      <p className="px-2 py-1 text-[11px] text-[#787878]">Loading files…</p>
    );
  }

  if (tree?.length === 0) {
    return (
      <p className="px-2 py-1 text-[11px] text-[#787878]">No files yet</p>
    );
  }

  return (
    <nav aria-label="Project files" className="flex flex-col gap-0.5">
      {tree?.map((node) => (
        <FileTreeItem
          key={node.id}
          node={node}
          projectId={projectId}
          depth={0}
        />
      ))}
    </nav>
  );
}

type FileTreeItemProps = {
  node: FileTreeNode;
  projectId: string;
  depth: number;
};

function FileTreeItem({ node, projectId, depth }: FileTreeItemProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const isFolder = node.kind === "folder";

  if (isFolder) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-1 rounded-sm py-0.5 pr-2 text-left text-[12px] text-[#bcbec4] hover:bg-[#3c3f41]"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          {open ? (
            <ChevronDownIcon className="size-3 shrink-0 text-[#6f737a]" />
          ) : (
            <ChevronRightIcon className="size-3 shrink-0 text-[#6f737a]" />
          )}
          <span className="size-3.5 shrink-0 [&_svg]:size-full">
            {open ? (
              <DefaultFolderOpenedIcon />
            ) : (
              <FolderIcon folderName={node.name} />
            )}
          </span>
          <span className="truncate">{node.name}</span>
        </button>
        {open
          ? node.children?.map((child) => (
              <FileTreeItem
                key={child.id}
                node={child}
                projectId={projectId}
                depth={depth + 1}
              />
            ))
          : null}
      </div>
    );
  }

  const href = `/projects/${projectId}/files/${node.path}`;
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1 rounded-sm py-0.5 pr-2 text-[12px] transition-colors",
        active
          ? "bg-[#3c3f41] text-[#dfdfdf]"
          : "text-[#9a9a9a] hover:bg-[#3c3f41] hover:text-[#dfdfdf]",
      )}
      style={{ paddingLeft: `${20 + depth * 12}px` }}
    >
      <span className="size-3.5 shrink-0 [&_svg]:size-full">
        <FileIcon fileName={node.name} autoAssign />
      </span>
      <span className="truncate">{node.name}</span>
    </Link>
  );
}
