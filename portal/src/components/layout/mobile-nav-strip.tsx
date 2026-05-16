"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SidebarNavItem } from "@/lib/nav/types";
import { cn } from "@/lib/ui/cn";

export function MobileNavStrip({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-oak-border bg-white px-3 py-2 lg:hidden">
      {items.map(({ href, label, match }) => {
        const active =
          match === "exact"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
              active ? "bg-oak-orange text-white" : "bg-slate-100 text-oak-charcoal"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
