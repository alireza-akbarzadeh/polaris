"use client";

import { PricingTable } from "@clerk/nextjs";
import { Manrope } from "next/font/google";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBilling } from "@/features/billing/hooks/use-billing";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

/** Clerk checkout / drawer portals that conflict with our pricing Dialog. */
const CLERK_CHECKOUT_SELECTOR = [
  ".cl-checkout-root",
  ".cl-drawerRoot",
  ".cl-drawer",
  ".cl-modalBackdrop",
  "[data-clerk-component='Checkout']",
  "[class*='cl-checkout']",
  "[class*='cl-drawer']",
].join(", ");

function hasClerkCheckoutOpen() {
  return Boolean(document.querySelector(CLERK_CHECKOUT_SELECTOR));
}

type PricingDialogContextValue = {
  open: boolean;
  openPricing: () => void;
  closePricing: () => void;
};

const PricingDialogContext = createContext<PricingDialogContextValue | null>(
  null,
);

const PRICING_HASH = "#pricing";

function isLandingPricingPath(pathname: string | null) {
  return pathname === "/" || pathname === "/pricing";
}

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
  const [open, setOpen] = useState(false);

  const openPricing = useCallback(() => {
    // Landing already has the PricingSection — scroll there instead of a dialog.
    if (isLandingPricingPath(pathname)) {
      scrollToPricing();
      return;
    }
    setOpen(true);
  }, [pathname]);

  const closePricing = useCallback(() => {
    setOpen(false);
    if (typeof window === "undefined") return;
    if (window.location.hash === PRICING_HASH && isLandingPricingPath(pathname)) {
      window.history.replaceState(null, "", pathname || "/");
    }
  }, [pathname]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
  }, []);

  const value = useMemo(
    () => ({ open, openPricing, closePricing }),
    [open, openPricing, closePricing],
  );

  return (
    <PricingDialogContext.Provider value={value}>
      {children}
      <PricingDialog
        open={open}
        onOpenChange={handleOpenChange}
        redirectUrl={pathname || "/projects"}
      />
    </PricingDialogContext.Provider>
  );
}

function PricingDialog({
  open,
  onOpenChange,
  redirectUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectUrl: string;
}) {
  const { isLoaded, isPro } = useBilling();
  const tableHostRef = useRef<HTMLDivElement>(null);

  // Clerk mounts checkout in a portal. Close our dialog after that happens so
  // we don't unmount PricingTable before Clerk handles the plan click.
  useEffect(() => {
    if (!open) return;

    const closeIfCheckoutOpen = () => {
      if (hasClerkCheckoutOpen()) {
        onOpenChange(false);
        return true;
      }
      return false;
    };

    if (closeIfCheckoutOpen()) return;

    const observer = new MutationObserver(() => {
      closeIfCheckoutOpen();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const host = tableHostRef.current;
    const onPlanClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("button, [role='button'], a")) return;

      const started = Date.now();
      const poll = window.setInterval(() => {
        if (closeIfCheckoutOpen() || Date.now() - started > 4000) {
          window.clearInterval(poll);
        }
      }, 40);
    };

    host?.addEventListener("click", onPlanClick, true);

    return () => {
      observer.disconnect();
      host?.removeEventListener("click", onPlanClick, true);
    };
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        onInteractOutside={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest(CLERK_CHECKOUT_SELECTOR)
          ) {
            event.preventDefault();
            onOpenChange(false);
          }
        }}
        className={cn(
          "flex max-h-[min(92vh,900px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl",
          "border-border/70 bg-background shadow-[0_32px_120px_-24px_rgba(0,0,0,0.65)]",
          // Stay under Clerk drawers/portals.
          "z-40",
        )}
        overlayClassName="z-40"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 12% 0%, color-mix(in oklch, var(--ring) 18%, transparent), transparent 55%), radial-gradient(ellipse 60% 45% at 88% 100%, color-mix(in oklch, var(--accent) 45%, transparent), transparent 50%)",
          }}
        />

        <DialogHeader className="relative z-10 shrink-0 border-b border-border/60 px-6 py-5 text-left sm:px-8">
          <DialogTitle
            className={cn(
              display.className,
              "text-xl font-semibold tracking-tight sm:text-2xl",
            )}
          >
            Choose your Polaris plan
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Subscribe or manage billing below. Plans and prices come from your
            Clerk Dashboard.
          </DialogDescription>
          {isLoaded && isPro ? (
            <p className="pt-1 text-sm text-emerald-600 dark:text-emerald-400">
              You&apos;re on Pro. Manage your subscription from your account
              menu → Manage account → Billing.
            </p>
          ) : null}
        </DialogHeader>

        <div
          ref={tableHostRef}
          className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6"
        >
          {open ? (
            <PricingTable
              for="user"
              newSubscriptionRedirectUrl={redirectUrl}
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full",
                },
              }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
