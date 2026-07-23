"use client";

import { useAction } from "convex/react";
import { useCallback, useRef } from "react";

import { isActionCancelled } from "@/components/confirm-dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCommitAndPush } from "@/features/github/hooks/use-commit-and-push";
import {
  useGitBranches,
  usePullFromGitHub,
} from "@/features/github/hooks/use-git-sync";
import { useInitializeGitRepo } from "@/features/github/hooks/use-initialize-git-repo";
import { parseConvexErrorMessage } from "@/features/github/lib/github-errors";
import { useProject } from "@/features/projects/hooks/use-projects";
import {
  useChangedFiles,
  useProjectFiles,
} from "@/features/workspace/hooks/use-project-files";
import type {
  ShellContext,
  ShellHandlers,
} from "@/features/workspace/lib/workspace-shell";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

/**
 * Stable shell context + git handlers for the terminal.
 * Refs keep the xterm session from remounting when React data updates.
 */
export function useTerminalShell(projectId: string) {
  const project = useProject({ projectId });
  const files = useProjectFiles(projectId);
  const changedFiles = useChangedFiles(projectId);
  const { initialize } = useInitializeGitRepo(projectId);
  const { pull } = usePullFromGitHub(projectId);
  const { push } = useCommitAndPush(projectId);
  const { loadBranches, checkout, createBranch } = useGitBranches(projectId);
  const listCommits = useAction(api.githubHistory.listCommits);
  const openGitInitDialog = useWorkspaceStore((s) => s.openGitInitDialog);

  const projectRef = useRef(project);
  const filesRef = useRef(files);
  const changedFilesRef = useRef(changedFiles);
  projectRef.current = project;
  filesRef.current = files;
  changedFilesRef.current = changedFiles;

  const getContext = useCallback((cwd: string): ShellContext | null => {
    const currentProject = projectRef.current;
    const currentFiles = filesRef.current;
    if (!currentProject || currentFiles === undefined) return null;

    return {
      project: currentProject,
      files: currentFiles,
      changedPaths: new Set(
        changedFilesRef.current?.map((file) => file.path) ?? [],
      ),
      cwd,
    };
  }, []);

  const createHandlers = useCallback(
    (writeln: (line: string) => void): ShellHandlers => ({
      onOpenGitInitDialog: openGitInitDialog,
      onGitInit: async (repoName) => {
        writeln("Initializing GitHub repository…");
        const result = await initialize({ repoName });
        return [
          `Initialized empty Git repository in ${result.repoUrl}`,
          `Pushed ${result.filesPushed} file${result.filesPushed === 1 ? "" : "s"} (${result.commitSha.slice(0, 7)})`,
        ].join("\r\n");
      },
      onGitPull: async () => {
        writeln("Pulling from GitHub…");
        try {
          const result = await pull();
          return `Updated ${result.fileCount} file${result.fileCount === 1 ? "" : "s"} from ${result.branch} (${result.commitSha.slice(0, 7)})`;
        } catch (error) {
          if (isActionCancelled(error)) throw error;
          throw new Error(
            parseConvexErrorMessage(error, "Failed to pull from GitHub"),
          );
        }
      },
      onGitCommitPush: async (message) => {
        writeln("Committing and pushing…");
        const result = await push(message);
        return `Pushed ${result.filesPushed} file${result.filesPushed === 1 ? "" : "s"} (${result.commitSha.slice(0, 7)})`;
      },
      onGitBranchList: async () => {
        const branches = await loadBranches();
        if (branches.length === 0) return "(no branches)";
        return branches
          .map((b) => (b.isCurrent ? `* ${b.name}` : `  ${b.name}`))
          .join("\r\n");
      },
      onGitCheckout: async (branch) => {
        writeln(`Switching to ${branch}…`);
        try {
          const result = await checkout(branch);
          return `Switched to branch '${result.branch}' (${result.fileCount} files)`;
        } catch (error) {
          if (isActionCancelled(error)) throw error;
          throw new Error(
            parseConvexErrorMessage(error, "Failed to switch branch"),
          );
        }
      },
      onGitCreateBranch: async (name) => {
        writeln(`Creating branch ${name}…`);
        try {
          const result = await createBranch(name, { checkout: true });
          return result.checkedOut
            ? `Switched to a new branch '${result.name}'`
            : `Created branch '${result.name}'`;
        } catch (error) {
          if (isActionCancelled(error)) throw error;
          throw new Error(
            parseConvexErrorMessage(error, "Failed to create branch"),
          );
        }
      },
      onGitLog: async (limit) => {
        const commits = await listCommits({
          projectId: projectId as Id<"projects">,
          limit: limit ?? 15,
        });
        if (commits.length === 0) return "(no commits)";
        return commits
          .map((c) => `${c.shortSha}  ${c.message}  (${c.authorName})`)
          .join("\r\n");
      },
    }),
    [
      checkout,
      createBranch,
      initialize,
      listCommits,
      loadBranches,
      openGitInitDialog,
      projectId,
      pull,
      push,
    ],
  );

  return {
    projectName: project?.name ?? "project",
    getContext,
    createHandlers,
    filesRef,
  };
}
