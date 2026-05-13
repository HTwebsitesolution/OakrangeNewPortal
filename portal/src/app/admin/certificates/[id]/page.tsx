import Link from "next/link";
import { notFound } from "next/navigation";
import { CertificateLifecycleActions } from "@/components/admin/certificate-lifecycle-actions";
import { one } from "@/lib/admin/embed";
import { getCertificateDocumentTypeLabel } from "@/lib/certificates/document-types";
import {
  formatCertificateDate,
  getCertificateExpiryState,
  getCertificatePublishedMessage,
} from "@/lib/certificates/format";
import { loadCertificateForAdmin } from "@/lib/certificates/service";
import { requireAdminSupabase } from "@/lib/auth/require-session";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminCertificateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ flash?: string; previous?: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { certificate, error } = await loadCertificateForAdmin(supabase, id);
  if (error || !certificate) notFound();

  const company = one(certificate.companies);
  const site = one(certificate.sites);
  const uploader = one(certificate.profiles);
  if (!company) notFound();

  const flash = (await searchParams).flash;
  const expiryState = getCertificateExpiryState({
    status: certificate.status,
    dueDate: certificate.due_date,
  });

  return (
    <div className="space-y-6">
      <Link href="/admin/certificates" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Certificates
      </Link>

      {flash === "published" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {getCertificatePublishedMessage({
            companyName: company.company_name,
            siteName: site?.site_name ?? null,
          })}
        </p>
      ) : null}

      {flash === "replaced" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Replacement certificate published successfully. The previous certificate remains in history
          and has been marked as replaced.
        </p>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {certificate.display_title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {getCertificateDocumentTypeLabel(
              certificate.document_type as Parameters<
                typeof getCertificateDocumentTypeLabel
              >[0]
            )}
            <span className="mx-2">·</span>
            <span>{certificate.status}</span>
            <span className="mx-2">·</span>
            <span>{expiryState.replaceAll("_", " ")}</span>
          </p>
        </div>
        <div className="text-right text-sm text-zinc-500">
          <p>Customer: {company.customer_id_readable}</p>
          <p>{company.company_name}</p>
          <p>{site?.site_name ?? "Company-level certificate"}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className="space-y-6">
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Certificate metadata
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs uppercase text-zinc-500">Customer</dt>
                <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                  <Link
                    href={`/admin/customers/${company.id}/certificates`}
                    className="hover:underline"
                  >
                    {company.customer_id_readable} - {company.company_name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Site</dt>
                <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                  {site ? (
                    <Link
                      href={`/admin/customers/${company.id}/sites/${site.id}/certificates`}
                      className="hover:underline"
                    >
                      {site.site_name}
                    </Link>
                  ) : (
                    "Company-level certificate"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Issue date</dt>
                <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                  {formatCertificateDate(certificate.issue_date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Due date</dt>
                <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                  {certificate.due_date
                    ? formatCertificateDate(certificate.due_date)
                    : "No due date"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Original filename</dt>
                <dd className="mt-1 break-words text-zinc-900 dark:text-zinc-100">
                  {certificate.original_file_name}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Download filename</dt>
                <dd className="mt-1 break-words text-zinc-900 dark:text-zinc-100">
                  {certificate.download_file_name}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Uploaded by</dt>
                <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                  {uploader?.full_name || uploader?.email || "Unknown uploader"}
                  {uploader?.email ? (
                    <span className="block text-zinc-500">{uploader.email}</span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-500">Uploaded / published</dt>
                <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                  Uploaded: {new Date(certificate.uploaded_at).toLocaleString("en-GB")}
                  <span className="mt-1 block">
                    Published:{" "}
                    {certificate.published_at
                      ? new Date(certificate.published_at).toLocaleString("en-GB")
                      : "Not published"}
                  </span>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase text-zinc-500">Tags</dt>
                <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                  {(certificate.search_tags ?? []).length > 0
                    ? certificate.search_tags?.join(", ")
                    : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase text-zinc-500">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">
                  {certificate.notes || "—"}
                </dd>
              </div>
            </dl>
          </div>

          <CertificateLifecycleActions
            certificateId={certificate.id}
            status={certificate.status}
            replaceHref={`/admin/certificates/${certificate.id}/replace`}
          />
        </section>

        <aside className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Admin-only storage details
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-zinc-500">Storage path</dt>
              <dd className="mt-1 break-all text-zinc-900 dark:text-zinc-100">
                {certificate.storage_path}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500">Mime type</dt>
              <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                {certificate.mime_type}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500">File size</dt>
              <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                {certificate.file_size_bytes
                  ? `${(certificate.file_size_bytes / (1024 * 1024)).toFixed(2)} MB`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500">Replacement chain</dt>
              <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                {certificate.replaced_by_document_id ? (
                  <Link
                    href={`/admin/certificates/${certificate.replaced_by_document_id}`}
                    className="underline"
                  >
                    View replacement certificate
                  </Link>
                ) : (
                  "Current document has not been replaced."
                )}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
