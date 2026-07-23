export function liveblocksRoomId(projectId: string, filePath: string) {
  return `polaris:${projectId}:${encodeURIComponent(filePath)}`;
}

export function parseLiveblocksRoomId(roomId: string): {
  projectId: string;
  filePath: string;
} | null {
  if (!roomId.startsWith("polaris:")) return null;
  const rest = roomId.slice("polaris:".length);
  const sep = rest.indexOf(":");
  if (sep <= 0) return null;
  const projectId = rest.slice(0, sep);
  const filePath = decodeURIComponent(rest.slice(sep + 1));
  if (!projectId || !filePath) return null;
  return { projectId, filePath };
}
