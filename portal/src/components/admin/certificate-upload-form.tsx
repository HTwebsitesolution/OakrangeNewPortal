"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CERTIFICATE_DOCUMENT_TYPES,
} from "@/lib/certificates/document-types";
import {
  buildCertificateDisplayTitle,
  buildCertificateDownloadFilename,
} from "@/lib/certificates/format";
import type { CertificateDocumentType } from "@/lib/certificates/types";

type CompanyOption = {
  id: string;
  companyName: string;
  customerIdReadable: string;
  status: "active" | "inactive";
};

type SiteOption = {
  id: string;
  companyId: string;
  siteName: string;
  status: "active" | "inactive";
};

type UploadFormProps = {
  apiPath: string;
  backHref: string;
  cancelHref: string;
  companies: CompanyOption[];
  sites: SiteOption[];
  defaultCompanyId?: string;
  defaultSiteId?: string | null;
  defaultDocumentType?: CertificateDocumentType;
  defaultIssueDate?: string;
  defaultDueDate?: string | null;
  defaultNotes?: string | null;
  defaultTags?: string[];
  defaultDisplayTitleOverride?: string | null;
  lockCompany?: boolean;
  lockSite?: boolean;
  lockDocumentType?: boolean;
  submitLabel?: string;
  helperText?: string | null;
};

function inputClassName() {
  return "mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900";
}

