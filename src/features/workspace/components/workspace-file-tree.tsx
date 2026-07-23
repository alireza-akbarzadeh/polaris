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
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useProjectAccess } from "@/features/projects/hooks/use-project-access";
import { useProject } from "@/features/projects/hooks/use-projects";
import {
  useCreateProjectFile,
  useDeleteProjectFile,
  useDuplicateProjectFile,
  useMoveProjectFile,
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
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";
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

const CHAT_ATTACH_FILE_CAP = 20;

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

function collectAttachPaths(
  files: Doc<"projectFiles">[],
  path: string,
  kind: "file" | "folder",
): string[] {
  if (kind === "file") {
    return [path];
  }

  return files
    .filter(
      (file) =>
        file.kind === "file" &&
        (file.path === path || file.path.startsWith(`${path}/`)),
    )
    .map((file) => file.path)
    .slice(0, CHAT_ATTACH_FILE_CAP);
}

function toTerminalCwd(folderPath: string) {
  return folderPath ? `/${folderPath}` : "/";
}

function isModKey(event: KeyboardEvent | React.KeyboardEvent) {
  return event.ctrlKey || event.metaKey;
}

export function WorkspaceFileTree({ projectId }: WorkspaceFileTreeProps) {
  const files = useProjectFiles(projectId);
  const project = useProject({ projectId });
  const access = useProjectAccess(projectId);
  const canEdit = access?.canEdit ?? false;
  const seedDefaults = useSeedProjectFiles();
  const createFile = useCreateProjectFile();
  const moveFile = useMoveProjectFile();
  const duplicateFile = useDuplicateProjectFile();
  const router = useRouter();
  const pathname = usePathname();
  const [collapseKey, setCollapseKey] = useState(0);
  const [openFolderIds, setOpenFolderIds] = useState<Set<Id<"projectFiles">>>(
    new Set(),
  );
  const [focusedId, setFocusedId] = useState<Id<"projectFiles"> | null>(null);
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null);
  const [pendingRenameId, setPendingRenameId] =
    useState<Id<"projectFiles"> | null>(null);
  const [pendingDeleteId, setPendingDeleteId] =
    useState<Id<"projectFiles"> | null>(null);

  const treeClipboard = useWorkspaceStore((s) => s.treeClipboard);
  const setTreeClipboard = useWorkspaceStore((s) => s.setTreeClipboard);
  const clearTreeClipboard = useWorkspaceStore((s) => s.clearTreeClipboard);
  const setLeftPanelView = useWorkspaceStore((s) => s.setLeftPanelView);
  const setPendingChatAttachPaths = useWorkspaceStore(
    (s) => s.setPendingChatAttachPaths,
  );
  const requestNewAiChat = useWorkspaceStore((s) => s.requestNewAiChat);
  const requestTerminalCwd = useWorkspaceStore((s) => s.requestTerminalCwd);
  const setAiPanelOpen = useWorkspaceStore((s) => s.toggleAiPanel);

  const tree = useMemo(
    () => (files ? buildFileTree(files) : undefined),
    [files],
  );

  const canPaste = Boolean(
    treeClipboard && treeClipboard.projectId === projectId,
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

  const startCreate = useCallback(
    (kind: "file" | "folder", parentId?: Id<"projectFiles">) => {
      setPendingCreate({ kind, parentId });
      if (parentId) {
        setOpenFolderIds((current) => {
          if (current.has(parentId)) return current;
          const next = new Set(current);
          next.add(parentId);
          return next;
        });
      }
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

  const copyPathToClipboard = useCallback(async (path: string, label: string) => {
    try {
      await navigator.clipboard.writeText(path);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  }, []);

  const cutItem = useCallback(
    (path: string) => {
      setTreeClipboard({ mode: "cut", projectId, path });
      toast.message("Ready to move");
    },
    [projectId, setTreeClipboard],
  );

  const copyItem = useCallback(
    (path: string) => {
      setTreeClipboard({ mode: "copy", projectId, path });
      toast.message("Ready to paste");
    },
    [projectId, setTreeClipboard],
  );

  const pasteInto = useCallback(
    async (targetParentId?: Id<"projectFiles">) => {
      if (!treeClipboard || treeClipboard.projectId !== projectId) {
        return;
      }

      try {
        if (treeClipboard.mode === "cut") {
          const newPath = await moveFile({
            projectId: projectId as Id<"projects">,
            path: treeClipboard.path,
            newParentId: targetParentId,
          });
          clearTreeClipboard();

          const activePath = pathname.match(/\/files\/(.+)$/)?.[1];
          if (
            activePath &&
            (decodeURIComponent(activePath) === treeClipboard.path ||
              decodeURIComponent(activePath).startsWith(
                `${treeClipboard.path}/`,
              ))
          ) {
            const suffix = decodeURIComponent(activePath).slice(
              treeClipboard.path.length,
            );
            router.push(`/projects/${projectId}/files/${newPath}${suffix}`);
          }

          toast.success("Moved");
        } else {
          const sourceKind = files?.find(
            (file) => file.path === treeClipboard.path,
          )?.kind;
          const result = await duplicateFile({
            projectId: projectId as Id<"projects">,
            path: treeClipboard.path,
            targetParentId: targetParentId ?? null,
          });
          toast.success("Pasted");
          if (sourceKind === "file") {
            router.push(`/projects/${projectId}/files/${result.path}`);
          }
        }

        if (targetParentId) {
          setOpenFolderIds((current) => {
            if (current.has(targetParentId)) return current;
            const next = new Set(current);
            next.add(targetParentId);
            return next;
          });
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to paste",
        );
      }
    },
    [
      clearTreeClipboard,
      duplicateFile,
      files,
      moveFile,
      pathname,
      projectId,
      router,
      treeClipboard,
    ],
  );

  const duplicateItem = useCallback(
    async (path: string) => {
      try {
        const sourceKind = files?.find((file) => file.path === path)?.kind;
        const result = await duplicateFile({
          projectId: projectId as Id<"projects">,
          path,
        });
        toast.success("Duplicated");
        if (sourceKind === "file") {
          router.push(`/projects/${projectId}/files/${result.path}`);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to duplicate",
        );
      }
    },
    [duplicateFile, files, projectId, router],
  );

  const openInTerminal = useCallback(
    (folderPath: string) => {
      requestTerminalCwd(toTerminalCwd(folderPath));
    },
    [requestTerminalCwd],
  );

  const findInFolder = useCallback(() => {
    setLeftPanelView("search");
  }, [setLeftPanelView]);

  const attachToChat = useCallback(
    (path: string, kind: "file" | "folder", asNewChat: boolean) => {
      if (!files) return;
      const paths = collectAttachPaths(files, path, kind);
      if (paths.length === 0) {
        toast.message("No files to attach");
        return;
      }

      const state = useWorkspaceStore.getState();
      if (!state.aiPanelOpen) {
        setAiPanelOpen();
      }
      if (asNewChat) {
        requestNewAiChat();
      }
      setPendingChatAttachPaths(paths);
      toast.success(
        paths.length === 1
          ? "Added to chat"
          : `Added ${paths.length} files to chat`,
      );
    },
    [files, requestNewAiChat, setAiPanelOpen, setPendingChatAttachPaths],
  );

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
      const current =
        currentIndex >= 0 ? visibleItems[currentIndex] : undefined;

      if (isModKey(event) && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === "x" && current) {
          event.preventDefault();
          cutItem(current.node.path);
          return;
        }
        if (key === "c" && current) {
          event.preventDefault();
          copyItem(current.node.path);
          return;
        }
        if (key === "v") {
          event.preventDefault();
          const targetParentId =
            current?.node.kind === "folder"
              ? current.node.id
              : current?.parentId;
          void pasteInto(targetParentId);
          return;
        }
      }

      if (event.key === "F2" && current) {
        event.preventDefault();
        setPendingRenameId(current.node.id);
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        current &&
        !isModKey(event)
      ) {
        event.preventDefault();
        setPendingDeleteId(current.node.id);
        return;
      }

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

          const item = visibleItems[currentIndex];
          if (item.node.kind !== "folder") {
            return;
          }

          event.preventDefault();
          if (!openFolderIds.has(item.node.id)) {
            toggleFolder(item.node.id);
            return;
          }

          const next = visibleItems[currentIndex + 1];
          if (next?.parentId === item.node.id) {
            setFocusedId(next.node.id);
          }
          break;
        }
        case "ArrowLeft": {
          if (currentIndex < 0) {
            return;
          }

          const item = visibleItems[currentIndex];
          event.preventDefault();

          if (
            item.node.kind === "folder" &&
            openFolderIds.has(item.node.id)
          ) {
            toggleFolder(item.node.id);
            return;
          }

          if (item.parentId) {
            setFocusedId(item.parentId);
          }
          break;
        }
      }
    },
    [
      copyItem,
      cutItem,
      focusedId,
      openFolderIds,
      pasteInto,
      toggleFolder,
      tree,
    ],
  );

  useEffect(() => {
    // Only backfill legacy empty projects that were never initialized.
    // Empty templates set syncedAt without files; GitHub imports must not be seeded.
    if (
      files !== undefined &&
      files.length === 0 &&
      project &&
      !project.syncedAt &&
      project.importStatus !== "importing" &&
      project.source !== "github" &&
      project.templateId !== "empty"
    ) {
      void seedDefaults({ projectId: projectId as Id<"projects"> });
    }
  }, [files, project, projectId, seedDefaults]);

  const renderPendingCreate = (
    parentId: Id<"projectFiles"> | undefined,
    depth: number,
  ) => {
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

  const backgroundMenuProps: FileTreeMenuContentProps = {
    isFolder: true,
    showItemActions: false,
    canPaste: canPaste && canEdit,
    onNewFile: () => {
      if (canEdit) startCreate("file");
    },
    onNewFolder: () => {
      if (canEdit) startCreate("folder");
    },
    onPaste: () => {
      if (canEdit) void pasteInto(undefined);
    },
    onOpen: () => {},
    onOpenInTerminal: () => openInTerminal(""),
    onAddToChat: () => {},
    onAddToNewChat: () => {},
    onFindInFolder: findInFolder,
    onCut: () => {},
    onCopy: () => {},
    onDuplicate: () => {},
    onCopyPath: () => {},
    onCopyRelativePath: () => {},
    onRename: () => {},
    onDelete: () => {},
    canEdit,
  };

  if (files === undefined) {
    return (
      <p className="px-3 py-2 text-[11px] text-ws-text-muted">Loading files…</p>
    );
  }

  if (tree?.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <TreeToolbar
          canEdit={canEdit}
          onNewFile={() => startCreate("file")}
          onNewFolder={() => startCreate("folder")}
          onCollapseAll={collapseAll}
        />
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex min-h-24 flex-1 flex-col p-1.5">
              {canEdit ? renderPendingCreate(undefined, 0) : null}
              {!pendingCreate ? (
                <p className="px-2 py-2 text-[11px] text-ws-text-muted">No files yet</p>
              ) : null}
            </div>
          </ContextMenuTrigger>
          <FileTreeMenuContent {...backgroundMenuProps} />
        </ContextMenu>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <TreeToolbar
        canEdit={canEdit}
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
                canPaste={canPaste && canEdit}
                canEdit={canEdit}
                cutPath={
                  treeClipboard?.mode === "cut" &&
                  treeClipboard.projectId === projectId
                    ? treeClipboard.path
                    : null
                }
                pendingRenameId={pendingRenameId}
                onPendingRenameHandled={() => setPendingRenameId(null)}
                pendingDeleteId={pendingDeleteId}
                onPendingDeleteHandled={() => setPendingDeleteId(null)}
                onCut={cutItem}
                onCopy={copyItem}
                onPaste={pasteInto}
                onDuplicate={duplicateItem}
                onCopyPath={(path) => void copyPathToClipboard(path, "Path")}
                onCopyRelativePath={(path) =>
                  void copyPathToClipboard(path, "Relative path")
                }
                onOpenInTerminal={openInTerminal}
                onFindInFolder={findInFolder}
                onAddToChat={(path, kind) => attachToChat(path, kind, false)}
                onAddToNewChat={(path, kind) => attachToChat(path, kind, true)}
              />
            ))}
            {canEdit ? renderPendingCreate(undefined, 0) : null}
          </nav>
        </ContextMenuTrigger>
        <FileTreeMenuContent {...backgroundMenuProps} />
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
  canEdit,
}: {
  onNewFile: () => void;
  onNewFolder: () => void;
  onCollapseAll: () => void;
  canEdit: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5 border-b border-ws-border-subtle px-1 py-1">
      {canEdit ? (
        <>
          <TreeToolbarButton label="New File" onClick={onNewFile}>
            <FilePlusIcon className="size-3.5" />
          </TreeToolbarButton>
          <TreeToolbarButton label="New Folder" onClick={onNewFolder}>
            <FolderPlusIcon className="size-3.5" />
          </TreeToolbarButton>
        </>
      ) : null}
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
      className="size-6 rounded-sm text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
    >
      {children}
    </Button>
  );
}

