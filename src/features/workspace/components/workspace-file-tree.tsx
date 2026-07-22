"use client";

import {
  DefaultFolderOpenedIcon,
  FileIcon,
  FolderIcon,
} from "@react-symbols/icons/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FilePlusIcon,
  FolderPlusIcon,
  ListCollapseIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Id } from "@/convex/_generated/dataModel";
import {
  useCreateProjectFile,
  useDeleteProjectFile,
  useProjectFiles,
  useRenameProjectFile,
  useSeedProjectFiles,
} from "@/features/workspace/hooks/use-project-files";
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
  const createFile = useCreateProjectFile();
  const router = useRouter();
  const [collapseKey, setCollapseKey] = useState(0);

  const tree = useMemo(
    () => (files ? buildFileTree(files) : undefined),
    [files],
  );

  useEffect(() => {
    if (files !== undefined && files.length === 0) {
      void seedDefaults({ projectId: projectId as Id<"projects"> });
    }
  }, [files, projectId, seedDefaults]);

  const onNewFile = useCallback(
    async (parentId?: Id<"projectFiles">) => {
      try {
        const fileId = await createFile({
          projectId: projectId as Id<"projects">,
          name: "untitled.ts",
          parentId,
          kind: "file",
          content: "",
        });
        const created = files?.find((f) => f._id === fileId);
        if (created) {
          router.push(`/projects/${projectId}/files/${created.path}`);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create file",
        );
      }
    },
    [createFile, files, projectId, router],
  );

  const onNewFolder = useCallback(
    async (parentId?: Id<"projectFiles">) => {
      try {
        await createFile({
          projectId: projectId as Id<"projects">,
          name: "new-folder",
          parentId,
          kind: "folder",
        });
        toast.success("Folder created");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create folder",
        );
      }
    },
    [createFile, projectId],
  );

  if (files === undefined) {
    return (
      <p className="px-3 py-2 text-[11px] text-[#787878]">Loading files…</p>
    );
  }

  if (tree?.length === 0) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex h-full min-h-24 items-center justify-center p-3">
            <p className="text-[11px] text-[#787878]">No files yet</p>
          </div>
        </ContextMenuTrigger>
        <FileTreeMenuContent
          isFolder
          showItemActions={false}
          onNewFile={() => void onNewFile()}
          onNewFolder={() => void onNewFolder()}
          onRename={() => {}}
          onDelete={() => {}}
        />
      </ContextMenu>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-0.5 border-b border-[#1e1f22] px-1 py-1">
        <TreeToolbarButton
          label="New File"
          onClick={() => void onNewFile()}
        >
          <FilePlusIcon className="size-3.5" />
        </TreeToolbarButton>
        <TreeToolbarButton
          label="New Folder"
          onClick={() => void onNewFolder()}
        >
          <FolderPlusIcon className="size-3.5" />
        </TreeToolbarButton>
        <TreeToolbarButton
          label="Collapse All"
          onClick={() => setCollapseKey((k) => k + 1)}
        >
          <ListCollapseIcon className="size-3.5" />
        </TreeToolbarButton>
      </div>

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <nav
            aria-label="Project files"
            className="flex-1 overflow-auto p-1.5"
            key={collapseKey}
          >
            {tree?.map((node) => (
              <FileTreeItem
                key={node.id}
                node={node}
                projectId={projectId}
                depth={0}
                defaultOpen={collapseKey === 0}
                onNewFile={onNewFile}
                onNewFolder={onNewFolder}
              />
            ))}
          </nav>
        </ContextMenuTrigger>
        <FileTreeMenuContent
          isFolder
          showItemActions={false}
          onNewFile={() => void onNewFile()}
          onNewFolder={() => void onNewFolder()}
          onRename={() => {}}
          onDelete={() => {}}
        />
      </ContextMenu>
    </div>
  );
}

function TreeToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="size-6 rounded-sm text-[#afb1b3] hover:bg-[#3c3f41] hover:text-[#dfdfdf]"
    >
      {children}
    </Button>
  );
}

type FileTreeMenuContentProps = {
  isFolder: boolean;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  menuType?: "context" | "dropdown";
  showItemActions?: boolean;
};

function FileTreeMenuContent({
  isFolder,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  menuType = "context",
  showItemActions = true,
}: FileTreeMenuContentProps) {
  const itemClassName = "text-[12px] focus:bg-[#4e5155] focus:text-[#dfdfdf]";
  const destructiveClassName =
    "text-[12px] focus:bg-[#5c2b29] focus:text-[#ff6b68]";

  const Item = menuType === "dropdown" ? DropdownMenuItem : ContextMenuItem;
  const Separator =
    menuType === "dropdown" ? DropdownMenuSeparator : ContextMenuSeparator;
  const Content =
    menuType === "dropdown" ? DropdownMenuContent : ContextMenuContent;

  return (
    <Content className="min-w-44 border-[#4e5155] bg-[#3c3f41] text-[#dfdfdf]">
      {isFolder ? (
        <>
          <Item onClick={onNewFile} className={itemClassName}>
            <FilePlusIcon className="size-3.5" />
            New File
          </Item>
          <Item onClick={onNewFolder} className={itemClassName}>
            <FolderPlusIcon className="size-3.5" />
            New Folder
          </Item>
          <Separator className="bg-[#4e5155]" />
        </>
      ) : null}
      {showItemActions ? (
        <>
          <Item onClick={onRename} className={itemClassName}>
            <PencilIcon className="size-3.5" />
            Rename
          </Item>
          <Item
            variant={menuType === "context" ? "destructive" : undefined}
            onClick={onDelete}
            className={destructiveClassName}
          >
            <Trash2Icon className="size-3.5" />
            Delete
          </Item>
        </>
      ) : null}
    </Content>
  );
}

