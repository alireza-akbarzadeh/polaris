import { WorkspaceShell } from "@/features/workspace/views/workspace-shell";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <WorkspaceShell projectId={projectId}>{children}</WorkspaceShell>;
}
