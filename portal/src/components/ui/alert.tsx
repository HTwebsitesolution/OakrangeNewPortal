import { cn } from "@/lib/ui/cn";

const variants = {
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  info: "border-slate-200 bg-slate-50 text-oak-charcoal",
} as const;

export function Alert({
  variant = "info",
  children,
  className,
  role = "status",
}: {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      role={role}
      className={cn("rounded-lg border px-4 py-3 text-sm", variants[variant], className)}
    >
      {children}
    </div>
  );
}
