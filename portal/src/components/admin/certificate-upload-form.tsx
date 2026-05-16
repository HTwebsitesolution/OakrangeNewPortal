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
import { UploadStepIndicator } from "@/components/admin/upload-step-indicator";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { brand } from "@/lib/copy/brand";
import {
  cardClass,
  fileInputClass,
  inputClass,
  labelClass,
  sectionTitleClass,
} from "@/lib/ui/classes";

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

  const activeStep = useMemo((): 1 | 2 | 3 => {
    if (generatedPreview && fileName) return 3;
    if (companyId && documentType && issueDate) return 2;
    return 1;
  }, [companyId, documentType, issueDate, generatedPreview, fileName]);

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
    <div className="space-y-6">
      <Link href={backHref} className="text-sm font-medium text-oak-orange hover:underline">
        ← Back
      </Link>
      <UploadStepIndicator activeStep={activeStep} />
      <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
        {helperText ? <Alert variant="info">{helperText}</Alert> : null}
        {!helperText ? <Alert variant="info">{brand.admin.uploadHelper}</Alert> : null}
        {error ? <Alert variant="error">{error}</Alert> : null}
        {blockedReason ? <Alert variant="warning">{blockedReason}</Alert> : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="space-y-4 pb-28 lg:pb-0">
            <div className={`${cardClass} p-5`}>
              <h2 className={sectionTitleClass}>Certificate details</h2>
              <p className="mt-1 text-xs text-oak-muted">
                Choose the customer, site scope, and calibration dates before uploading the PDF.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="company_id" className={labelClass}>
                    Customer <span className="text-oak-danger">*</span>
                  </label>
                  {lockCompany && selectedCompany ? (
                    <>
                      <input type="hidden" name="company_id" value={selectedCompany.id} />
                      <div className="mt-1 rounded-lg border border-oak-border bg-slate-50 px-3 py-2 text-sm text-oak-charcoal">
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
                      className={inputClass}
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
                  <label htmlFor="site_id" className={labelClass}>
                    Site
                  </label>
                  {lockSite && selectedSite ? (
                    <>
                      <input type="hidden" name="site_id" value={selectedSite.id} />
                      <div className="mt-1 rounded-lg border border-oak-border bg-slate-50 px-3 py-2 text-sm text-oak-charcoal">
                        {selectedSite.siteName}
                      </div>
                    </>
                  ) : lockSite ? (
                    <>
                      <input type="hidden" name="site_id" value="" />
                      <div className="mt-1 rounded-lg border border-oak-border bg-slate-50 px-3 py-2 text-sm text-oak-charcoal">
                        Company-level certificate
                      </div>
                    </>
                  ) : (
                    <select
                      id="site_id"
                      name="site_id"
                      value={siteId}
                      onChange={(event) => setSiteId(event.target.value)}
                      className={inputClass}
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
                  <label htmlFor="document_type" className={labelClass}>
                    Document type <span className="text-oak-danger">*</span>
                  </label>
                  {lockDocumentType && documentType ? (
                    <>
                      <input type="hidden" name="document_type" value={documentType} />
                      <div className="mt-1 rounded-lg border border-oak-border bg-slate-50 px-3 py-2 text-sm text-oak-charcoal">
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
                      className={inputClass}
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
                  <label htmlFor="issue_date" className={labelClass}>
                    Issue / calibration date <span className="text-oak-danger">*</span>
                  </label>
                  <input
                    id="issue_date"
                    name="issue_date"
                    type="date"
                    required
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="due_date" className={labelClass}>
                    Due / next calibration date
                  </label>
                  <input
                    id="due_date"
                    name="due_date"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="display_title_override"
                    className={labelClass}
                  >
                    Optional display title override
                  </label>
                  <input
                    id="display_title_override"
                    name="display_title_override"
                    value={displayTitleOverride}
                    onChange={(event) => setDisplayTitleOverride(event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <span className={labelClass}>
                    PDF file <span className="text-oak-danger">*</span>
                  </span>
                  <label htmlFor="file" className={fileInputClass}>
                    <span className="text-sm font-medium text-oak-navy">
                      {fileName ? fileName : "Tap to choose a PDF"}
                    </span>
                    <span className="mt-1 text-xs text-oak-muted">PDF only · maximum 20 MB</span>
                    <input
                      id="file"
                      name="file"
                      type="file"
                      accept=".pdf,application/pdf"
                      required
                      onChange={(event) =>
                        setFileName(event.target.files?.[0]?.name ?? "")
                      }
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="tags" className={labelClass}>
                    Tags
                  </label>
                  <input
                    id="tags"
                    name="tags"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="ukas, annual, workshop"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="notes" className={labelClass}>
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 border-t border-oak-border bg-white/95 p-4 backdrop-blur-md sm:flex-row lg:relative lg:inset-auto lg:z-auto lg:border-0 lg:bg-transparent lg:p-0">
              <Button
                type="submit"
                variant="primary"
                className="min-h-11 flex-1"
                disabled={pending || Boolean(blockedReason)}
              >
                {pending ? "Publishing…" : submitLabel}
              </Button>
              <Button href={cancelHref} variant="secondary" className="min-h-11 flex-1 sm:flex-initial">
                Cancel
              </Button>
            </div>
          </div>

          <aside className={`${cardClass} space-y-4 p-5`}>
            <h2 className="text-sm font-semibold text-oak-navy">Publish preview</h2>
            {generatedPreview && selectedCompany ? (
              <div className="rounded-lg border border-oak-orange/30 bg-orange-50 p-4 text-sm">
                <p className="font-medium text-oak-navy">You are publishing this certificate to:</p>
                <p className="mt-2 font-semibold">{selectedCompany.companyName}</p>
                <p className="text-oak-muted">
                  {selectedSite?.siteName ?? "Company-level (authorised company users)"}
                </p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-oak-muted">
                  Customers will see
                </p>
                <p className="mt-1 font-medium text-oak-charcoal">{generatedPreview.displayTitle}</p>
              </div>
            ) : null}
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-oak-muted">Customer</dt>
                <dd className="text-oak-charcoal">
                  {selectedCompany
                    ? `${selectedCompany.customerIdReadable} - ${selectedCompany.companyName}`
                    : "Select a customer"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-oak-muted">Site scope</dt>
                <dd className="text-oak-charcoal">
                  {selectedSite?.siteName ?? "Company-level certificate"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-oak-muted">Generated display title</dt>
                <dd className="text-oak-charcoal">
                  {generatedPreview?.displayTitle ?? "Choose document type and issue date"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-oak-muted">Generated download filename</dt>
                <dd className="break-words text-oak-charcoal">
                  {generatedPreview?.downloadFileName ?? "Choose document type and issue date"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-oak-muted">Uploaded file</dt>
                <dd className="break-words text-oak-charcoal">
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

