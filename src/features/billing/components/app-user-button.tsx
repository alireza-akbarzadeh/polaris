"use client";

import { UserButton } from "@clerk/nextjs";
import { CreditCardIcon, SettingsIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { usePricingDialog } from "@/features/billing/components/pricing-dialog";

type AppUserButtonProps = ComponentProps<typeof UserButton>;

export function AppUserButton({ children, ...props }: AppUserButtonProps) {
  const { openPricing } = usePricingDialog();

  return (
    <UserButton {...props}>
      <UserButton.MenuItems>
        <UserButton.Link
          label="Settings"
          labelIcon={<SettingsIcon className="size-4" />}
          href="/settings"
        />
        <UserButton.Action
          label="Pricing"
          labelIcon={<CreditCardIcon className="size-4" />}
          onClick={() => openPricing()}
        />
        <UserButton.Action label="manageAccount" />
      </UserButton.MenuItems>
      {children}
    </UserButton>
  );
}
