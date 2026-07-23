import { zipSync, strToU8 } from "fflate";

export type ExportableProjectFile = {
  kind: "file" | "folder";
  path: string;
  content?: string | null;
};

function sanitizeZipName(name: string) {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+|\.+$/g, "");
  return cleaned || "project";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Build a ZIP of all project files and download it to the user's computer. */
export function exportProjectAsZip({
  projectName,
  files,
}: {
  projectName: string;
  files: ExportableProjectFile[];
}) {
  const entries: Record<string, Uint8Array> = {};

  for (const file of files) {
    if (file.kind !== "file" || !file.path) continue;
    const path = file.path.replace(/^\/+/, "");
    if (!path || path.includes("..")) continue;
    entries[path] = strToU8(file.content ?? "");
  }

  if (Object.keys(entries).length === 0) {
    throw new Error("This project has no files to export.");
  }

  const zipped = zipSync(entries, { level: 6 });
  const blob = new Blob([new Uint8Array(zipped)], {
    type: "application/zip",
  });
  const filename = `${sanitizeZipName(projectName)}.zip`;
  triggerDownload(blob, filename);
  return { filename, fileCount: Object.keys(entries).length };
}
