"use client";

import {
  CheckIcon,
  GitBranchIcon,
  Loader2Icon,
  PlusIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGitBranches } from "@/features/github/hooks/use-git-sync";
import { cn } from "@/lib/utils";

type BranchRow = {
  name: string;
  protected: boolean;
  isCurrent: boolean;
};

type WorkspaceBranchPickerProps = {
  projectId: string;
  branch: string;
  changeCount?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export function WorkspaceBranchPicker({
  projectId,
  branch,
  changeCount = 0,
  open: controlledOpen,
  onOpenChange,
  className,
}: WorkspaceBranchPickerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const { loadBranches, checkout, createBranch, isLoading, isMutating } =
    useGitBranches(projectId);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  useEffect(() => {
    if (!open) {
      setCreating(false);
      setNewBranchName("");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const next = await loadBranches();
        if (!cancelled) setBranches(next);
      } catch {
        if (!cancelled) setBranches([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, loadBranches]);

  const onCheckout = async (name: string) => {
    if (name === branch) {
      setOpen(false);
      return;
    }
    try {
      await checkout(name);
      setOpen(false);
    } catch {
      // toast handled in hook
    }
  };

  const onCreate = async () => {
    const name = newBranchName.trim();
    if (!name) return;
    try {
      await createBranch(name, { checkout: true });
      setOpen(false);
    } catch {
      // toast handled in hook
    }
  };

  const busy = isLoading || isMutating;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex max-w-[220px] items-center gap-1.5 truncate rounded-sm px-1.5 py-0.5 transition-colors hover:bg-ws-hover hover:text-ws-text",
            changeCount > 0 && "text-ws-text",
            className,
          )}
          title="Switch branch"
        >
          {busy && open ? (
            <Loader2Icon className="size-3 shrink-0 animate-spin" />
          ) : (
            <GitBranchIcon className="size-3 shrink-0" />
          )}
          <span className="truncate">{branch}</span>
          {changeCount > 0 ? (
            <span className="shrink-0 text-ws-success">
              {changeCount} change{changeCount === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="shrink-0 text-ws-text-muted">✓ clean</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={6}
        className="w-72 border-ws-border bg-ws-panel p-0 text-ws-text"
      >
        {creating ? (
          <div className="space-y-2 p-3">
            <p className="text-[11px] font-medium text-ws-text">New Branch</p>
            <p className="text-[10px] text-ws-text-muted">
              From <span className="font-mono text-ws-text-secondary">{branch}</span>
            </p>
            <Input
              autoFocus
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onCreate();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setCreating(false);
                }
              }}
              placeholder="feature/my-branch"
              className="h-8 border-ws-border bg-ws-bg text-[12px] text-ws-text"
              disabled={isMutating}
            />
            <div className="flex items-center justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] text-ws-text-muted hover:bg-ws-hover hover:text-ws-text"
                onClick={() => setCreating(false)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 bg-ws-accent text-[11px] text-white hover:bg-ws-accent-hover"
                disabled={!newBranchName.trim() || isMutating}
                onClick={() => void onCreate()}
              >
                {isMutating ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  "Create & Checkout"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Command className="bg-transparent text-ws-text">
            <CommandInput
              placeholder="Filter branches…"
              className="h-9 text-[12px]"
            />
            <CommandList className="max-h-64">
              <CommandEmpty className="py-4 text-[11px] text-ws-text-muted">
                {isLoading ? "Loading branches…" : "No branches found"}
              </CommandEmpty>
              <CommandGroup heading="Branches">
                {branches.map((item) => (
                  <CommandItem
                    key={item.name}
                    value={item.name}
                    disabled={isMutating}
                    onSelect={() => void onCheckout(item.name)}
                    className="text-[12px] data-[selected=true]:bg-ws-hover data-[selected=true]:text-ws-text"
                  >
                    <GitBranchIcon className="size-3.5 text-ws-text-muted" />
                    <span className="truncate font-mono">{item.name}</span>
                    {item.isCurrent ? (
                      <CheckIcon className="ml-auto size-3.5 text-ws-accent" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator className="bg-ws-border" />
              <CommandGroup>
                <CommandItem
                  value="__new_branch__"
                  disabled={isMutating}
                  onSelect={() => setCreating(true)}
                  className="text-[12px] data-[selected=true]:bg-ws-hover data-[selected=true]:text-ws-text"
                >
                  <PlusIcon className="size-3.5" />
                  New Branch…
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}
