"use client";

import { PricingTable } from "@clerk/nextjs";
import { Manrope } from "next/font/google";

import { useBilling } from "@/features/billing/hooks/use-billing";
import { cn } from "@/lib/utils";

const display = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

type PricingSectionProps = {
  id?: string;
  className?: string;
};

export function PricingSection({
  id = "pricing",
  className,
}: PricingSectionProps) {
  const { isLoaded, isPro } = useBilling();

  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 border-t border-white/5 bg-white/[0.01] py-24 md:py-32",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <div className="mb-4 font-mono text-[10px] font-bold tracking-[0.25em] text-[#7eb0f8] uppercase">
            Pricing
          </div>
          <h2
            className={cn(
              display.className,
              "mb-4 text-3xl font-bold tracking-tight text-white md:text-5xl",
            )}
          >
            Priced like a tool, not a token meter.
          </h2>
          <p className="text-base text-[#8b8e96] md:text-lg">
            Flat plans from Clerk Billing. Pick a tier and checkout opens
            in-app — no surprise usage invoices.
          </p>
          {isLoaded && isPro ? (
            <p className="mt-4 text-sm text-emerald-400">
              You&apos;re on Pro. Manage billing from your account menu → Manage
              account → Billing.
            </p>
          ) : null}
        </div>

        <div className="mx-auto w-full max-w-5xl">
          <PricingTable
            for="user"
            newSubscriptionRedirectUrl="/projects"
            appearance={{
              elements: {
                rootBox: "mx-auto w-full",
              },
            }}
          />
        </div>
      </div>
    </section>
  );
}