type FileTreeMenuContentProps = {
  isFolder: boolean;
  canPaste: boolean;
  canEdit?: boolean;
  onNewFile: () => void;
  onNewFolder: () => void;
  onOpen: () => void;
  onOpenInTerminal: () => void;
  onAddToChat: () => void;
  onAddToNewChat: () => void;
  onFindInFolder: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onCopyPath: () => void;
  onCopyRelativePath: () => void;
  onRename: () => void;
  onDelete: () => void;
  menuType?: "context" | "dropdown";
  showItemActions?: boolean;
};

function FileTreeMenuContent({
  isFolder,
  canPaste,
  canEdit = true,
  onNewFile,
  onNewFolder,
  onOpen,
  onOpenInTerminal,
  onAddToChat,
  onAddToNewChat,
  onFindInFolder,
  onCut,
  onCopy,
  onPaste,
  onDuplicate,
  onCopyPath,
  onCopyRelativePath,
  onRename,
  onDelete,
  menuType = "context",
  showItemActions = true,
}: FileTreeMenuContentProps) {
  const itemClassName =
    "cursor-default gap-0 py-1 text-[12px] text-ws-text focus:bg-ws-menu-focus focus:text-white data-[disabled]:text-ws-text-muted";
  const destructiveClassName =
    "cursor-default gap-0 py-1 text-[12px] text-ws-text focus:bg-ws-danger-focus focus:text-ws-danger";
  const shortcutClassName = "pl-6 text-[11px] tracking-normal text-ws-text-muted";
  const separatorClassName = "mx-0 my-1 bg-ws-border";

  const Item = menuType === "dropdown" ? DropdownMenuItem : ContextMenuItem;
  const Separator =
    menuType === "dropdown" ? DropdownMenuSeparator : ContextMenuSeparator;
  const Shortcut =
    menuType === "dropdown" ? DropdownMenuShortcut : ContextMenuShortcut;
  const Content =
    menuType === "dropdown" ? DropdownMenuContent : ContextMenuContent;

  return (
    <Content className="min-w-56 rounded-md border-ws-border bg-ws-hover p-1 text-ws-text shadow-lg">
      {isFolder ? (
        <>
          {canEdit ? (
            <>
              <Item onClick={onNewFile} className={itemClassName}>
                New File...
                <Shortcut className={shortcutClassName}>A</Shortcut>
              </Item>
              <Item onClick={onNewFolder} className={itemClassName}>
                New Folder...
                <Shortcut className={shortcutClassName}>F</Shortcut>
              </Item>
              <Separator className={separatorClassName} />
            </>
          ) : null}
          {showItemActions ? (
            <>
              <Item onClick={onOpenInTerminal} className={itemClassName}>
                Open in Integrated Terminal
              </Item>
              <Separator className={separatorClassName} />
              <Item onClick={onAddToChat} className={itemClassName}>
                Add Directory to Chat
              </Item>
              <Item onClick={onAddToNewChat} className={itemClassName}>
                Add Directory to New Chat
              </Item>
              <Separator className={separatorClassName} />
              <Item onClick={onFindInFolder} className={itemClassName}>
                Find in Folder...
                <Shortcut className={shortcutClassName}>Shift+Alt+F</Shortcut>
              </Item>
              <Separator className={separatorClassName} />
            </>
          ) : (
            <>
              <Item onClick={onOpenInTerminal} className={itemClassName}>
                Open in Integrated Terminal
              </Item>
              <Separator className={separatorClassName} />
              <Item onClick={onFindInFolder} className={itemClassName}>
                Find in Folder...
                <Shortcut className={shortcutClassName}>Shift+Alt+F</Shortcut>
              </Item>
              <Separator className={separatorClassName} />
            </>
          )}
        </>
      ) : (
        <>
          <Item onClick={onOpen} className={itemClassName}>
            Open
          </Item>
          <Separator className={separatorClassName} />
          <Item onClick={onAddToChat} className={itemClassName}>
            Add File to Chat
          </Item>
          <Item onClick={onAddToNewChat} className={itemClassName}>
            Add File to New Chat
          </Item>
          <Separator className={separatorClassName} />
        </>
      )}

      {showItemActions ? (
        <>
          {canEdit ? (
            <Item onClick={onCut} className={itemClassName}>
              Cut
              <Shortcut className={shortcutClassName}>X</Shortcut>
            </Item>
          ) : null}
          <Item onClick={onCopy} className={itemClassName}>
            Copy
            <Shortcut className={shortcutClassName}>Y</Shortcut>
          </Item>
          {canEdit ? (
            <Item
              onClick={onPaste}
              disabled={!canPaste}
              className={itemClassName}
            >
              Paste
              <Shortcut className={shortcutClassName}>P</Shortcut>
            </Item>
          ) : null}
          {canEdit && !isFolder ? (
            <Item onClick={onDuplicate} className={itemClassName}>
              Duplicate
            </Item>
          ) : null}
          <Separator className={separatorClassName} />
          <Item onClick={onCopyPath} className={itemClassName}>
            Copy Path
            <Shortcut className={shortcutClassName}>Shift+Alt+C</Shortcut>
          </Item>
          <Item onClick={onCopyRelativePath} className={itemClassName}>
            Copy Relative Path
            <Shortcut className={shortcutClassName}>
              Ctrl+M Ctrl+Shift+C
            </Shortcut>
          </Item>
          {canEdit ? (
            <>
              <Separator className={separatorClassName} />
              <Item onClick={onRename} className={itemClassName}>
                Rename...
                <Shortcut className={shortcutClassName}>R</Shortcut>
              </Item>
              <Item
                variant={menuType === "context" ? "destructive" : undefined}
                onClick={onDelete}
                className={destructiveClassName}
              >
                Delete
                <Shortcut className={shortcutClassName}>Delete</Shortcut>
              </Item>
            </>
          ) : null}
        </>
      ) : canPaste && canEdit ? (
        <Item onClick={onPaste} className={itemClassName}>
          Paste
          <Shortcut className={shortcutClassName}>P</Shortcut>
        </Item>
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
  canPaste: boolean;
  canEdit: boolean;
  cutPath: string | null;
  pendingRenameId: Id<"projectFiles"> | null;
  onPendingRenameHandled: () => void;
  pendingDeleteId: Id<"projectFiles"> | null;
  onPendingDeleteHandled: () => void;
  onCut: (path: string) => void;
  onCopy: (path: string) => void;
  onPaste: (targetParentId?: Id<"projectFiles">) => Promise<void>;
  onDuplicate: (path: string) => Promise<void>;
  onCopyPath: (path: string) => void;
  onCopyRelativePath: (path: string) => void;
  onOpenInTerminal: (folderPath: string) => void;
  onFindInFolder: () => void;
  onAddToChat: (path: string, kind: "file" | "folder") => void;
  onAddToNewChat: (path: string, kind: "file" | "folder") => void;
  parentId?: Id<"projectFiles">;
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
  canPaste,
  canEdit,
  cutPath,
  pendingRenameId,
  onPendingRenameHandled,
  pendingDeleteId,
  onPendingDeleteHandled,
  onCut,
  onCopy,
  onPaste,
  onDuplicate,
  onCopyPath,
  onCopyRelativePath,
  onOpenInTerminal,
  onFindInFolder,
  onAddToChat,
  onAddToNewChat,
  parentId,
}: FileTreeItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const renameFile = useRenameProjectFile();
  const deleteFile = useDeleteProjectFile();

  const isPendingChild = pendingCreate?.parentId === node.id;
  const isFolder = node.kind === "folder";
  const open = isFolder && (openFolderIds.has(node.id) || isPendingChild);
  const isFocused = focusedId === node.id;
  const isCut =
    cutPath === node.path ||
    (cutPath !== null && node.path.startsWith(`${cutPath}/`));
  const isRenameRequested = pendingRenameId === node.id;
  const isDeleteRequested = pendingDeleteId === node.id;
  const [manualRenaming, setManualRenaming] = useState(false);
  const renaming = manualRenaming || isRenameRequested;
  const [renameValue, setRenameValue] = useState(node.name);
  const [renameRequestKey, setRenameRequestKey] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteDialogOpen = deleteOpen || isDeleteRequested;
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

  const currentRenameRequestKey = isRenameRequested ? node.id : null;
  if (currentRenameRequestKey !== renameRequestKey) {
    setRenameRequestKey(currentRenameRequestKey);
    if (currentRenameRequestKey) {
      setRenameValue(node.name);
    }
  }

  const startRename = () => {
    setRenameValue(node.name);
    setManualRenaming(true);
  };

  const stopRename = () => {
    setManualRenaming(false);
    if (isRenameRequested) {
      onPendingRenameHandled();
    }
  };

  const commitRename = async () => {
    const name = renameValue.trim();
    stopRename();
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
      if (isDeleteRequested) {
        onPendingDeleteHandled();
      }
    }
  };

  const setDeleteDialogOpen = (open: boolean) => {
    setDeleteOpen(open);
    if (!open && isDeleteRequested) {
      onPendingDeleteHandled();
    }
  };

  const pasteTargetId = isFolder ? node.id : parentId;

  const menuProps: FileTreeMenuContentProps = {
    isFolder,
    canPaste,
    canEdit,
    onNewFile: () => onStartCreate("file", isFolder ? node.id : undefined),
    onNewFolder: () => onStartCreate("folder", isFolder ? node.id : undefined),
    onOpen: () => {
      if (!isFolder) {
        router.push(href);
      }
    },
    onOpenInTerminal: () => onOpenInTerminal(node.path),
    onAddToChat: () => onAddToChat(node.path, node.kind),
    onAddToNewChat: () => onAddToNewChat(node.path, node.kind),
    onFindInFolder,
    onCut: () => onCut(node.path),
    onCopy: () => onCopy(node.path),
    onPaste: () => void onPaste(pasteTargetId),
    onDuplicate: () => void onDuplicate(node.path),
    onCopyPath: () => onCopyPath(node.path),
    onCopyRelativePath: () => onCopyRelativePath(node.path),
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
        "flex min-w-0 flex-1 items-center gap-1 rounded-sm py-0.5 pr-1 text-left text-[12px] text-ws-text-secondary hover:bg-ws-hover focus:outline-none focus-visible:ring-1 focus-visible:ring-ws-accent",
        isFocused && "bg-ws-hover text-ws-text",
        isCut && "opacity-50",
      )}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      {open ? (
        <ChevronDownIcon className="size-3 shrink-0 text-ws-text-muted" />
      ) : (
        <ChevronRightIcon className="size-3 shrink-0 text-ws-text-muted" />
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
          onCancel={stopRename}
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
        onCancel={stopRename}
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
        "flex min-w-0 flex-1 items-center gap-1 rounded-sm py-0.5 pr-1 text-[12px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ws-accent",
        active || isFocused
          ? "bg-ws-hover text-ws-text"
          : "text-ws-text-muted hover:bg-ws-hover hover:text-ws-text",
        isCut && "opacity-50",
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
              (menuOpen || active) && "bg-ws-hover/60",
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
                      "mr-0.5 size-5 shrink-0 rounded-sm text-ws-text-muted opacity-0 hover:bg-ws-border hover:text-ws-text group-hover:opacity-100",
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
              canPaste={canPaste}
              canEdit={canEdit}
              cutPath={cutPath}
              pendingRenameId={pendingRenameId}
              onPendingRenameHandled={onPendingRenameHandled}
              pendingDeleteId={pendingDeleteId}
              onPendingDeleteHandled={onPendingDeleteHandled}
              onCut={onCut}
              onCopy={onCopy}
              onPaste={onPaste}
              onDuplicate={onDuplicate}
              onCopyPath={onCopyPath}
              onCopyRelativePath={onCopyRelativePath}
              onOpenInTerminal={onOpenInTerminal}
              onFindInFolder={onFindInFolder}
              onAddToChat={onAddToChat}
              onAddToNewChat={onAddToNewChat}
              parentId={node.id}
            />
          ))}
          {renderPendingCreate(node.id, depth + 1)}
        </>
      ) : null}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-ws-border bg-ws-panel text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {node.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-text-muted">
              {isFolder
                ? "This will permanently delete this folder and all its contents."
                : "This will permanently delete this file."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-ws-border bg-ws-hover text-ws-text hover:bg-ws-border">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void onDelete()}
              className="bg-ws-danger-bg text-white hover:bg-ws-danger-bg-hover"
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
      className="h-5 min-w-0 flex-1 border-ws-border bg-ws-bg px-1 py-0 text-[12px] text-ws-text focus-visible:ring-1 focus-visible:ring-ws-accent"
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
}
