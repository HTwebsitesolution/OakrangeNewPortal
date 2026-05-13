"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  archiveCertificateAction,
  type CertificateActionState,
  voidCertificateAction,
} from "@/actions/admin/certificates";
import { FormFlash } from "@/components/admin/form-flash";

const initial = {} as CertificateActionState;

export function CertificateLifecycleActions({
  certificateId,
  status,
  replaceHref,
}: {
  certificateId: string;
  status: string;
  replaceHref: string;
}) {
  const [voidState, voidFormAction, voidPending] = useActionState(
    voidCertificateAction.bind(null, certificateId),
    initial
  );
  const [archiveState, archiveFormAction, archivePending] = useActionState(
    archiveCertificateAction.bind(null, certificateId),
    initial
  );

  const canMutate = status === "active";

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Lifecycle actions
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Replace publishes a new certificate and preserves this file as history.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/admin/certificates/${certificateId}/signed-url?intent=view`}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
        >
          View PDF
        </a>
        <a
          href={`/api/admin/certificates/${certificateId}/signed-url?intent=download`}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
        >
          Download PDF
        </a>
        <Link
          href={replaceHref}
          className={`rounded-lg border px-3 py-2 text-sm ${canMutate ? "border-zinc-300 dark:border-zinc-600" : "pointer-events-none border-zinc-200 opacity-60 dark:border-zinc-800"}`}
        >
          Replace certificate
        </Link>
      </div>

      {!canMutate ? (
        <p className="text-sm text-zinc-500">
          Only active certificates can be voided, archived, or replaced.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <form action={voidFormAction} className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <FormFlash state={voidState.success ? { ok: true } : voidState} />
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Mark this certificate as void while keeping the history and stored PDF.
          </p>
          <button
            type="submit"
            disabled={!canMutate || voidPending}
            className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {voidPending ? "Voiding..." : "Void certificate"}
          </button>
        </form>

        <form
          action={archiveFormAction}
          className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <FormFlash state={archiveState.success ? { ok: true } : archiveState} />
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Archive this certificate without deleting the database row or private file.
          </p>
          <button
            type="submit"
            disabled={!canMutate || archivePending}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {archivePending ? "Archiving..." : "Archive certificate"}
          </button>
        </form>
      </div>
    </div>
  );
}
