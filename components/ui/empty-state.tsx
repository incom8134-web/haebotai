import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-hairline p-10 text-center",
        className,
      )}
    >
      <Icon className="size-5 text-fg-subtle" aria-hidden />
      <p className="text-sm font-medium text-fg">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-fg-muted">{description}</p>
      ) : null}
      {action ? (
        <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export { EmptyState };
