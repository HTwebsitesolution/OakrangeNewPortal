import { cn } from "@/lib/ui/cn";

export type StatusBadgeVariant =
  | "active"
  | "expired"
  | "expiring"
  | "neutral"
  | "void"
  | "archived"
  | "draft";

const styles: Record<StatusBadgeVariant, string> = {
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  expired: "bg-red-50 text-red-800 ring-red-200",
  expiring: "bg-amber-50 text-amber-900 ring-amber-200",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  void: "bg-red-50 text-red-800 ring-red-200",
  archived: "bg-slate-100 text-slate-600 ring-slate-200",
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function StatusBadge({
  label,
  variant,
  className,
}: {
  label: string;
  variant: StatusBadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        styles[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
