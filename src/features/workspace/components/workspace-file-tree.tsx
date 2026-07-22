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
import {
  siblingNames,
  suggestUniqueName,
} from "@/features/workspace/lib/unique-name";
import { cn } from "@/lib/utils";

type PendingCreate = {
  parentId?: Id<"projectFiles">;
  kind: "file" | "folder";
};

type WorkspaceFileTreeProps = {
  projectId: string;
};

type VisibleTreeItem = {
  node: FileTreeNode;
  depth: number;
  parentId?: Id<"projectFiles">;
};

function collectFolderIds(nodes: FileTreeNode[]): Id<"projectFiles">[] {
  const ids: Id<"projectFiles">[] = [];
  for (const node of nodes) {
    if (node.kind === "folder") {
      ids.push(node.id);
      if (node.children) {
        ids.push(...collectFolderIds(node.children));
      }
    }
  }
  return ids;
}

function flattenVisibleTree(
  nodes: FileTreeNode[],
  openFolderIds: Set<Id<"projectFiles">>,
  depth = 0,
  parentId?: Id<"projectFiles">,
): VisibleTreeItem[] {
  const items: VisibleTreeItem[] = [];

  for (const node of nodes) {
    items.push({ node, depth, parentId });
    if (
      node.kind === "folder" &&
      openFolderIds.has(node.id) &&
      node.children?.length
    ) {
      items.push(
        ...flattenVisibleTree(node.children, openFolderIds, depth + 1, node.id),
      );
    }
  }

  return items;
}

function findNodeByPath(
  nodes: FileTreeNode[],
  path: string,
): FileTreeNode | undefined {
  for (const node of nodes) {
    if (node.path === path) {
      return node;
    }
    if (node.children) {
      const match = findNodeByPath(node.children, path);
      if (match) {
        return match;
      }
    }
  }
  return undefined;
}

