"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type PricingDialogContextValue = {
  open: boolean;
  openPricing: () => void;
  closePricing: () => void;
};

const PricingDialogContext = createContext<PricingDialogContextValue | null>(
  null,
);

const PRICING_HASH = "#pricing";

export function usePricingDialog() {
  const context = useContext(PricingDialogContext);
  if (!context) {
    throw new Error("usePricingDialog must be used within PricingDialogProvider");
  }
  return context;
}

/** Scroll to the landing pricing section (Clerk PricingTable). */
export function scrollToPricing() {
  const el = document.getElementById("pricing");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", PRICING_HASH);
    return;
  }
  window.location.assign(`/${PRICING_HASH}`);
}

export function PricingDialogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const openPricing = useCallback(() => {
    if (pathname === "/" || pathname === "/pricing") {
      scrollToPricing();
      return;
    }
    // Full navigation so the hash survives and LandingView can scroll.
    window.location.assign(`/${PRICING_HASH}`);
  }, [pathname]);

  const closePricing = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === PRICING_HASH) {
      window.history.replaceState(null, "", pathname || "/");
    }
  }, [pathname]);

  const value = useMemo(
    () => ({ open: false, openPricing, closePricing }),
    [openPricing, closePricing],
  );

  return (
    <PricingDialogContext.Provider value={value}>
      {children}
    </PricingDialogContext.Provider>
  );
}
