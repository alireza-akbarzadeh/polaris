"use client";

import { useUser } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";
import {
  GITHUB_REPO_SCOPES,
  hasGitHubRepoScope,
} from "@/features/github/lib/github-scopes";

function getGitHubExternalAccount(user: ReturnType<typeof useUser>["user"]) {
  return user?.externalAccounts.find((account) => account.provider === "github");
}

export function useGitHubConnection() {
  const { user } = useUser();
  const connection = useQuery(api.github.getConnection);
  const syncConnection = useAction(api.githubActions.syncConnection);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const hasSynced = useRef(false);

  const githubAccount = getGitHubExternalAccount(user);
  const hasRepoScope = hasGitHubRepoScope(githubAccount?.approvedScopes);

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
    hasRepoScope,
    isLoading: connection === undefined || isSyncing,
    syncError,
    sync,
  };
}

export function useConnectGitHub() {
  const { user, isLoaded } = useUser();
  const syncConnection = useAction(api.githubActions.syncConnection);
  const [isConnecting, setIsConnecting] = useState(false);

  const githubAccount = useMemo(
    () => getGitHubExternalAccount(user),
    [user],
  );
  const hasRepoScope = hasGitHubRepoScope(githubAccount?.approvedScopes);

  const connect = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsConnecting(true);
    try {
      const existing = getGitHubExternalAccount(user);

      if (existing) {
        const account = await existing.reauthorize({
          additionalScopes: [...GITHUB_REPO_SCOPES],
          redirectUrl: window.location.href,
        });
        const redirectUrl = account.verification?.externalVerificationRedirectURL;
        if (redirectUrl) {
          window.location.href = redirectUrl.href;
          return;
        }
      } else {
        const account = await user.createExternalAccount({
          strategy: "oauth_github",
          redirectUrl: window.location.href,
          additionalScopes: [...GITHUB_REPO_SCOPES],
        });
        const redirectUrl = account.verification?.externalVerificationRedirectURL;
        if (redirectUrl) {
          window.location.href = redirectUrl.href;
          return;
        }
      }

      await syncConnection({});
    } finally {
      setIsConnecting(false);
    }
  }, [syncConnection, user]);

  return {
    connect,
    isConnecting,
    hasRepoScope,
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
