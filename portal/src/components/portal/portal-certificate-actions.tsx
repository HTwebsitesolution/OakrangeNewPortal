import Link from "next/link";

const actionClass =
  "inline-flex items-center rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900";

export function PortalCertificateActions({ certificateId }: { certificateId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/portal/certificates/${certificateId}`} className={actionClass}>
        Details
      </Link>
      <a
        href={`/api/portal/certificates/${certificateId}/signed-url?intent=view`}
        target="_blank"
        rel="noopener noreferrer"
        className={actionClass}
      >
        View PDF
      </a>
      <a
        href={`/api/portal/certificates/${certificateId}/signed-url?intent=download`}
        className={`${actionClass} bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200`}
      >
        Download
      </a>
    </div>
  );
}
