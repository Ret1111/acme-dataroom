import { cn } from "@/lib/cn";
import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900",
        "placeholder:text-zinc-400",
        "focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
