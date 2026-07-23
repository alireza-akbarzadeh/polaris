/**
 * Plan and feature slugs must match what you create in the Clerk Dashboard
 * under Subscription plans → Plans for Users.
 *
 * Dashboard: https://dashboard.clerk.com/~/billing/plans
 */
export const BILLING_PLANS = {
  /** Default free plan every user starts on */
  free: "free_user",
  /** Paid plan — change this slug if yours differs in Clerk */
  pro: "pro",
} as const;

export type BillingPlanSlug =
  (typeof BILLING_PLANS)[keyof typeof BILLING_PLANS];

/**
 * Feature slugs attached to plans in Clerk. Gate product features with these.
 */
export const BILLING_FEATURES = {
  /** Example: unlimited AI chat / premium models */
  aiPremium: "ai_premium",
  /** Example: private GitHub sync / publish */
  githubPublish: "github_publish",
} as const;

export type BillingFeatureSlug =
  (typeof BILLING_FEATURES)[keyof typeof BILLING_FEATURES];
