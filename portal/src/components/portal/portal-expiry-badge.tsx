import {
  formatPortalExpiryLabel,
  getCertificateExpiryState,
} from "@/lib/certificates/format";
import type { CertificateExpiryState } from "@/lib/certificates/types";

function badgeClassName(state: CertificateExpiryState) {
  if (state === "expired") {
    return "rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-200";
  }
  if (state === "no_due_date") {
    return "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100";
  }
  return "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
}

export function PortalExpiryBadge({
  status,
  dueDate,
}: {
  status: "active";
  dueDate: string | null;
}) {
  const state = getCertificateExpiryState({ status, dueDate });

  return (
    <span className={badgeClassName(state)}>{formatPortalExpiryLabel(state)}</span>
  );
}



