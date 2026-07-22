const PREVIEWABLE_RE = /\.(tsx?|jsx?|html?|md)$/i;

export function isPreviewableFile(filePath: string) {
  return PREVIEWABLE_RE.test(filePath);
}
