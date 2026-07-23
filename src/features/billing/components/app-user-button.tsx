"use client";

import { UserButton } from "@clerk/nextjs";
import { CreditCardIcon, SettingsIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { usePricingDialog } from "@/features/billing/components/pricing-dialog";

type AppUserButtonProps = ComponentProps<typeof UserButton> & {
  /** When set, Settings opens this workspace editor tab instead of /settings. */
  settingsHref?: string;
  onOpenSettings?: () => void;
};

export function AppUserButton({
  children,
  settingsHref = "/settings",
  onOpenSettings,
  ...props
}: AppUserButtonProps) {
  const { openPricing } = usePricingDialog();

  return (
    <UserButton {...props}>
      <UserButton.MenuItems>
        {onOpenSettings ? (
          <UserButton.Action
            label="Settings"
            labelIcon={<SettingsIcon className="size-4" />}
            onClick={onOpenSettings}
          />
        ) : (
          <UserButton.Link
            label="Settings"
            labelIcon={<SettingsIcon className="size-4" />}
            href={settingsHref}
          />
        )}
        <UserButton.Action
          label="Billing"
          labelIcon={<CreditCardIcon className="size-4" />}
          onClick={() => openPricing()}
        />
        <UserButton.Action label="manageAccount" />
      </UserButton.MenuItems>
      {children}
    </UserButton>
  );
}
