"use client";

import Link from "next/link";
import { cn } from "@/lib/ui/cn";

type OakrangeLogoProps = {
  href?: string;
  variant?: "light" | "dark";
  subtitle?: string;
  className?: string;
};

export function OakrangeLogo({
  href,
  variant = "dark",
  subtitle,
  className,
}: OakrangeLogoProps) {
  const isLight = variant === "light";
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
          isLight ? "bg-oak-orange text-white" : "bg-oak-orange text-white"
        )}
        aria-hidden
      >
        OE
      </span>
      <div>
        <p
          className={cn(
            "text-sm font-semibold tracking-tight",
            isLight ? "text-white" : "text-oak-navy"
          )}
        >
          Oakrange Engineering
        </p>
        {subtitle ? (
          <p
            className={cn(
              "text-xs",
              isLight ? "text-slate-300" : "text-oak-muted"
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oak-orange">
        {content}
      </Link>
    );
  }

  return content;
}
