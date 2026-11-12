import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <span className="relative block min-w-0">
      <select
        className={cn("h-10 w-full min-w-0 appearance-none truncate rounded-md border border-input bg-background ps-3 pe-9 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60", className)}
        {...props}
      />
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}
