"use client";

import { cn } from "@/lib/cn";
import * as Dropdown from "@radix-ui/react-dropdown-menu";

export const DropdownMenu = Dropdown.Root;
export const DropdownMenuTrigger = Dropdown.Trigger;

export function DropdownMenuContent({
  className,
  children,
  align = "end",
}: {
  className?: string;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
}) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        align={align}
        sideOffset={4}
        className={cn(
          "z-50 min-w-44 rounded-md border border-zinc-200 bg-white p-1 shadow-lg",
          className,
        )}
      >
        {children}
      </Dropdown.Content>
    </Dropdown.Portal>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: Dropdown.DropdownMenuItemProps & { destructive?: boolean }) {
  return (
    <Dropdown.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded px-2.5 py-1.5 text-sm outline-none",
        destructive
          ? "text-red-600 data-[highlighted]:bg-red-50"
          : "text-zinc-700 data-[highlighted]:bg-zinc-100",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator() {
  return <Dropdown.Separator className="my-1 h-px bg-zinc-100" />;
}
