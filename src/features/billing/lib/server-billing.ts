import "server-only";

import { auth } from "@clerk/nextjs/server";

import {
  BILLING_FEATURES,
  BILLING_PLANS,
  type BillingFeatureSlug,
  type BillingPlanSlug,
} from "@/features/billing/lib/plans";

export async function getBillingAccess() {
  const { has, userId } = await auth();

  const hasPlan = (plan: BillingPlanSlug) => Boolean(has?.({ plan }));
  const hasFeature = (feature: BillingFeatureSlug) =>
    Boolean(has?.({ feature }));

  return {
    userId,
    isPro: hasPlan(BILLING_PLANS.pro),
    hasAiPremium: hasFeature(BILLING_FEATURES.aiPremium),
    hasGithubPublish: hasFeature(BILLING_FEATURES.githubPublish),
    hasPlan,
    hasFeature,
  };
}
