"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ModelSelectorLogo,
  ModelSelectorName,
} from "@/components/ai-elements/model-selector";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  getPolarisChatModel,
  POLARIS_CHAT_MODELS,
  type PolarisChatModel,
} from "@/lib/ai/gemini-model";
import { cn } from "@/lib/utils";

type WorkspaceAiModelPickerProps = {
  value: string;
  onChange: (modelId: string) => void;
  auto?: boolean;
  onAutoChange?: (auto: boolean) => void;
  className?: string;
};

export function WorkspaceAiModelPicker({
  value,
  onChange,
  auto = false,
  onAutoChange,
  className,
}: WorkspaceAiModelPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => getPolarisChatModel(value), [value]);

  const handleSelect = (model: PolarisChatModel) => {
    onChange(model.id);
    if (auto) onAutoChange?.(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 max-w-[180px] items-center gap-1 rounded-md px-1.5 text-[11px] text-[#afb1b3] transition-colors",
            "hover:bg-[#3c3f41] hover:text-[#dfdfdf]",
            className,
          )}
        >
          <ModelSelectorLogo provider="google" className="size-3 shrink-0" />
          <span className="truncate font-medium">
            {auto ? "Auto" : selected.name}
          </span>
          {!auto ? (
            <span className="shrink-0 text-[#787878]">{selected.tag}</span>
          ) : null}
          <ChevronDownIcon className="size-3 shrink-0 opacity-70" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-[280px] border-[#4e5155] bg-[#1e1f22] p-0 text-[#dfdfdf] shadow-xl"
      >
        <Command className="bg-transparent **:data-[slot=command-input-wrapper]:border-[#4e5155]">
          <CommandInput
            placeholder="Search models"
            className="h-9 text-[12px] text-[#dfdfdf] placeholder:text-[#787878]"
          />

          <div className="flex items-center justify-between border-b border-[#4e5155] px-3 py-2">
            <span className="text-[12px] text-[#bcbec4]">Auto</span>
            <Switch
              checked={auto}
              onCheckedChange={(checked) => {
                onAutoChange?.(checked);
              }}
              className="scale-90 data-[state=checked]:bg-[#3574f0]"
            />
          </div>

          <CommandList className="max-h-64">
            <CommandEmpty className="py-6 text-[12px] text-[#787878]">
              No models found.
            </CommandEmpty>
            <CommandGroup
              heading="Google Gemini"
              className="**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-[10px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:tracking-wide **:[[cmdk-group-heading]]:text-[#787878] **:[[cmdk-group-heading]]:uppercase"
            >
              {POLARIS_CHAT_MODELS.map((model) => {
                const isSelected = !auto && model.id === selected.id;

                return (
                  <CommandItem
                    key={model.id}
                    value={`${model.name} ${model.tag} ${model.id}`}
                    onSelect={() => handleSelect(model)}
                    className={cn(
                      "gap-2 rounded-md px-2 py-2 text-[12px] text-[#bcbec4]",
                      "aria-selected:bg-[#3574f0]/15 aria-selected:text-[#dfdfdf]",
                    )}
                  >
                    <ModelSelectorLogo
                      provider={model.provider}
                      className="size-3.5 shrink-0"
                    />
                    <ModelSelectorName className="min-w-0">
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="truncate font-medium text-[#dfdfdf]">
                          {model.name}
                        </span>
                        <span className="shrink-0 text-[#787878]">
                          {model.tag}
                        </span>
                        {model.badge ? (
                          <Badge
                            className={cn(
                              "h-4 rounded-sm px-1 text-[9px] font-semibold",
                              model.badge === "NEW"
                                ? "border-transparent bg-[#7c5cff]/25 text-[#c4b5fd]"
                                : "border-transparent bg-[#3574f0]/20 text-[#6a9bf5]",
                            )}
                          >
                            {model.badge}
                          </Badge>
                        ) : null}
                      </span>
                    </ModelSelectorName>
                    {isSelected ? (
                      <CheckIcon className="size-3.5 shrink-0 text-[#6a9bf5]" />
                    ) : (
                      <span className="size-3.5 shrink-0" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator className="bg-[#4e5155]" />
            <div className="px-3 py-2 text-[10px] leading-relaxed text-[#787878]">
              Free-tier Gemini models for education and testing. Requires{" "}
              <code className="text-[#9a9a9a]">GOOGLE_GENERATIVE_AI_API_KEY</code>
              .
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
