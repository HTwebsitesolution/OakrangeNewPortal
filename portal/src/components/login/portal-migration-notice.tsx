"use client";

import { useEffect, useState } from "react";

const OLD_PORTAL_URL = "https://oakrangeonline.co.uk";
const DISMISS_KEY = "oakrange_portal_migration_notice_dismissed";

function shouldShowNotice(): boolean {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname;
  const isPortalDomain =
    hostname === "oakrangeportal.co.uk" || hostname === "www.oakrangeportal.co.uk";

  const envEnabled =
    process.env.NEXT_PUBLIC_SHOW_PORTAL_MIGRATION_NOTICE === "true";

  return isPortalDomain || envEnabled;
}

/** Temporary notice while existing customers still use oakrangeonline.co.uk. */
export function PortalMigrationNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === "true") return;
    if (shouldShowNotice()) setShow(true);
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-migration-title"
        className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-oak-border sm:p-8"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close migration notice"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-lg leading-none text-oak-muted transition hover:bg-slate-100 hover:text-oak-navy"
        >
          ×
        </button>

        <div className="mb-5 inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-oak-orange">
          Oakrange Engineering
        </div>

        <h2
          id="portal-migration-title"
          className="pr-10 text-2xl font-bold tracking-tight text-oak-navy sm:text-3xl"
        >
          Looking for your calibration certificates?
        </h2>

        <p className="mt-4 text-base leading-7 text-oak-muted">
          The Oakrange customer portal is being upgraded. If you are an existing customer trying
          to access your current certificates, please continue using the existing portal for now.
        </p>

        <a
          href={OLD_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-oak-orange px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-oak-orange focus:ring-offset-2"
        >
          Access current portal
        </a>

        <p className="mt-3 text-center text-sm font-medium text-oak-charcoal">
          www.oakrangeonline.co.uk
        </p>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-oak-muted">
          Oakrange will let customers know when the new portal is ready for full access.
        </div>

        <p className="mt-4 text-center text-xs text-oak-muted">
          Testing the new portal? Close this notice.
        </p>
      </div>
    </div>
  );
}
