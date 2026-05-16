import Link from "next/link";

export default function PortalCertificateNotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Document unavailable
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        You do not have access to this document.
      </p>
      <Link href="/portal/certificates" className="text-sm underline">
        Return to certificates
      </Link>
    </div>
  );
}
