"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import {
  useCloneFromGitHub,
  useConnectGitHub,
  useGitHubConnection,
} from "@/features/github/hooks/use-github-connection";
import { parseConvexErrorMessage } from "@/features/github/lib/github-errors";

interface CloneFromGitHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloneFromGitHubDialog({
  open,
  onOpenChange,
}: CloneFromGitHubDialogProps) {
  const router = useRouter();
  const { isConnected, isLoading } = useGitHubConnection();
  const { connect, isConnecting } = useConnectGitHub();
  const { clone, isCloning } = useCloneFromGitHub();

  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [projectName, setProjectName] = useState("");

  const handleClone = async () => {
    if (!repoUrl.trim()) {
      toast.error("Enter a repository URL or owner/repo");
      return;
    }

    try {
      const projectId = await clone({
        repoUrl: repoUrl.trim(),
        branch: branch.trim() || "main",
        name: projectName.trim() || undefined,
      });
      toast.success("Repository cloned into Polaris");
      onOpenChange(false);
      router.push(`/projects/${projectId}`);
    } catch (error) {
      toast.error(
        parseConvexErrorMessage(error, "Failed to clone repository"),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image
              src="/images/github.png"
              alt=""
              width={18}
              height={18}
              className="size-4.5 dark:invert"
            />
            Clone from GitHub
          </DialogTitle>
          <DialogDescription>
            Import a repository into a new Polaris workspace using your Clerk
            GitHub connection.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Checking GitHub connection…
          </div>
        ) : !isConnected ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Connect your GitHub account through Clerk to clone private and
              public repositories you can access.
            </p>
            <Button
              type="button"
              className="w-full"
              disabled={isConnecting}
              onClick={() => void connect()}
            >
              {isConnecting ? "Redirecting to GitHub…" : "Connect GitHub"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="github-repo">Repository</Label>
              <Input
                id="github-repo"
                placeholder="owner/repo or https://github.com/owner/repo"
                value={repoUrl}
                onChange={(event) => setRepoUrl(event.target.value)}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="github-branch">Branch</Label>
                <Input
                  id="github-branch"
                  placeholder="main"
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-project-name">Project name</Label>
                <Input
                  id="github-project-name"
                  placeholder="Optional"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {isConnected ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCloning}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleClone()}
              disabled={isCloning || !repoUrl.trim()}
            >
              {isCloning ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Cloning…
                </>
              ) : (
                "Clone repository"
              )}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
