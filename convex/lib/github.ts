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
