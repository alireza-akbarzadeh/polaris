"use client";

import Image from "next/image";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useConnectGitHub,
  useGitHubConnection,
} from "@/features/github/hooks/use-github-connection";
import { cn } from "@/lib/utils";

export function GitHubConnectionStatus({ className }: { className?: string }) {
  const { connection, isConnected, isLoading, syncError } = useGitHubConnection();
  const { connect, isConnecting, isReady } = useConnectGitHub();

  if (isLoading) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-muted-foreground",
          className,
        )}
      >
        <Loader2Icon className="size-3.5 animate-spin opacity-70" />
        Checking GitHub…
      </span>
    );
  }

  if (isConnected && connection) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-muted-foreground",
          className,
        )}
      >
        <Image
          src="/images/github.png"
          alt=""
          width={12}
          height={12}
          className="size-3.5 opacity-70 dark:invert"
        />
        @{connection.username}
      </span>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Image
          src="/images/github.png"
          alt=""
          width={12}
          height={12}
          className="size-3.5 opacity-70 dark:invert"
        />
        GitHub not connected
      </span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        disabled={!isReady || isConnecting}
        onClick={() => void connect()}
        className="h-6 px-2 text-[11px]"
      >
        {isConnecting ? "Connecting…" : "Connect"}
      </Button>
      {syncError ? (
        <span className="max-w-40 truncate text-[10px] text-destructive">
          {syncError}
        </span>
      ) : null}
    </div>
  );
}
