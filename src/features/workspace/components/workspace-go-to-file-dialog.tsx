"use client";

import { FileIcon } from "@react-symbols/icons/utils";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useProjectFiles } from "@/features/workspace/hooks/use-project-files";
import { fuzzyMatchFile } from "@/features/workspace/lib/search";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

type WorkspaceGoToFileDialogProps = {
  projectId: string;
};

export function WorkspaceGoToFileDialog({
  projectId,
}: WorkspaceGoToFileDialogProps) {
  const open = useWorkspaceStore((s) => s.goToFileOpen);
  const closeGoToFile = useWorkspaceStore((s) => s.closeGoToFile);
  const files = useProjectFiles(projectId);
  const router = useRouter();

  const filePaths = useMemo(
    () =>
      (files ?? [])
        .filter((f) => f.kind === "file")
        .map((f) => f.path)
        .sort((a, b) => a.localeCompare(b)),
    [files],
  );

  const onOpenChange = (next: boolean) => {
    if (!next) closeGoToFile();
  };

  const onSelect = (path: string) => {
    router.push(`/projects/${projectId}/files/${path}`);
    closeGoToFile();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Go to File"
      description="Search and open a file in this project"
      showCloseButton={false}
      className="top-[18%] translate-y-0 border-[#4e5155] bg-[#2b2d30] sm:max-w-lg [&_[cmdk-group-heading]]:text-[#6f737a] [&_[cmdk-input]]:text-[#dfdfdf]"
    >
      <CommandInput
        placeholder="Search files by name…"
        className="text-[13px]"
      />
      <CommandList className="max-h-[min(56vh,420px)]">
        <CommandEmpty className="py-6 text-[12px] text-[#787878]">
          No files found.
        </CommandEmpty>
        <CommandGroup heading="Files">
          {filePaths.map((path) => (
            <CommandItem
              key={path}
              value={path}
              keywords={[path]}
              onSelect={() => onSelect(path)}
              className="gap--2 py-2 text-[#bcbec4] data-[selected=true]:bg-[#3c3f41] data-[selected=true]:text-[#dfdfdf]"
              filter={(value, search) =>
                fuzzyMatchFile(search, value) ? 1 : 0
              }
            >
              <span className="size-4 shrink-0 [&_svg]:size-full">
                <FileIcon
                  fileName={path.split("/").pop() ?? path}
                  autoAssign
                />
              </span>
              <span className="truncate font-mono text-[12px]">{path}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
