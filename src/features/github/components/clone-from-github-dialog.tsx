"use client";

import {
  CheckIcon,
  ChevronsUpDownIcon,
  GitBranchIcon,
  Loader2Icon,
  LockIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useCloneFromGitHub,
  useConnectGitHub,
  useGitHubConnection,
} from "@/features/github/hooks/use-github-connection";
import {
  useGitHubRepoBranches,
  useGitHubRepositories,
  type GitHubBranchOption,
  type GitHubRepository,
} from "@/features/github/hooks/use-github-repos";
import { parseConvexErrorMessage } from "@/features/github/lib/github-errors";
import { cn } from "@/lib/utils";

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
  const { loadRepositories, isLoading: isLoadingRepos } =
    useGitHubRepositories();
  const { loadBranches, isLoading: isLoadingBranches } =
    useGitHubRepoBranches();

  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [hasMoreRepos, setHasMoreRepos] = useState(false);
  const [repoPage, setRepoPage] = useState(1);
  const [branches, setBranches] = useState<GitHubBranchOption[]>([]);

  const [repoUrl, setRepoUrl] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(
    null,
  );
  const [branch, setBranch] = useState("main");
  const [projectName, setProjectName] = useState("");

  const [repoPickerOpen, setRepoPickerOpen] = useState(false);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);

  const resetForm = () => {
    setRepoUrl("");
    setSelectedRepo(null);
    setBranch("main");
    setProjectName("");
    setBranches([]);
    setRepoPickerOpen(false);
    setBranchPickerOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetForm();
    }
    onOpenChange(next);
  };

  useEffect(() => {
    if (!open || !isConnected) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const result = await loadRepositories({ page: 1 });
        if (cancelled) return;
        setRepositories(result.repositories);
        setHasMoreRepos(result.hasMore);
        setRepoPage(1);
      } catch {
        if (!cancelled) {
          setRepositories([]);
          setHasMoreRepos(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isConnected, loadRepositories]);

  const selectRepository = (repo: GitHubRepository) => {
    setSelectedRepo(repo);
    setRepoUrl(repo.fullName);
    setBranch(repo.defaultBranch);
    setProjectName(repo.name);
    setRepoPickerOpen(false);
    setBranches([]);

    void (async () => {
      try {
        const result = await loadBranches(repo.fullName);
        setBranches(result.branches);
        if (result.defaultBranch) {
          setBranch(result.defaultBranch);
        }
      } catch {
        setBranches([]);
      }
    })();
  };

  const loadMoreRepositories = async () => {
    const nextPage = repoPage + 1;
    try {
      const result = await loadRepositories({ page: nextPage });
      setRepositories((prev) => {
        const seen = new Set(prev.map((repo) => repo.fullName));
        const merged = [...prev];
        for (const repo of result.repositories) {
          if (!seen.has(repo.fullName)) {
            merged.push(repo);
          }
        }
        return merged;
      });
      setHasMoreRepos(result.hasMore);
      setRepoPage(nextPage);
    } catch {
      // toast handled in hook
    }
  };

  const refreshBranchesForTypedRepo = async () => {
    const trimmed = repoUrl.trim();
    if (!trimmed) {
      toast.error("Select or enter a repository first");
      return;
    }

    try {
      const result = await loadBranches(trimmed);
      setBranches(result.branches);
      if (result.defaultBranch) {
        setBranch(result.defaultBranch);
      }
      setBranchPickerOpen(true);
    } catch {
      setBranches([]);
    }
  };

  const handleClone = async () => {
    if (!repoUrl.trim()) {
      toast.error("Select a repository or enter owner/repo");
      return;
    }

    try {
      const projectId = await clone({
        repoUrl: repoUrl.trim(),
        branch: branch.trim() || "main",
        name: projectName.trim() || undefined,
      });
      toast.success("Repository cloned into Polaris");
      resetForm();
      onOpenChange(false);
      router.push(`/projects/${projectId}`);
    } catch (error) {
      toast.error(
        parseConvexErrorMessage(error, "Failed to clone repository"),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
            Browse repositories and branches from your GitHub account via the
            GitHub API, then import into a Polaris workspace.
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
              Connect your GitHub account through Clerk to list repositories,
              pick branches, and clone private or public repos you can access.
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
              <Label>Repository</Label>
              <Popover open={repoPickerOpen} onOpenChange={setRepoPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={repoPickerOpen}
                    className="h-10 w-full justify-between font-normal"
                    disabled={isCloning}
                  >
                    <span className="truncate">
                      {selectedRepo?.fullName ||
                        repoUrl.trim() ||
                        "Select a repository…"}
                    </span>
                    {isLoadingRepos && repositories.length === 0 ? (
                      <Loader2Icon className="size-4 shrink-0 animate-spin opacity-60" />
                    ) : (
                      <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(32rem,calc(100vw-3rem))] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Filter repositories…" />
                    <CommandList className="max-h-72">
                      <CommandEmpty>
                        {isLoadingRepos
                          ? "Loading repositories…"
                          : "No repositories found"}
                      </CommandEmpty>
                      <CommandGroup heading="Your repositories">
                        {repositories.map((repo) => (
                          <CommandItem
                            key={repo.fullName}
                            value={`${repo.fullName} ${repo.description ?? ""}`}
                            onSelect={() => selectRepository(repo)}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-medium">
                                  {repo.fullName}
                                </span>
                                {repo.private ? (
                                  <LockIcon className="size-3 shrink-0 text-muted-foreground" />
                                ) : null}
                              </div>
                              {repo.description ? (
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {repo.description}
                                </p>
                              ) : null}
                            </div>
                            <CheckIcon
                              className={cn(
                                "ml-2 size-3.5 shrink-0",
                                selectedRepo?.fullName === repo.fullName
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {hasMoreRepos ? (
                        <div className="border-t p-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-full text-xs"
                            disabled={isLoadingRepos}
                            onClick={() => void loadMoreRepositories()}
                          >
                            {isLoadingRepos ? (
                              <Loader2Icon className="size-3.5 animate-spin" />
                            ) : (
                              "Load more"
                            )}
                          </Button>
                        </div>
                      ) : null}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Input
                id="github-repo"
                placeholder="Or type owner/repo"
                value={repoUrl}
                onChange={(event) => {
                  setRepoUrl(event.target.value);
                  setSelectedRepo(null);
                  setBranches([]);
                }}
                onBlur={() => {
                  if (repoUrl.trim() && !selectedRepo) {
                    void refreshBranchesForTypedRepo();
                  }
                }}
                disabled={isCloning}
              />
              <p className="text-[11px] text-muted-foreground">
                Showing repos from the GitHub API (owned, collaborator, and org).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Branch</Label>
                <Popover
                  open={branchPickerOpen}
                  onOpenChange={(next) => {
                    setBranchPickerOpen(next);
                    if (next && branches.length === 0 && repoUrl.trim()) {
                      void refreshBranchesForTypedRepo();
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={branchPickerOpen}
                      className="h-10 w-full justify-between font-normal"
                      disabled={isCloning || !repoUrl.trim()}
                    >
                      <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                        <GitBranchIcon className="size-3.5 shrink-0 opacity-60" />
                        <span className="truncate">{branch || "Select branch…"}</span>
                      </span>
                      {isLoadingBranches ? (
                        <Loader2Icon className="size-4 shrink-0 animate-spin opacity-60" />
                      ) : (
                        <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Filter branches…" />
                      <CommandList className="max-h-60">
                        <CommandEmpty>
                          {isLoadingBranches
                            ? "Loading branches…"
                            : "No branches found"}
                        </CommandEmpty>
                        <CommandGroup heading="Branches">
                          {branches.map((item) => (
                            <CommandItem
                              key={item.name}
                              value={item.name}
                              onSelect={() => {
                                setBranch(item.name);
                                setBranchPickerOpen(false);
                              }}
                            >
                              <GitBranchIcon className="size-3.5 text-muted-foreground" />
                              <span className="truncate font-mono text-[12px]">
                                {item.name}
                              </span>
                              <CheckIcon
                                className={cn(
                                  "ml-auto size-3.5",
                                  branch === item.name
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-project-name">Project name</Label>
                <Input
                  id="github-project-name"
                  placeholder="Optional"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  disabled={isCloning}
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
              onClick={() => handleOpenChange(false)}
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
