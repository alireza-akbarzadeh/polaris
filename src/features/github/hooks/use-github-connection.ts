"use client";

import { useUser } from "@clerk/nextjs";
import { useAction, useConvexAuth, useQuery } from "convex/react";
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
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const connection = useQuery(
    api.github.getConnection,
    isAuthenticated ? {} : "skip",
  );
  const syncConnection = useAction(api.githubActions.syncConnection);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const hasSyncedForUser = useRef<string | null>(null);

  const githubAccount = getGitHubExternalAccount(user);
  const hasRepoScope = hasGitHubRepoScope(githubAccount?.approvedScopes);

  const sync = useCallback(async () => {
    if (!isAuthenticated) {
      return { connected: false as const };
    }

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
  }, [isAuthenticated, syncConnection]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !user?.id) {
      return;
    }
    if (hasSyncedForUser.current === user.id) {
      return;
    }
    hasSyncedForUser.current = user.id;
    void sync();
  }, [isAuthLoading, isAuthenticated, sync, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) {
      hasSyncedForUser.current = null;
    }
  }, [isAuthenticated]);

  return {
    connection: connection ?? null,
    isConnected: Boolean(connection),
    hasRepoScope,
    isLoading: isAuthLoading || (isAuthenticated && connection === undefined) || isSyncing,
    syncError,
    sync,
  };
}

export function useConnectGitHub() {
  const { user, isLoaded } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const syncConnection = useAction(api.githubActions.syncConnection);
  const [isConnecting, setIsConnecting] = useState(false);

  const githubAccount = useMemo(
    () => getGitHubExternalAccount(user),
    [user],
  );
  const hasRepoScope = hasGitHubRepoScope(githubAccount?.approvedScopes);

  const connect = useCallback(async () => {
    if (!user || !isAuthenticated) {
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
  }, [isAuthenticated, syncConnection, user]);

  return {
    connect,
    isConnecting,
    hasRepoScope,
    isReady: isLoaded && isAuthenticated && Boolean(user),
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
