import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 items-center justify-center rounded-sm border border-hairline-str bg-surface-2 px-1.5 font-mono text-2xs text-fg-muted tracking-[0.02em]",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
