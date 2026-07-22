import {
  createOctokit,
  MAX_FILE_BYTES,
  MAX_IMPORT_FILES,
  shouldIgnorePath,
  type GitHubImportFile,
} from "./github";

/** Fetch text files from a GitHub branch. Call only from `"use node"` actions. */
export async function fetchRepoFiles(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ files: GitHubImportFile[]; commitSha: string }> {
  const octokit = createOctokit(token);

  const { data: refData } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const commitSha = refData.object.sha;

  const { data: treeData } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: commitSha,
    recursive: "true",
  });

  const blobs = treeData.tree.filter(
    (item) =>
      item.type === "blob" &&
      item.path &&
      item.sha &&
      !shouldIgnorePath(item.path),
  );

  if (blobs.length > MAX_IMPORT_FILES) {
    throw new Error(
      `Repository has too many files (${blobs.length}). Limit is ${MAX_IMPORT_FILES}.`,
    );
  }

  const files: GitHubImportFile[] = [];

  for (const blob of blobs) {
    if (!blob.path || !blob.sha) {
      continue;
    }

    if (blob.size !== undefined && blob.size > MAX_FILE_BYTES) {
      continue;
    }

    const { data: blobData } = await octokit.rest.git.getBlob({
      owner,
      repo,
      file_sha: blob.sha,
    });

    if (blobData.size != null && blobData.size > MAX_FILE_BYTES) {
      continue;
    }

    const content =
      blobData.encoding === "base64"
        ? Buffer.from(blobData.content, "base64").toString("utf8")
        : blobData.content;

    files.push({ path: blob.path, content });
  }

  return { files, commitSha };
}
