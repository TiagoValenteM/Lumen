import * as React from "react"

import { cn } from "@/lib/utils/cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input/35 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/45 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-lg border bg-background/70 px-3 py-2 text-base shadow-sm shadow-black/5 transition-[color,box-shadow,background-color,border-color] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-black/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
