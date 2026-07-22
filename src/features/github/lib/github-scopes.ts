export const GITHUB_REPO_SCOPES = ["repo"] as const;

export function parseApprovedScopes(approvedScopes?: string | null): string[] {
  if (!approvedScopes) {
    return [];
  }

  return approvedScopes.split(/[,\s]+/).filter(Boolean);
}

export function hasGitHubRepoScope(approvedScopes?: string | null): boolean {
  const scopes = parseApprovedScopes(approvedScopes);
  return scopes.includes("repo");
}

export const GITHUB_REPO_SCOPE_MESSAGE =
  "GitHub needs repository access to create or push repos. Reconnect GitHub and approve the repo permission.";
