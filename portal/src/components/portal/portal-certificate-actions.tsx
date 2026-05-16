import Link from "next/link";

export function PortalCertificateActions({ certificateId }: { certificateId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/portal/certificates/${certificateId}`}
        className="text-sm text-zinc-900 underline dark:text-zinc-100"
      >
        View
      </Link>
      <a
        href={`/api/portal/certificates/${certificateId}/signed-url?intent=view`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-zinc-700 underline dark:text-zinc-300"
      >
        View PDF
      </a>
      <a
        href={`/api/portal/certificates/${certificateId}/signed-url?intent=download`}
        className="text-sm text-zinc-700 underline dark:text-zinc-300"
      >
        Download
      </a>
    </div>
  );
}