export function CertificateUploadForm({
  apiPath,
  backHref,
  cancelHref,
  companies,
  sites,
  defaultCompanyId = "",
  defaultSiteId = null,
  defaultDocumentType,
  defaultIssueDate = "",
  defaultDueDate = null,
  defaultNotes = null,
  defaultTags = [],
  defaultDisplayTitleOverride = null,
  lockCompany = false,
  lockSite = false,
  lockDocumentType = false,
  submitLabel = "Publish Certificate",
  helperText = null,
}: UploadFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState(defaultCompanyId);
  const [siteId, setSiteId] = useState(defaultSiteId ?? "");
  const [documentType, setDocumentType] = useState<string>(
    defaultDocumentType ?? ""
  );
  const [issueDate, setIssueDate] = useState(defaultIssueDate);
  const [dueDate, setDueDate] = useState(defaultDueDate ?? "");
  const [notes, setNotes] = useState(defaultNotes ?? "");
  const [tags, setTags] = useState(defaultTags.join(", "));
  const [displayTitleOverride, setDisplayTitleOverride] = useState(
    defaultDisplayTitleOverride ?? ""
  );
  const [fileName, setFileName] = useState("");

  const selectedCompany = useMemo(
    () => companies.find((item) => item.id === companyId) ?? null,
    [companies, companyId]
  );
  const availableSites = useMemo(
    () => sites.filter((item) => item.companyId === companyId),
    [sites, companyId]
  );
  const selectedSite = useMemo(
    () => availableSites.find((item) => item.id === siteId) ?? null,
    [availableSites, siteId]
  );

  const generatedPreview = useMemo(() => {
    if (!selectedCompany || !issueDate) {
      return null;
    }

    const resolvedDocumentType = CERTIFICATE_DOCUMENT_TYPES.find(
      (item) => item.value === documentType
    )?.value as CertificateDocumentType | undefined;

    if (!resolvedDocumentType) {
      return null;
    }

    return {
      displayTitle: buildCertificateDisplayTitle({
        companyName: selectedCompany.companyName,
        siteName: selectedSite?.siteName ?? null,
        documentType: resolvedDocumentType,
        issueDate,
        displayTitleOverride,
      }),
      downloadFileName: buildCertificateDownloadFilename({
        companyName: selectedCompany.companyName,
        siteName: selectedSite?.siteName ?? null,
        documentType: resolvedDocumentType,
        issueDate,
      }),
    };
  }, [displayTitleOverride, documentType, issueDate, selectedCompany, selectedSite]);

  const blockedReason =
    selectedCompany?.status === "inactive"
      ? "Uploads are blocked for inactive customers."
      : selectedSite?.status === "inactive"
        ? "Uploads are blocked for inactive sites."
        : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    if (!selectedSite) {
      formData.set("site_id", "");
    }

    try {
      const response = await fetch(apiPath, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok || !payload.redirectTo) {
        setError(payload.error ?? "Certificate upload failed.");
        setPending(false);
        return;
      }

      router.push(payload.redirectTo);
      router.refresh();
    } catch {
      setError("Certificate upload failed.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link href={backHref} className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Back
      </Link>
      <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
        {helperText ? (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {helperText}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        ) : null}
        {blockedReason ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {blockedReason}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Certificate details
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="company_id" className="block text-xs font-medium text-zinc-600">
                    Customer <span className="text-red-600">*</span>
                  </label>
                  {lockCompany && selectedCompany ? (
                    <>
                      <input type="hidden" name="company_id" value={selectedCompany.id} />
                      <div className="mt-1 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                        {selectedCompany.companyName} ({selectedCompany.customerIdReadable})
                      </div>
                    </>
                  ) : (
                    <select
                      id="company_id"
                      name="company_id"
                      required
                      value={companyId}
                      onChange={(event) => {
                        setCompanyId(event.target.value);
                        setSiteId("");
                      }}
                      className={inputClassName()}
                    >
                      <option value="">Select a customer</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.customerIdReadable} - {company.companyName}
                          {company.status === "inactive" ? " (inactive)" : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="site_id" className="block text-xs font-medium text-zinc-600">
                    Site
                  </label>
                  {lockSite && selectedSite ? (
                    <>
                      <input type="hidden" name="site_id" value={selectedSite.id} />
                      <div className="mt-1 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                        {selectedSite.siteName}
                      </div>
                    </>
                  ) : lockSite ? (
                    <>
                      <input type="hidden" name="site_id" value="" />
                      <div className="mt-1 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                        Company-level certificate
                      </div>
                    </>
                  ) : (
                    <select
                      id="site_id"
                      name="site_id"
                      value={siteId}
                      onChange={(event) => setSiteId(event.target.value)}
                      className={inputClassName()}
                      disabled={!companyId}
                    >
                      <option value="">Company-level certificate</option>
                      {availableSites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.siteName}
                          {site.status === "inactive" ? " (inactive)" : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label htmlFor="document_type" className="block text-xs font-medium text-zinc-600">
                    Document type <span className="text-red-600">*</span>
                  </label>
                  {lockDocumentType && documentType ? (
                    <>
                      <input type="hidden" name="document_type" value={documentType} />
                      <div className="mt-1 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                        {CERTIFICATE_DOCUMENT_TYPES.find((item) => item.value === documentType)?.label ??
                          documentType}
                      </div>
                    </>
                  ) : (
                    <select
                      id="document_type"
                      name="document_type"
                      required
                      value={documentType}
                      onChange={(event) => setDocumentType(event.target.value)}
                      className={inputClassName()}
                    >
                      <option value="">Select document type</option>
                      {CERTIFICATE_DOCUMENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label htmlFor="issue_date" className="block text-xs font-medium text-zinc-600">
                    Issue / calibration date <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="issue_date"
                    name="issue_date"
                    type="date"
                    required
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                    className={inputClassName()}
                  />
                </div>

                <div>
                  <label htmlFor="due_date" className="block text-xs font-medium text-zinc-600">
                    Due / next calibration date
                  </label>
                  <input
                    id="due_date"
                    name="due_date"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className={inputClassName()}
                  />
                </div>

                <div>
                  <label
                    htmlFor="display_title_override"
                    className="block text-xs font-medium text-zinc-600"
                  >
                    Optional display title override
                  </label>
                  <input
                    id="display_title_override"
                    name="display_title_override"
                    value={displayTitleOverride}
                    onChange={(event) => setDisplayTitleOverride(event.target.value)}
                    className={inputClassName()}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="file" className="block text-xs font-medium text-zinc-600">
                    PDF file <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="file"
                    name="file"
                    type="file"
                    accept=".pdf,application/pdf"
                    required
                    onChange={(event) =>
                      setFileName(event.target.files?.[0]?.name ?? "")
                    }
                    className="mt-1 block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white dark:text-zinc-300 dark:file:bg-zinc-100 dark:file:text-zinc-900"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    PDF only, maximum 20 MB.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="tags" className="block text-xs font-medium text-zinc-600">
                    Tags
                  </label>
                  <input
                    id="tags"
                    name="tags"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="ukas, annual, workshop"
                    className={inputClassName()}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="notes" className="block text-xs font-medium text-zinc-600">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className={inputClassName()}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={pending || Boolean(blockedReason)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {pending ? "Publishing..." : submitLabel}
              </button>
              <Link
                href={cancelHref}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
              >
                Cancel
              </Link>
            </div>
          </div>

          <aside className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Preview
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase text-zinc-500">Customer</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {selectedCompany
                    ? `${selectedCompany.customerIdReadable} - ${selectedCompany.companyName}`
                    : "Select a customer"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Site scope</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {selectedSite?.siteName ?? "Company-level certificate"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Generated display title</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {generatedPreview?.displayTitle ?? "Choose document type and issue date"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Generated download filename</dt>
                <dd className="break-words text-zinc-900 dark:text-zinc-100">
                  {generatedPreview?.downloadFileName ?? "Choose document type and issue date"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Uploaded file</dt>
                <dd className="break-words text-zinc-900 dark:text-zinc-100">
                  {fileName || "No file selected"}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </form>
    </div>
  );
}
