import { FileEditorView } from "@/features/workspace/views/file-editor-view";

export default async function ProjectFilePage({
  params,
}: {
  params: Promise<{ projectId: string; path?: string[] }>;
}) {
  const { projectId, path } = await params;

  return (
    <FileEditorView
      projectId={projectId}
      filePath={path?.join("/") ?? ""}
    />
  );
}
