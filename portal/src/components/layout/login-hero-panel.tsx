"use client";

import Image from "next/image";
import { OakrangeLogo } from "@/components/brand/oakrange-logo";
import { brand } from "@/lib/copy/brand";

const login = brand.auth.login;

const STATS = [
  { value: "15k+", label: "Certificates issued" },
  { value: "99.9%", label: "Portal uptime" },
  { value: "500+", label: "Active customers" },
] as const;

/** Single hero column — fixed height on mobile, full height on desktop. */
export function LoginHeroPanel() {
  return (
    <aside className="relative shrink-0 overflow-hidden bg-oak-navy text-white max-lg:h-44 max-lg:max-h-44 lg:min-h-screen">
      <HeroImage />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-5 py-4 max-lg:justify-end lg:justify-between lg:px-10 lg:py-12">
        <OakrangeLogo variant="light" subtitle={login.portalEyebrow} />

        <p className="mt-2 text-lg font-semibold tracking-tight lg:hidden">
          Precision calibration.{" "}
          <span className="text-oak-orange">Trusted results.</span>
        </p>

        <div className="hidden max-w-md space-y-4 lg:block">
          <p className="text-xs font-semibold uppercase tracking-widest text-oak-orange">
            {login.heroTagline}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Precision calibration.{" "}
            <span className="text-oak-orange">Trusted results.</span>
          </h1>
          <p className="text-sm leading-relaxed text-slate-200">{login.heroLead}</p>
        </div>

        <ul className="hidden gap-8 border-t border-white/15 pt-6 lg:flex">
          {STATS.map(({ value, label }) => (
            <li key={label}>
              <p className="text-2xl font-semibold tabular-nums text-oak-orange">{value}</p>
              <p className="mt-0.5 text-xs text-slate-300">{label}</p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function HeroImage() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Image
        src="/images/login-hero.png"
        alt=""
        fill
        priority
        sizes="(max-width: 1023px) 100vw, 50vw"
        className="object-cover animate-login-ken-burns"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-oak-navy/95 via-oak-navy/80 to-oak-navy/90"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-oak-navy via-transparent to-oak-navy/40"
        aria-hidden
      />
    </div>
  );
}
