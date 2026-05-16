import Link from "next/link";
import { cardClass } from "@/lib/ui/classes";
import { cn } from "@/lib/ui/cn";

export function SectionCard({
  title,
  description,
  href,
  hrefLabel = "View all",
  children,
  className,
  priority,
}: {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  className?: string;
  priority?: "default" | "attention";
}) {
  return (
    <section
      className={cn(
        cardClass,
        "flex flex-col p-5",
        priority === "attention" && "border-oak-amber/40 ring-1 ring-oak-amber/20",
        className
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <>
          <h2 className="text-sm font-semibold tracking-tight text-oak-navy">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-oak-muted">{description}</p> : null}
        </>
        {href ? (
          <Link
            href={href}
            className="shrink-0 text-xs font-semibold text-oak-orange hover:underline"
          >
            {hrefLabel}
          </Link>
        ) : null}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}
