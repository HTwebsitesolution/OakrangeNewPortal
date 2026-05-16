import Link from "next/link";
import { CERTIFICATE_DOCUMENT_TYPES } from "@/lib/certificates/document-types";
import type { PortalCertificateListFilters } from "@/lib/certificates/portal-queries";

export type PortalSiteFilterOption = {
  value: string;
  label: string;
};

type Props = {
  filters: PortalCertificateListFilters;
  siteOptions: PortalSiteFilterOption[];
  showSiteFilter: boolean;
};

function inputClassName() {
  return "mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900";
}

export function PortalCertificateFiltersForm({
  filters,
  siteOptions,
  showSiteFilter,
}: Props) {
  return (
    <form
      action="/portal/certificates"
      method="GET"
      className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Search & filters</h2>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Apply
          </button>
          <Link
            href="/portal/certificates"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
          >
            Reset
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor="q" className="block text-xs font-medium text-zinc-600">
            Search certificates
          </label>
          <input
            id="q"
            name="q"
            defaultValue={filters.search ?? ""}
            placeholder="Title, site, document type, notes, tags"
            className={inputClassName()}
          />
        </div>

        {showSiteFilter ? (
          <div>
            <label htmlFor="siteId" className="block text-xs font-medium text-zinc-600">
              Site
            </label>
            <select
              id="siteId"
              name="siteId"
              defaultValue={filters.siteId ?? ""}
              className={inputClassName()}
            >
              <option value="">All sites</option>
              {siteOptions.map((site) => (
                <option key={site.value} value={site.value}>
                  {site.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="documentType" className="block text-xs font-medium text-zinc-600">
            Document type
          </label>
          <select
            id="documentType"
            name="documentType"
            defaultValue={filters.documentType ?? ""}
            className={inputClassName()}
          >
            <option value="">Any</option>
            {CERTIFICATE_DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-xs font-medium text-zinc-600">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={filters.expiry ?? ""}
            className={inputClassName()}
          >
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="no_due_date">No due date</option>
          </select>
        </div>

        <div>
          <label htmlFor="issueDateFrom" className="block text-xs font-medium text-zinc-600">
            Issue date from
          </label>
          <input
            id="issueDateFrom"
            name="issueDateFrom"
            type="date"
            defaultValue={filters.issueDateFrom ?? ""}
            className={inputClassName()}
          />
        </div>
        <div>
          <label htmlFor="issueDateTo" className="block text-xs font-medium text-zinc-600">
            Issue date to
          </label>
          <input
            id="issueDateTo"
            name="issueDateTo"
            type="date"
            defaultValue={filters.issueDateTo ?? ""}
            className={inputClassName()}
          />
        </div>
        <div>
          <label htmlFor="dueDateFrom" className="block text-xs font-medium text-zinc-600">
            Due date from
          </label>
          <input
            id="dueDateFrom"
            name="dueDateFrom"
            type="date"
            defaultValue={filters.dueDateFrom ?? ""}
            className={inputClassName()}
          />
        </div>
        <div>
          <label htmlFor="dueDateTo" className="block text-xs font-medium text-zinc-600">
            Due date to
          </label>
          <input
            id="dueDateTo"
            name="dueDateTo"
            type="date"
            defaultValue={filters.dueDateTo ?? ""}
            className={inputClassName()}
          />
        </div>
      </div>
    </form>
  );
}



