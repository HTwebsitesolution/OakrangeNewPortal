"use client";

import { useActionState, useMemo, useState } from "react";
import {
  grantCompanyFromForm,
  grantSiteFromForm,
  revokeAccessFromForm,
  type AccessActionState,
} from "@/actions/admin/access";
import { FormFlash } from "@/components/admin/form-flash";
import type { UserRole } from "@/types/profile";

export type AccessRow = {
  id: string;
  access_type: "company" | "site";
  company_id: string;
  site_id: string | null;
  companies: { company_name: string } | null;
  sites: { site_name: string } | null;
};

type CompanyOption = { id: string; company_name: string };
type SiteOption = { id: string; company_id: string; site_name: string };

export function AccessGrantsPanel({
  targetProfileId,
  targetRole,
  companies,
  sites,
  accessRows,
}: {
  targetProfileId: string;
  targetRole: UserRole;
  companies: CompanyOption[];
  sites: SiteOption[];
  accessRows: AccessRow[];
}) {
  const [companyForSite, setCompanyForSite] = useState(
    companies[0]?.id ?? ""
  );
  const sitesFiltered = useMemo(
    () => sites.filter((s) => s.company_id === companyForSite),
    [sites, companyForSite]
  );

  const [grantCoState, grantCoAction, grantCoPending] = useActionState(
    grantCompanyFromForm,
    {} as AccessActionState
  );
  const [grantSiState, grantSiAction, grantSiPending] = useActionState(
    grantSiteFromForm,
    {} as AccessActionState
  );
  const [revokeState, revokeAction, revokePending] = useActionState(
    revokeAccessFromForm,
    {} as AccessActionState
  );

  if (targetRole === "oakrange_admin") {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Oakrange admins do not use company or site access rows. Access is implicit.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Current access</h3>
        <FormFlash state={revokeState} />
        {accessRows.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No grants yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {accessRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span>
                  {row.access_type === "company" ? (
                    <>
                      <span className="font-medium">Company</span> —{" "}
                      {row.companies?.company_name ?? row.company_id}
                    </>
                  ) : (
                    <>
                      <span className="font-medium">Site</span> —{" "}
                      {row.sites?.site_name ?? row.site_id}
                    </>
                  )}
                </span>
                <form action={revokeAction}>
                  <input type="hidden" name="access_row_id" value={row.id} />
                  <input type="hidden" name="target_profile_id" value={targetProfileId} />
                  <button
                    type="submit"
                    disabled={revokePending}
                    className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50 dark:text-red-400"
                  >
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Grant company-wide access</h3>
        <p className="text-xs text-zinc-500">
          Company access includes all published active certificates for that company (all sites and
          company-level documents), per RLS.
        </p>
        <form action={grantCoAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="target_profile_id" value={targetProfileId} />
          <div>
            <label htmlFor="grant_co_company" className="sr-only">
              Company
            </label>
            <select
              id="grant_co_company"
              name="company_id"
              required
              className="rounded border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            >
              <option value="">Select company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={grantCoPending}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Grant
          </button>
        </form>
        <FormFlash state={grantCoState} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Grant site-only access</h3>
        <p className="text-xs text-zinc-500">
          Site-level users do not see company-level certificate rows by default (RLS).
        </p>
        <form action={grantSiAction} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <input type="hidden" name="target_profile_id" value={targetProfileId} />
          <div>
            <label htmlFor="grant_si_company" className="block text-xs text-zinc-500">
              Company
            </label>
            <select
              id="grant_si_company"
              name="company_id"
              required
              value={companyForSite}
              onChange={(e) => setCompanyForSite(e.target.value)}
              className="mt-1 rounded border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="grant_si_site" className="block text-xs text-zinc-500">
              Site
            </label>
            <select
              id="grant_si_site"
              name="site_id"
              required
              className="mt-1 rounded border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            >
              <option value="">Select site…</option>
              {sitesFiltered.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.site_name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={grantSiPending}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Grant site access
          </button>
        </form>
        <FormFlash state={grantSiState} />
      </section>
    </div>
  );
}
