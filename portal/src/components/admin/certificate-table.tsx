import Link from "next/link";
import { one } from "@/lib/admin/embed";
import { getCertificateDocumentTypeLabel } from "@/lib/certificates/document-types";
import {
  formatCertificateDate,
  getCertificateExpiryState,
} from "@/lib/certificates/format";
import type { AdminCertificateListRow } from "@/lib/certificates/queries";

function badgeClassName(value: string) {
  if (value === "expired" || value === "void") {
    return "rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-200";
  }
  if (value === "archived" || value === "replaced") {
    return "rounded-full bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  }
  if (value === "no_due_date") {
    return "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100";
  }
  return "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
}

export function CertificateTable({
  rows,
  emptyMessage,
}: {
  rows: AdminCertificateListRow[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Document</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Customer / site</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Status</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Dates</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Uploaded by</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {rows.map((row) => {
            const company = one(row.companies);
            const site = one(row.sites);
            const uploader = one(row.profiles);
            const expiryState = getCertificateExpiryState({
              status: row.status,
              dueDate: row.due_date,
            });

            return (
              <tr key={row.id}>
                <td className="px-3 py-3 align-top">
                  <Link
                    href={`/admin/certificates/${row.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {row.display_title}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    {getCertificateDocumentTypeLabel(
                      row.document_type as Parameters<
                        typeof getCertificateDocumentTypeLabel
                      >[0]
                    )}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{row.download_file_name}</p>
                </td>
                <td className="px-3 py-3 align-top">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {company?.customer_id_readable} - {company?.company_name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {site?.site_name ?? "Company-level certificate"}
                  </p>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="flex flex-wrap gap-2">
                    <span className={badgeClassName(row.status)}>{row.status}</span>
                    <span className={badgeClassName(expiryState)}>
                      {expiryState.replaceAll("_", " ")}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 align-top text-zinc-700 dark:text-zinc-300">
                  <p>Issue: {formatCertificateDate(row.issue_date)}</p>
                  <p>
                    Due: {row.due_date ? formatCertificateDate(row.due_date) : "No due date"}
                  </p>
                  <p>Uploaded: {new Date(row.uploaded_at).toLocaleString("en-GB")}</p>
                </td>
                <td className="px-3 py-3 align-top text-zinc-700 dark:text-zinc-300">
                  {uploader?.full_name || uploader?.email ? (
                    <>
                      <p>{uploader.full_name || "Unknown uploader"}</p>
                      <p className="text-xs text-zinc-500">{uploader.email}</p>
                    </>
                  ) : (
                    "Unknown uploader"
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/admin/certificates/${row.id}`}
                      className="text-zinc-900 underline dark:text-zinc-100"
                    >
                      Details
                    </Link>
                    <a
                      href={`/api/admin/certificates/${row.id}/signed-url?intent=view`}
                      className="text-zinc-700 underline dark:text-zinc-300"
                    >
                      View PDF
                    </a>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