export function WorkspaceFileTree({ projectId }: WorkspaceFileTreeProps) {
  const files = useProjectFiles(projectId);
  const seedDefaults = useSeedProjectFiles();
  const createFile = useCreateProjectFile();
  const router = useRouter();
  const pathname = usePathname();
  const [collapseKey, setCollapseKey] = useState(0);
  const [openFolderIds, setOpenFolderIds] = useState<Set<Id<"projectFiles">>>(
    new Set(),
  );
  const [focusedId, setFocusedId] = useState<Id<"projectFiles"> | null>(null);
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null);

  const tree = useMemo(
    () => (files ? buildFileTree(files) : undefined),
    [files],
  );

  useEffect(() => {
    if (!tree) {
      return;
    }

    if (collapseKey === 0) {
      setOpenFolderIds(new Set(collectFolderIds(tree)));
    }
  }, [tree, collapseKey]);

  useEffect(() => {
    if (!tree || focusedId !== null) {
      return;
    }

    const activePath = pathname.match(/\/files\/(.+)$/)?.[1];
    if (!activePath) {
      return;
    }

    const activeNode = findNodeByPath(tree, decodeURIComponent(activePath));
    if (activeNode) {
      setFocusedId(activeNode.id);
    }
  }, [tree, pathname, focusedId]);

  useEffect(() => {
    if (!focusedId) {
      return;
    }

    const element = document.querySelector(
      `[data-tree-item-id="${focusedId}"]`,
    );
    if (element instanceof HTMLElement) {
      element.focus();
      element.scrollIntoView({ block: "nearest" });
    }
  }, [focusedId]);

  const toggleFolder = useCallback((folderId: Id<"projectFiles">) => {
    setOpenFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setCollapseKey((key) => key + 1);
    setOpenFolderIds(new Set());
  }, []);

  const handleTreeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!tree || renamingInputFocused()) {
        return;
      }

      const visibleItems = flattenVisibleTree(tree, openFolderIds);
      if (visibleItems.length === 0) {
        return;
      }

      const currentIndex = focusedId
        ? visibleItems.findIndex((item) => item.node.id === focusedId)
        : -1;

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          const nextIndex =
            currentIndex < visibleItems.length - 1 ? currentIndex + 1 : 0;
          setFocusedId(visibleItems[nextIndex].node.id);
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          const nextIndex =
            currentIndex > 0
              ? currentIndex - 1
              : visibleItems.length - 1;
          setFocusedId(visibleItems[nextIndex].node.id);
          break;
        }
        case "ArrowRight": {
          if (currentIndex < 0) {
            return;
          }

          const current = visibleItems[currentIndex];
          if (current.node.kind !== "folder") {
            return;
          }

          event.preventDefault();
          if (!openFolderIds.has(current.node.id)) {
            toggleFolder(current.node.id);
            return;
          }

          const next = visibleItems[currentIndex + 1];
          if (next?.parentId === current.node.id) {
            setFocusedId(next.node.id);
          }
          break;
        }
        case "ArrowLeft": {
          if (currentIndex < 0) {
            return;
          }

          const current = visibleItems[currentIndex];
          event.preventDefault();

          if (
            current.node.kind === "folder" &&
            openFolderIds.has(current.node.id)
          ) {
            toggleFolder(current.node.id);
            return;
          }

          if (current.parentId) {
            setFocusedId(current.parentId);
          }
          break;
        }
      }
    },
    [focusedId, openFolderIds, toggleFolder, tree],
  );

  useEffect(() => {
    if (files !== undefined && files.length === 0) {
      void seedDefaults({ projectId: projectId as Id<"projects"> });
    }
  }, [files, projectId, seedDefaults]);

  const startCreate = useCallback(
    (kind: "file" | "folder", parentId?: Id<"projectFiles">) => {
      setPendingCreate({ kind, parentId });
    },
    [],
  );

  const cancelCreate = useCallback(() => {
    setPendingCreate(null);
  }, []);

  const commitCreate = useCallback(
    async (name: string) => {
      if (!pendingCreate) return;

      const trimmed = name.trim();
      if (!trimmed) {
        cancelCreate();
        return;
      }

      const { kind, parentId } = pendingCreate;

      try {
        const fileId = await createFile({
          projectId: projectId as Id<"projects">,
          name: trimmed,
          parentId,
          kind,
          content: kind === "file" ? "" : undefined,
        });
        cancelCreate();

        if (kind === "file") {
          const created = files?.find((f) => f._id === fileId);
          if (created) {
            router.push(`/projects/${projectId}/files/${created.path}`);
          }
        } else {
          toast.success("Folder created");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create item",
        );
      }
    },
    [cancelCreate, createFile, files, pendingCreate, projectId, router],
  );

  const renderPendingCreate = (parentId: Id<"projectFiles"> | undefined, depth: number) => {
    if (!pendingCreate || pendingCreate.parentId !== parentId) {
      return null;
    }

    const defaultName = suggestUniqueName(
      siblingNames(files ?? [], parentId),
      pendingCreate.kind === "file" ? "untitled.ts" : "new-folder",
    );

    return (
      <PendingCreateRow
        key="pending-create"
        depth={depth}
        kind={pendingCreate.kind}
        defaultName={defaultName}
        onCommit={(name) => void commitCreate(name)}
        onCancel={cancelCreate}
      />
    );
  };

  if (files === undefined) {
    return (
      <p className="px-3 py-2 text-[11px] text-[#787878]">Loading files…</p>
    );
  }

  if (tree?.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <TreeToolbar
          onNewFile={() => startCreate("file")}
          onNewFolder={() => startCreate("folder")}
          onCollapseAll={collapseAll}
        />
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex min-h-24 flex-1 flex-col p-1.5">
              {renderPendingCreate(undefined, 0)}
              {!pendingCreate ? (
                <p className="px-2 py-2 text-[11px] text-[#787878]">No files yet</p>
              ) : null}
            </div>
          </ContextMenuTrigger>
          <FileTreeMenuContent
            isFolder
            showItemActions={false}
            onNewFile={() => startCreate("file")}
            onNewFolder={() => startCreate("folder")}
            onRename={() => {}}
            onDelete={() => {}}
          />
        </ContextMenu>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <TreeToolbar
        onNewFile={() => startCreate("file")}
        onNewFolder={() => startCreate("folder")}
        onCollapseAll={collapseAll}
      />

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <nav
            aria-label="Project files"
            className="flex-1 overflow-auto p-1.5 outline-none focus-visible:outline-none"
            key={collapseKey}
            onKeyDown={handleTreeKeyDown}
          >
            {tree?.map((node) => (
              <FileTreeItem
                key={node.id}
                node={node}
                projectId={projectId}
                depth={0}
                openFolderIds={openFolderIds}
                onToggleFolder={toggleFolder}
                focusedId={focusedId}
                onFocusItem={setFocusedId}
                pendingCreate={pendingCreate}
                onStartCreate={startCreate}
                renderPendingCreate={renderPendingCreate}
              />
            ))}
            {renderPendingCreate(undefined, 0)}
          </nav>
        </ContextMenuTrigger>
        <FileTreeMenuContent
          isFolder
          showItemActions={false}
          onNewFile={() => startCreate("file")}
          onNewFolder={() => startCreate("folder")}
          onRename={() => {}}
          onDelete={() => {}}
        />
      </ContextMenu>
    </div>
  );
}

function renamingInputFocused() {
  const active = document.activeElement;
  return (
    active instanceof HTMLInputElement &&
    active.dataset.treeRenameInput === "true"
  );
}

