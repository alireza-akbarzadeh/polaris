import { useWorkspaceStore, type PanelSizes } from "@/features/workspace/store/workspace-store";
import { useLayoutEffect, type RefObject } from "react";
import {
  type PanelImperativeHandle
} from "react-resizable-panels";


type CollapsiblePanelSyncOptions = {
  open: boolean;
  panelRef: RefObject<PanelImperativeHandle | null>;
  sizeKey: keyof PanelSizes;
  isApplyingLayoutRef: RefObject<boolean>;
};

export function useCollapsiblePanelSync({
  open,
  panelRef,
  sizeKey,
  isApplyingLayoutRef,
}: CollapsiblePanelSyncOptions) {
  useLayoutEffect(() => {
    let cancelled = false;
    let frameId = 0;

    const finishApplying = () => {
      frameId = requestAnimationFrame(() => {
        if (!cancelled) isApplyingLayoutRef.current = false;
      });
    };

    const apply = () => {
      if (cancelled) return;

      const panel = panelRef.current;
      if (!panel) {
        frameId = requestAnimationFrame(apply);
        return;
      }

      isApplyingLayoutRef.current = true;
      const { panelSizes, setPanelSizes } = useWorkspaceStore.getState();

      try {
        if (open) {
          if (panel.isCollapsed()) {
            panel.expand();
          }
          panel.resize(`${panelSizes[sizeKey]}`);
        } else if (!panel.isCollapsed()) {
          const { asPercentage } = panel.getSize();
          if (asPercentage > 0) {
            setPanelSizes({ [sizeKey]: asPercentage });
          }
          panel.collapse();
        }
      } finally {
        finishApplying();
      }
    };

    apply();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [open, panelRef, sizeKey, isApplyingLayoutRef]);
}
