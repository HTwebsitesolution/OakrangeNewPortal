"use client";

import Image from "next/image";
import { OakrangeLogo } from "@/components/brand/oakrange-logo";

const STATS = [
  { value: "15k+", label: "Certificates issued" },
  { value: "99.9%", label: "Portal uptime" },
  { value: "500+", label: "Active customers" },
] as const;

export function LoginHeroPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden bg-oak-navy text-white ${
        compact ? "min-h-[220px] lg:hidden" : "hidden min-h-screen lg:flex lg:flex-col"
      }`}
    >
      <div className="absolute inset-0">
        <Image
          src="/images/login-hero.png"
          alt=""
          fill
          priority
          sizes={compact ? "100vw" : "50vw"}
          className="object-cover animate-login-ken-burns"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-oak-navy/92 via-oak-navy/78 to-oak-navy/88"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-oak-navy via-transparent to-oak-navy/40"
          aria-hidden
        />
      </div>

      <div
        className={`relative z-10 flex flex-col ${
          compact ? "justify-end px-6 py-8" : "h-full justify-between px-10 py-12"
        }`}
      >
        <OakrangeLogo variant="light" subtitle="Calibration Services Portal" />

        <div className={compact ? "mt-6 max-w-lg space-y-2" : "max-w-md space-y-4"}>
          <h1
            className={
              compact
                ? "text-2xl font-semibold tracking-tight"
                : "text-3xl font-semibold tracking-tight sm:text-4xl"
            }
          >
            Precision calibration.{" "}
            <span className="text-oak-orange">Trusted results.</span>
          </h1>
          <p className="text-sm leading-relaxed text-slate-200">
            Access calibration certificates, track compliance, and manage equipment records —
            all in one secure portal.
          </p>
        </div>

        {!compact ? (
          <ul className="flex gap-8 border-t border-white/15 pt-6">
            {STATS.map(({ value, label }) => (
              <li key={label}>
                <p className="text-2xl font-semibold tabular-nums text-oak-orange">{value}</p>
                <p className="mt-0.5 text-xs text-slate-300">{label}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