type FileTreeItemProps = {
  node: FileTreeNode;
  projectId: string;
  depth: number;
  defaultOpen?: boolean;
  onNewFile: (parentId?: Id<"projectFiles">) => void;
  onNewFolder: (parentId?: Id<"projectFiles">) => void;
};

function FileTreeItem({
  node,
  projectId,
  depth,
  defaultOpen = true,
  onNewFile,
  onNewFolder,
}: FileTreeItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const renameFile = useRenameProjectFile();
  const deleteFile = useDeleteProjectFile();

  const [open, setOpen] = useState(defaultOpen);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const isFolder = node.kind === "folder";
  const href = `/projects/${projectId}/files/${node.path}`;
  const active = !isFolder && pathname === href;

  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renaming]);

  const startRename = () => {
    setRenameValue(node.name);
    setRenaming(true);
  };

  const commitRename = async () => {
    const name = renameValue.trim();
    setRenaming(false);
    if (!name || name === node.name) return;

    try {
      const newPath = await renameFile({
        projectId: projectId as Id<"projects">,
        path: node.path,
        name,
      });
      if (!isFolder && pathname === href) {
        router.push(`/projects/${projectId}/files/${newPath}`);
      }
      toast.success("Renamed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to rename",
      );
    }
  };

  const onDelete = async () => {
    try {
      const wasActive = !isFolder && pathname === href;
      await deleteFile({
        projectId: projectId as Id<"projects">,
        path: node.path,
      });
      if (wasActive) {
        router.push(`/projects/${projectId}`);
      }
      toast.success("Deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete",
      );
    } finally {
      setDeleteOpen(false);
    }
  };

  const menuProps = {
    isFolder,
    onNewFile: () => onNewFile(isFolder ? node.id : undefined),
    onNewFolder: () => onNewFolder(isFolder ? node.id : undefined),
    onRename: startRename,
    onDelete: () => setDeleteOpen(true),
  };

  const rowInner = isFolder ? (
    <button
      type="button"
      onClick={() => setOpen((value) => !value)}
      onDoubleClick={startRename}
      className="flex min-w-0 flex-1 items-center gap-1 rounded-sm py-0.5 pr-1 text-left text-[12px] text-[#bcbec4] hover:bg-[#3c3f41]"
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
      {renaming ? (
        <RenameInput
          ref={renameInputRef}
          value={renameValue}
          onChange={setRenameValue}
          onCommit={() => void commitRename()}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <span className="truncate">{node.name}</span>
      )}
    </button>
  ) : renaming ? (
    <div
      className="flex min-w-0 flex-1 items-center gap-1 py-0.5 pr-1"
      style={{ paddingLeft: `${20 + depth * 12}px` }}
    >
      <span className="size-3.5 shrink-0 [&_svg]:size-full">
        <FileIcon fileName={node.name} autoAssign />
      </span>
      <RenameInput
        ref={renameInputRef}
        value={renameValue}
        onChange={setRenameValue}
        onCommit={() => void commitRename()}
        onCancel={() => setRenaming(false)}
      />
    </div>
  ) : (
    <Link
      href={href}
      onDoubleClick={(e) => {
        e.preventDefault();
        startRename();
      }}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1 rounded-sm py-0.5 pr-1 text-[12px] transition-colors",
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

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group flex items-center rounded-sm",
              (menuOpen || active) && "bg-[#3c3f41]/60",
            )}
          >
            {rowInner}
            {!renaming ? (
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${node.name}`}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "mr-0.5 size-5 shrink-0 rounded-sm text-[#afb1b3] opacity-0 hover:bg-[#4e5155] hover:text-[#dfdfdf] group-hover:opacity-100",
                      menuOpen && "opacity-100",
                    )}
                  >
                    <MoreHorizontalIcon className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <FileTreeMenuContent {...menuProps} menuType="dropdown" />
              </DropdownMenu>
            ) : null}
          </div>
        </ContextMenuTrigger>
        <FileTreeMenuContent {...menuProps} menuType="context" />
      </ContextMenu>

      {isFolder && open
        ? node.children?.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              projectId={projectId}
              depth={depth + 1}
              defaultOpen={defaultOpen}
              onNewFile={onNewFile}
              onNewFolder={onNewFolder}
            />
          ))
        : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-[#4e5155] bg-[#2b2d30] text-[#dfdfdf]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {node.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9a9a9a]">
              {isFolder
                ? "This will permanently delete this folder and all its contents."
                : "This will permanently delete this file."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#4e5155] bg-[#3c3f41] text-[#dfdfdf] hover:bg-[#4e5155]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void onDelete()}
              className="bg-[#c42b1c] text-white hover:bg-[#a82418]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type RenameInputProps = {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
};

const RenameInput = ({
  ref,
  value,
  onChange,
  onCommit,
  onCancel,
}: RenameInputProps & { ref?: React.Ref<HTMLInputElement> }) => (
  <Input
    ref={ref}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onCommit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }}
    onBlur={onCommit}
    className="h-5 min-w-0 flex-1 border-[#4e5155] bg-[#1e1f22] px-1 py-0 text-[12px] text-[#dfdfdf] focus-visible:ring-1 focus-visible:ring-[#3574f0]"
    onClick={(e) => e.stopPropagation()}
  />
);
