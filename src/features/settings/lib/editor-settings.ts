export type EditorSettings = {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  highlightActiveLine: boolean;
  bracketMatching: boolean;
  lineHeight: number;
};

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  lineNumbers: true,
  highlightActiveLine: true,
  bracketMatching: true,
  lineHeight: 1.6,
};

export const FONT_SIZE_MIN = 11;
export const FONT_SIZE_MAX = 22;
export const TAB_SIZE_OPTIONS = [2, 4, 8] as const;
export const LINE_HEIGHT_MIN = 1.2;
export const LINE_HEIGHT_MAX = 2.2;

export function clampEditorSettings(
  partial: Partial<EditorSettings>,
): EditorSettings {
  const fontSize = Math.min(
    FONT_SIZE_MAX,
    Math.max(FONT_SIZE_MIN, Math.round(partial.fontSize ?? DEFAULT_EDITOR_SETTINGS.fontSize)),
  );
  const tabSize = (TAB_SIZE_OPTIONS as readonly number[]).includes(
    partial.tabSize ?? DEFAULT_EDITOR_SETTINGS.tabSize,
  )
    ? (partial.tabSize as number)
    : DEFAULT_EDITOR_SETTINGS.tabSize;
  const lineHeight = Math.min(
    LINE_HEIGHT_MAX,
    Math.max(
      LINE_HEIGHT_MIN,
      Number((partial.lineHeight ?? DEFAULT_EDITOR_SETTINGS.lineHeight).toFixed(1)),
    ),
  );

  return {
    fontSize,
    tabSize,
    wordWrap: partial.wordWrap ?? DEFAULT_EDITOR_SETTINGS.wordWrap,
    lineNumbers: partial.lineNumbers ?? DEFAULT_EDITOR_SETTINGS.lineNumbers,
    highlightActiveLine:
      partial.highlightActiveLine ?? DEFAULT_EDITOR_SETTINGS.highlightActiveLine,
    bracketMatching:
      partial.bracketMatching ?? DEFAULT_EDITOR_SETTINGS.bracketMatching,
    lineHeight,
  };
}