function TreeToolbar({
  onNewFile,
  onNewFolder,
  onCollapseAll,
}: {
  onNewFile: () => void;
  onNewFolder: () => void;
  onCollapseAll: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 border-b border-[#1e1f22] px-1 py-1">
      <TreeToolbarButton label="New File" onClick={onNewFile}>
        <FilePlusIcon className="size-3.5" />
      </TreeToolbarButton>
      <TreeToolbarButton label="New Folder" onClick={onNewFolder}>
        <FolderPlusIcon className="size-3.5" />
      </TreeToolbarButton>
      <TreeToolbarButton label="Collapse All" onClick={onCollapseAll}>
        <ListCollapseIcon className="size-3.5" />
      </TreeToolbarButton>
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
  openFolderIds: Set<Id<"projectFiles">>;
  onToggleFolder: (folderId: Id<"projectFiles">) => void;
  focusedId: Id<"projectFiles"> | null;
  onFocusItem: (id: Id<"projectFiles">) => void;
  pendingCreate: PendingCreate | null;
  onStartCreate: (kind: "file" | "folder", parentId?: Id<"projectFiles">) => void;
  renderPendingCreate: (
    parentId: Id<"projectFiles"> | undefined,
    depth: number,
  ) => React.ReactNode;
};

function FileTreeItem({
  node,
  projectId,
  depth,
  openFolderIds,
  onToggleFolder,
  focusedId,
  onFocusItem,
  pendingCreate,
  onStartCreate,
  renderPendingCreate,
}: FileTreeItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const renameFile = useRenameProjectFile();
  const deleteFile = useDeleteProjectFile();

  const isPendingChild = pendingCreate?.parentId === node.id;
  const isFolder = node.kind === "folder";
  const open = isFolder && (openFolderIds.has(node.id) || isPendingChild);
  const isFocused = focusedId === node.id;
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const href = `/projects/${projectId}/files/${node.path}`;
  const active = !isFolder && pathname === href;

  useEffect(() => {
    if (isPendingChild && isFolder && !openFolderIds.has(node.id)) {
      onToggleFolder(node.id);
    }
  }, [isFolder, isPendingChild, node.id, onToggleFolder, openFolderIds]);

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
    onNewFile: () => onStartCreate("file", isFolder ? node.id : undefined),
    onNewFolder: () => onStartCreate("folder", isFolder ? node.id : undefined),
    onRename: startRename,
    onDelete: () => setDeleteOpen(true),
  };

  const focusProps = {
    "data-tree-item-id": node.id,
    tabIndex: isFocused ? 0 : -1,
    onFocus: () => onFocusItem(node.id),
  };

  const rowInner = isFolder ? (
    <button
      type="button"
      {...focusProps}
      onClick={() => {
        onFocusItem(node.id);
        onToggleFolder(node.id);
      }}
      onDoubleClick={startRename}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1 rounded-sm py-0.5 pr-1 text-left text-[12px] text-[#bcbec4] hover:bg-[#3c3f41] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#3574f0]",
        isFocused && "bg-[#3c3f41] text-[#dfdfdf]",
      )}
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
      {...focusProps}
      onClick={() => onFocusItem(node.id)}
      onDoubleClick={(e) => {
        e.preventDefault();
        startRename();
      }}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1 rounded-sm py-0.5 pr-1 text-[12px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#3574f0]",
        active || isFocused
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

      {isFolder && open ? (
        <>
          {node.children?.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              projectId={projectId}
              depth={depth + 1}
              openFolderIds={openFolderIds}
              onToggleFolder={onToggleFolder}
              focusedId={focusedId}
              onFocusItem={onFocusItem}
              pendingCreate={pendingCreate}
              onStartCreate={onStartCreate}
              renderPendingCreate={renderPendingCreate}
            />
          ))}
          {renderPendingCreate(node.id, depth + 1)}
        </>
      ) : null}

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
  selectOnFocus = true,
}: RenameInputProps & {
  ref?: React.Ref<HTMLInputElement>;
  selectOnFocus?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const mergedRef = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  useEffect(() => {
    if (selectOnFocus) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      inputRef.current?.focus();
    }
  }, [selectOnFocus]);

  return (
    <Input
      ref={mergedRef}
      data-tree-rename-input="true"
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
};

function PendingCreateRow({
  depth,
  kind,
  defaultName,
  onCommit,
  onCancel,
}: {
  depth: number;
  kind: "file" | "folder";
  defaultName: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultName);
  const paddingLeft = kind === "folder" ? 8 + depth * 12 : 20 + depth * 12;

  return (
    <div
      className="flex items-center gap-1 py-0.5 pr-1"
      style={{ paddingLeft: `${paddingLeft}px` }}
    >
      {kind === "folder" ? (
        <>
          <span className="size-3 shrink-0" />
          <span className="size-3.5 shrink-0 [&_svg]:size-full">
            <FolderIcon folderName={value || "folder"} />
          </span>
        </>
      ) : (
        <span className="size-3.5 shrink-0 [&_svg]:size-full">
          <FileIcon fileName={value || "file"} autoAssign />
        </span>
      )}
      <RenameInput
        value={value}
        onChange={setValue}
        onCommit={() => onCommit(value)}
        onCancel={onCancel}
        selectOnFocus
      />
    </div>
  );
};
