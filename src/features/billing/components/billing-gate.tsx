"use client";

import { Show } from "@clerk/nextjs";
import type { ReactNode } from "react";

import { usePricingDialog } from "@/features/billing/components/pricing-dialog";
import {
  BILLING_FEATURES,
  BILLING_PLANS,
  type BillingFeatureSlug,
  type BillingPlanSlug,
} from "@/features/billing/lib/plans";

type BillingGateProps = {
  children: ReactNode;
  plan?: BillingPlanSlug;
  feature?: BillingFeatureSlug;
  fallback?: ReactNode;
};

function DefaultUpgradeFallback({ label }: { label: string }) {
  const { openPricing } = usePricingDialog();

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border/70 bg-card/60 p-4 text-sm">
      <p className="text-muted-foreground">{label}</p>
      <button
        type="button"
        onClick={() => openPricing()}
        className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground transition-opacity hover:opacity-90"
      >
        View plans
      </button>
    </div>
  );
}

/**
 * Gate UI behind a Clerk Billing plan or feature.
 * Prefer `feature` checks so you can move entitlements between plans later.
 */
export function BillingGate({
  children,
  plan = BILLING_PLANS.pro,
  feature,
  fallback,
}: BillingGateProps) {
  const when = feature
    ? { feature }
    : { plan };

  return (
    <Show
      when={when}
      fallback={
        fallback ?? (
          <DefaultUpgradeFallback
            label={
              feature
                ? `This requires the “${feature}” feature on your plan.`
                : `This requires the ${plan} plan.`
            }
          />
        )
      }
    >
      {children}
    </Show>
  );
}

export function ProGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <BillingGate plan={BILLING_PLANS.pro} fallback={fallback}>
      {children}
    </BillingGate>
  );
}

export function AiPremiumGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <BillingGate feature={BILLING_FEATURES.aiPremium} fallback={fallback}>
      {children}
    </BillingGate>
  );
}
