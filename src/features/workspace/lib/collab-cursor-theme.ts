import { EditorView } from "@codemirror/view";

/** Polished remote-cursor chrome for y-codemirror.next. */
export const collabCursorTheme = EditorView.theme({
  ".cm-ySelection": {
    opacity: "0.9",
  },
  ".cm-yLineSelection": {
    padding: "0",
    margin: "0 0 0 0",
    borderRadius: "2px",
  },
  ".cm-ySelectionCaret": {
    position: "relative",
    borderLeft: "2px solid",
    borderRight: "none",
    marginLeft: "-1px",
    marginRight: "0",
    boxSizing: "border-box",
    display: "inline",
    height: "1.2em",
  },
  ".cm-ySelectionCaretDot": {
    borderRadius: "50%",
    position: "absolute",
    width: "6px",
    height: "6px",
    top: "-3px",
    left: "-4px",
    backgroundColor: "inherit",
    boxShadow: "0 0 0 1px color-mix(in oklab, #000 25%, transparent)",
    transition: "transform 160ms ease",
    boxSizing: "border-box",
  },
  ".cm-ySelectionCaret:hover > .cm-ySelectionCaretDot": {
    transform: "scale(1.15)",
  },
  ".cm-ySelectionInfo": {
    position: "absolute",
    top: "-1.45em",
    left: "-1px",
    fontSize: "10px",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontStyle: "normal",
    fontWeight: "600",
    letterSpacing: "0.01em",
    lineHeight: "1.2",
    userSelect: "none",
    color: "#fff",
    padding: "2px 6px",
    borderRadius: "4px 4px 4px 0",
    zIndex: "20",
    backgroundColor: "inherit",
    boxShadow: "0 4px 12px color-mix(in oklab, #000 35%, transparent)",
    opacity: "1",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    maxWidth: "140px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  ".cm-ySelectionCaret:hover > .cm-ySelectionInfo": {
    opacity: "1",
  },
});

/** Soften a collaborator color for selection highlights. */
export function softCollaboratorColor(color: string, alpha = 0.22) {
  // Expect hex colors from our palette; fall back gracefully.
  if (!color.startsWith("#") || (color.length !== 7 && color.length !== 4)) {
    return color;
  }
  const hex =
    color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
