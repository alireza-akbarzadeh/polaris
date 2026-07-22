import { Octokit } from "@octokit/rest";
import { RequestError } from "@octokit/request-error";

const IGNORED_PATH_PREFIXES = [
  ".git/",
  "node_modules/",
  ".next/",
  "dist/",
  "build/",
  ".cache/",
  "coverage/",
];

const IGNORED_PATHS = new Set([
  ".DS_Store",
  "Thumbs.db",
  ".env.local",
  ".env",
]);

export const MAX_IMPORT_FILES = 500;
export const MAX_FILE_BYTES = 512 * 1024;

export function parseRepoUrl(input: string): { owner: string; repo: string } {
  const trimmed = input.trim().replace(/\.git$/, "");

  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+)$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/i,
  );
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

  const shortMatch = trimmed.match(/^([^/]+)\/([^/]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  throw new Error(
    "Invalid repository URL. Use owner/repo or https://github.com/owner/repo",
  );
}

export function shouldIgnorePath(path: string): boolean {
  if (IGNORED_PATHS.has(path)) {
    return true;
  }

  return IGNORED_PATH_PREFIXES.some(
    (prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix),
  );
}

export async function getClerkGitHubToken(userId: string): Promise<string | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured in Convex");
  }

  const response = await fetch(
    `https://api.clerk.com/v1/users/${userId}/oauth_access_tokens/oauth_github`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch GitHub token from Clerk: ${body}`);
  }

  const tokens = (await response.json()) as Array<{ token?: string }>;
  return tokens[0]?.token ?? null;
}

export type GitHubImportFile = {
  path: string;
  content: string;
};

export function buildFileTree(files: GitHubImportFile[]) {
  type TreeNode = {
    name: string;
    path: string;
    kind: "file" | "folder";
    content?: string;
    children: Map<string, TreeNode>;
  };

  const root: TreeNode = {
    name: "",
    path: "",
    kind: "folder",
    children: new Map(),
  };

  for (const file of files) {
    const segments = file.path.split("/");
    let current = root;
    let currentPath = "";

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const isFile = index === segments.length - 1;
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      if (!current.children.has(segment)) {
        current.children.set(segment, {
          name: segment,
          path: currentPath,
          kind: isFile ? "file" : "folder",
          content: isFile ? file.content : undefined,
          children: new Map(),
        });
      }

      current = current.children.get(segment)!;
      if (isFile) {
        current.content = file.content;
      }
    }
  }

  return root;
}

export const GITHUB_API_VERSION = "2026-03-10";

export function createOctokit(token: string) {
  return new Octokit({
    auth: token,
    headers: {
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });
}

export function isRepoNameExistsError(error: unknown): boolean {
  if (!(error instanceof RequestError)) {
    return false;
  }

  return error.message.toLowerCase().includes("name already exists");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGitHubError(error: unknown): boolean {
  if (!(error instanceof RequestError)) {
    return false;
  }

  if (error.status === 409) {
    return true;
  }

  return (
    error.status === 404 &&
    error.message.toLowerCase().includes("git repository is empty")
  );
}

export async function waitForRepositoryGitStorage(
  octokit: Octokit,
  owner: string,
  repo: string,
  maxAttempts = 12,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await octokit.rest.git.createBlob({
        owner,
        repo,
        content: ".",
        encoding: "utf-8",
      });
      return;
    } catch (error) {
      const isEmptyRepoError =
        error instanceof RequestError &&
        error.status === 409 &&
        error.message.toLowerCase().includes("git repository is empty");

      if (!isEmptyRepoError || attempt === maxAttempts - 1) {
        throw error;
      }

      await sleep(750 * (attempt + 1));
    }
  }
}

export async function repositoryHasBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
): Promise<boolean> {
  try {
    await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    return true;
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) {
      return false;
    }
    throw error;
  }
}

function isEmptyRepositoryError(error: unknown): boolean {
  return (
    error instanceof RequestError &&
    error.status === 409 &&
    error.message.toLowerCase().includes("git repository is empty")
  );
}

export async function createGitHubBlob(
  octokit: Octokit,
  owner: string,
  repo: string,
  content: string,
  maxAttempts = 6,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: content.length === 0 ? "\n" : content,
        encoding: "utf-8",
      });
      return blob;
    } catch (error) {
      lastError = error;
      if (!isEmptyRepositoryError(error) || attempt === maxAttempts - 1) {
        throw error;
      }
      await sleep(750 * (attempt + 1));
    }
  }

  throw lastError;
}

export async function ensureGitHubRepository(
  octokit: Octokit,
  owner: string,
  repoName: string,
  isPrivate: boolean,
) {
  try {
    const { data } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      private: isPrivate,
      auto_init: false,
    });
    return {
      repo: data,
      branch: data.default_branch ?? "main",
    };
  } catch (error) {
    if (!isRepoNameExistsError(error)) {
      throw error;
    }

    const { data: existing } = await octokit.rest.repos.get({
      owner,
      repo: repoName,
    });

    return {
      repo: existing,
      branch: existing.default_branch ?? "main",
    };
  }
}

export async function pushFilesAsCommit(
  octokit: Octokit,
  args: {
    owner: string;
    repo: string;
    branch: string;
    message: string;
    files: Array<{ path: string; content: string }>;
  },
) {
  const { owner, repo, branch, message, files } = args;

  const { data: refData } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const parentSha = refData.object.sha;

  const { data: parentCommit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: parentSha,
  });

  const treeEntries = await Promise.all(
    files.map(async (file) => {
      const blob = await createGitHubBlob(octokit, owner, repo, file.content);
      return {
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.sha,
      };
    }),
  );

  const { data: newTree } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: parentCommit.tree.sha,
    tree: treeEntries,
  });

  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: newTree.sha,
    parents: [parentSha],
  });

  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  });

  return newCommit.sha;
}

export async function pushFilesAsInitialCommit(
  octokit: Octokit,
  args: {
    owner: string;
    repo: string;
    branch: string;
    message: string;
    files: Array<{ path: string; content: string }>;
  },
) {
  const { owner, repo, branch, message, files } = args;

  const treeEntries = await Promise.all(
    files.map(async (file) => {
      const blob = await createGitHubBlob(octokit, owner, repo, file.content);
      return {
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.sha,
      };
    }),
  );

  const { data: newTree } = await octokit.rest.git.createTree({
    owner,
    repo,
    tree: treeEntries,
  });

  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: newTree.sha,
    parents: [],
  });

  try {
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: newCommit.sha,
    });
  } catch (error) {
    if (error instanceof RequestError && error.status === 422) {
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.sha,
      });
    } else {
      throw error;
    }
  }

  return newCommit.sha;
}

async function pushFilesAsCommitWithRetry(
  octokit: Octokit,
  args: {
    owner: string;
    repo: string;
    branch: string;
    message: string;
    files: Array<{ path: string; content: string }>;
  },
  maxAttempts = 8,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      if (attempt > 0) {
        await sleep(1000 * attempt);
      }
      return await pushFilesAsCommit(octokit, args);
    } catch (error) {
      lastError = error;
      if (!isRetryableGitHubError(error) || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function pushFilesAsInitialCommitWithRetry(
  octokit: Octokit,
  args: {
    owner: string;
    repo: string;
    branch: string;
    message: string;
    files: Array<{ path: string; content: string }>;
  },
  maxAttempts = 4,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      if (attempt > 0) {
        await sleep(750 * attempt);
      }
      return await pushFilesAsInitialCommit(octokit, args);
    } catch (error) {
      lastError = error;
      if (!(error instanceof RequestError) || attempt === maxAttempts - 1) {
        throw error;
      }
      if (error.status !== 404 && error.status !== 409 && error.status !== 422) {
        throw error;
      }
    }
  }

  throw lastError;
}

export async function pushProjectFiles(
  octokit: Octokit,
  args: {
    owner: string;
    repo: string;
    branch: string;
    message: string;
    files: Array<{ path: string; content: string }>;
  },
) {
  const hasBranch = await repositoryHasBranch(
    octokit,
    args.owner,
    args.repo,
    args.branch,
  );

  if (!hasBranch) {
    return pushFilesAsInitialCommitWithRetry(octokit, args);
  }

  return pushFilesAsCommitWithRetry(octokit, args);
}

export async function assertGitHubRepoScope(octokit: Octokit) {
  const response = await octokit.request("GET /user");
  const scopes = String(response.headers["x-oauth-scopes"] ?? "")
    .split(",")
    .map((scope) => scope.trim());

  if (!scopes.includes("repo")) {
    throw new Error(
      "GitHub token is missing the repo scope. Disconnect and reconnect GitHub in Polaris, then approve repository access.",
    );
  }
}

export function formatGitHubApiError(error: unknown): string | null {
  if (!(error instanceof RequestError)) {
    return null;
  }

  if (error.status === 401) {
    return "GitHub token is invalid or expired. Reconnect your GitHub account.";
  }

  if (error.status === 403 || error.status === 404) {
    return "GitHub denied this action. Reconnect GitHub and approve the repo permission.";
  }

  if (error.status === 422) {
    if (error.message.toLowerCase().includes("name already exists")) {
      return "Repository already exists on your GitHub account. Choose a different name or delete the existing repository.";
    }
    return error.message;
  }

  if (error.status === 409) {
    if (error.message.toLowerCase().includes("git repository is empty")) {
      return "GitHub is still preparing your repository. Wait a few seconds and try again.";
    }
    return "GitHub could not complete this action. Wait a few seconds and try again.";
  }

  return null;
}
