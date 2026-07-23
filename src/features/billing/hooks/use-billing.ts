"use client";

import { useAuth } from "@clerk/nextjs";

import {
  BILLING_FEATURES,
  BILLING_PLANS,
  type BillingFeatureSlug,
  type BillingPlanSlug,
} from "@/features/billing/lib/plans";

export function useBilling() {
  const { has, isLoaded } = useAuth();

  const hasPlan = (plan: BillingPlanSlug) =>
    Boolean(isLoaded && has?.({ plan }));

  const hasFeature = (feature: BillingFeatureSlug) =>
    Boolean(isLoaded && has?.({ feature }));

  const isPro = hasPlan(BILLING_PLANS.pro);
  const hasAiPremium = hasFeature(BILLING_FEATURES.aiPremium);
  const hasGithubPublish = hasFeature(BILLING_FEATURES.githubPublish);

  return {
    isLoaded,
    isPro,
    hasAiPremium,
    hasGithubPublish,
    hasPlan,
    hasFeature,
  };
}
