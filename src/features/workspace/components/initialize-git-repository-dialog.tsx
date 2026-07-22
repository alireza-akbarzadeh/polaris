"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GitHubConnectionStatus } from "@/features/github/components/github-connection-status";
import { useConnectGitHub, useGitHubConnection } from "@/features/github/hooks/use-github-connection";
import { useInitializeGitRepo } from "@/features/github/hooks/use-initialize-git-repo";
import { useProject } from "@/features/projects/hooks/use-projects";
import { suggestRepoName } from "@/features/workspace/lib/git-repo-name";
import { GITHUB_REPO_SCOPE_MESSAGE } from "@/features/github/lib/github-scopes";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

type InitializeGitRepositoryDialogProps = {
  projectId: string;
};

export function InitializeGitRepositoryDialog({
  projectId,
}: InitializeGitRepositoryDialogProps) {
  const open = useWorkspaceStore((s) => s.gitInitDialogOpen);
  const closeGitInitDialog = useWorkspaceStore((s) => s.closeGitInitDialog);
  const project = useProject({ projectId });
  const { isConnected, hasRepoScope } = useGitHubConnection();
  const { connect, isConnecting: isAuthorizing } = useConnectGitHub();
  const { initialize, isInitializing, lastError, clearError } =
    useInitializeGitRepo(projectId);
  const [repoName, setRepoName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);

  useEffect(() => {
    if (open && project?.name) {
      setRepoName(suggestRepoName(project.name));
      clearError();
    }
  }, [open, project?.name, clearError]);

  const canInitialize =
    isConnected &&
    hasRepoScope &&
    repoName.trim().length > 0 &&
    !isInitializing;

  const onOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      closeGitInitDialog();
    }
  };

  const onInitialize = async () => {
    if (!canInitialize) {
      return;
    }

    try {
      await initialize({ repoName: repoName.trim(), isPrivate });
      closeGitInitDialog();
    } catch {
      // toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#4e5155] bg-[#2b2d30] text-[#dfdfdf] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Initialize Repository</DialogTitle>
          <DialogDescription className="text-[#9a9a9a]">
            Create a new GitHub repository and push your project files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <GitHubConnectionStatus className="text-[11px]" />
          <div className="space-y-1.5">
            <label
              htmlFor="git-repo-name"
              className="text-[11px] text-[#9a9a9a]"
            >
              Repository name
            </label>
            <Input
              id="git-repo-name"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="repository-name"
              className="h-8 border-[#4e5155] bg-[#1e1f22] text-[12px] text-[#dfdfdf] placeholder:text-[#6f737a] focus-visible:ring-[#3574f0]"
            />
          </div>
          <label className="flex items-center gap-2 text-[11px] text-[#9a9a9a]">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="accent-[#3574f0]"
            />
            Private repository
          </label>
          {!isConnected ? (
            <p className="text-[11px] text-[#787878]">
              Connect GitHub above before initializing a repository.
            </p>
          ) : !hasRepoScope ? (
            <div className="space-y-2">
              <p className="text-[11px] text-[#c9a227]">
                {GITHUB_REPO_SCOPE_MESSAGE}
              </p>
              <Button
                type="button"
                size="sm"
                disabled={isAuthorizing}
                onClick={() => void connect()}
                className="h-7 bg-[#3574f0] text-[11px] text-white hover:bg-[#2d5fd4]"
              >
                {isAuthorizing ? (
                  <>
                    <Loader2Icon className="size-3.5 animate-spin" />
                    Authorizing…
                  </>
                ) : (
                  "Grant Repository Access"
                )}
              </Button>
            </div>
          ) : null}
          {lastError ? (
            <p className="rounded-sm border border-[#5c2b29] bg-[#3a2323] px-2 py-1.5 text-[11px] text-[#ff8a85]">
              {lastError}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={closeGitInitDialog}
            className="text-[#bcbec4] hover:bg-[#3c3f41] hover:text-[#dfdfdf]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canInitialize}
            onClick={() => void onInitialize()}
            className="bg-[#3574f0] text-white hover:bg-[#2d5fd4] disabled:opacity-50"
          >
            {isInitializing ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                Initializing…
              </>
            ) : (
              "Initialize Repository"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
