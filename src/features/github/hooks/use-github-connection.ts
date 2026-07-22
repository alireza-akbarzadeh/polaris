"use client";

import { useUser } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";

export function useGitHubConnection() {
  const connection = useQuery(api.github.getConnection);
  const syncConnection = useAction(api.github.syncConnection);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const hasSynced = useRef(false);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      return await syncConnection({});
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sync GitHub";
      setSyncError(message);
      return { connected: false as const };
    } finally {
      setIsSyncing(false);
    }
  }, [syncConnection]);

  useEffect(() => {
    if (hasSynced.current) {
      return;
    }
    hasSynced.current = true;
    void sync();
  }, [sync]);

  return {
    connection,
    isConnected: Boolean(connection),
    isLoading: connection === undefined || isSyncing,
    syncError,
    sync,
  };
}

export function useConnectGitHub() {
  const { user, isLoaded } = useUser();
  const syncConnection = useAction(api.github.syncConnection);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsConnecting(true);
    try {
      await user.createExternalAccount({
        strategy: "oauth_github",
        redirectUrl: window.location.href,
      });
      await syncConnection({});
    } finally {
      setIsConnecting(false);
    }
  }, [user, syncConnection]);

  return {
    connect,
    isConnecting,
    isReady: isLoaded && Boolean(user),
  };
}

export function useCloneFromGitHub() {
  const cloneFromGitHub = useAction(api.githubImport.cloneFromGitHub);
  const [isCloning, setIsCloning] = useState(false);

  const clone = useCallback(
    async (args: { repoUrl: string; branch?: string; name?: string }) => {
      setIsCloning(true);
      try {
        return await cloneFromGitHub(args);
      } finally {
        setIsCloning(false);
      }
    },
    [cloneFromGitHub],
  );

  return { clone, isCloning };
}
