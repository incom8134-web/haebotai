import * as React from "react"
import { cn } from "cn"
import { useComposition } from "@/hooks/useComposition"

function Textarea({
  className,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: React.ComponentProps<"textarea">) {
  // Same IME-composition guard as Input, but Shift+Enter bypasses it
  // entirely since that's not the key CJK IMEs use to confirm a composed
  // syllable block — it should always insert a newline.
  const composition = useComposition<HTMLTextAreaElement>({
    onKeyDown,
    onCompositionStart,
    onCompositionEnd,
  })

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.shiftKey) {
      onKeyDown?.(e)
      return
    }
    composition.onKeyDown(e)
  }

  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...composition}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}

export { Textarea }
