import Link from "next/link";
import { cardClass } from "@/lib/ui/classes";
import { cn } from "@/lib/ui/cn";

export function MetricCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  href?: string;
  accent?: "orange" | "warning" | "danger" | "default";
}) {
  const accentBar =
    accent === "orange"
      ? "border-l-oak-orange"
      : accent === "warning"
        ? "border-l-oak-amber"
        : accent === "danger"
          ? "border-l-oak-danger"
          : "border-l-oak-navy";

  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-oak-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-oak-navy">
        {value}
      </p>
    </>
  );

  const className = cn(cardClass, "border-l-4 p-5 transition hover:shadow-md", accentBar);

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}
