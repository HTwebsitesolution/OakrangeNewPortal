import Link from "next/link";
import { CERTIFICATE_DOCUMENT_TYPES } from "@/lib/certificates/document-types";
import type { CertificateListFilters } from "@/lib/certificates/queries";

type Props = {
  actionPath: string;
  resetPath: string;
  filters: CertificateListFilters;
  showCustomerSearch?: boolean;
  showSiteSearch?: boolean;
};

function inputClassName() {
  return "mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900";
}

export function CertificateListFiltersForm({
  actionPath,
  resetPath,
  filters,
  showCustomerSearch = true,
  showSiteSearch = true,
}: Props) {
  return (
    <form
      action={actionPath}
      method="GET"
      className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Filters
        </h2>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Apply filters
          </button>
          <Link
            href={resetPath}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
          >
            Reset
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {showCustomerSearch ? (
          <div>
            <label htmlFor="customerSearch" className="block text-xs font-medium text-zinc-600">
              Customer name / ID
            </label>
            <input
              id="customerSearch"
              name="customerSearch"
              defaultValue={filters.customerSearch ?? ""}
              className={inputClassName()}
            />
          </div>
        ) : null}

        {showSiteSearch ? (
          <div>
            <label htmlFor="siteSearch" className="block text-xs font-medium text-zinc-600">
              Site name
            </label>
            <input
              id="siteSearch"
              name="siteSearch"
              defaultValue={filters.siteSearch ?? ""}
              className={inputClassName()}
            />
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
            defaultValue={filters.status ?? ""}
            className={inputClassName()}
          >
            <option value="">Any</option>
            <option value="active">active</option>
            <option value="void">void</option>
            <option value="replaced">replaced</option>
            <option value="archived">archived</option>
          </select>
        </div>

        <div>
          <label htmlFor="uploadedBySearch" className="block text-xs font-medium text-zinc-600">
            Uploaded by
          </label>
          <input
            id="uploadedBySearch"
            name="uploadedBySearch"
            defaultValue={filters.uploadedBySearch ?? ""}
            className={inputClassName()}
          />
        </div>

        <div>
          <label htmlFor="originalFileName" className="block text-xs font-medium text-zinc-600">
            Original filename
          </label>
          <input
            id="originalFileName"
            name="originalFileName"
            defaultValue={filters.originalFileName ?? ""}
            className={inputClassName()}
          />
        </div>

        <div>
          <label htmlFor="displayTitle" className="block text-xs font-medium text-zinc-600">
            Generated title / filename
          </label>
          <input
            id="displayTitle"
            name="displayTitle"
            defaultValue={filters.displayTitle ?? ""}
            className={inputClassName()}
          />
        </div>

        <div>
          <label htmlFor="tag" className="block text-xs font-medium text-zinc-600">
            Tag
          </label>
          <input
            id="tag"
            name="tag"
            defaultValue={filters.tag ?? ""}
            className={inputClassName()}
          />
        </div>

        <div className="md:col-span-2 xl:col-span-4">
          <label htmlFor="notesSearch" className="block text-xs font-medium text-zinc-600">
            Notes contains
          </label>
          <input
            id="notesSearch"
            name="notesSearch"
            defaultValue={filters.notesSearch ?? ""}
            className={inputClassName()}
          />
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
        <div>
          <label htmlFor="uploadDateFrom" className="block text-xs font-medium text-zinc-600">
            Uploaded from
          </label>
          <input
            id="uploadDateFrom"
            name="uploadDateFrom"
            type="date"
            defaultValue={filters.uploadDateFrom ?? ""}
            className={inputClassName()}
          />
        </div>
        <div>
          <label htmlFor="uploadDateTo" className="block text-xs font-medium text-zinc-600">
            Uploaded to
          </label>
          <input
            id="uploadDateTo"
            name="uploadDateTo"
            type="date"
            defaultValue={filters.uploadDateTo ?? ""}
            className={inputClassName()}
          />
        </div>
      </div>
    </form>
  );
}
