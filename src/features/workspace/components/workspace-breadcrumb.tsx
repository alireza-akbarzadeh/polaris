"use client";

import { ChevronRightIcon, FileCodeIcon } from "lucide-react";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { WorkspaceSwitcher } from "@/features/workspace/components/workspace-switcher";
import { useWorkspaceStore } from "@/features/workspace/store/workspace-store";

type WorkspaceBreadcrumbProps = {
  projectId: string;
  projectName?: string;
};

export function WorkspaceBreadcrumb({
  projectId,
  projectName,
}: WorkspaceBreadcrumbProps) {
  const segments = useWorkspaceStore((s) => s.breadcrumb);

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap items-center gap-1 text-[12px] sm:gap-1">
        <BreadcrumbItem className="shrink-0">
          <WorkspaceSwitcher projectId={projectId} projectName={projectName} />
        </BreadcrumbItem>

        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          return (
            <Fragment key={`${segment.label}-${index}`}>
              <BreadcrumbSeparator className="mx-0.5 text-[#6f737a] [&>svg]:size-3">
                <ChevronRightIcon />
              </BreadcrumbSeparator>
              <BreadcrumbItem className="min-w-0">
                {isLast ? (
                  <BreadcrumbPage className="flex max-w-[180px] items-center gap-1.5 truncate font-medium text-[#dfdfdf]">
                    <FileCodeIcon className="size-3 shrink-0 text-[#6a9bf5]" />
                    <span className="truncate">{segment.label}</span>
                  </BreadcrumbPage>
                ) : (
                  <span className="max-w-[120px] truncate text-[#9a9a9a] transition-colors hover:text-[#dfdfdf]">
                    {segment.label}
                  </span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
