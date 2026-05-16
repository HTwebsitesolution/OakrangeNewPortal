import { cardClass } from "@/lib/ui/classes";
import { cn } from "@/lib/ui/cn";

export function EmptyState({
  title,
  message,
  action,
  className,
}: {
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(cardClass, "px-6 py-10 text-center", className)}>
      {title ? <p className="text-sm font-semibold text-oak-navy">{title}</p> : null}
      <p className={cn("text-sm text-oak-muted", title && "mt-2")}>{message}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
