import {
  formatPortalExpiryLabel,
  getCertificateExpiryState,
  isCertificateExpiringSoon,
} from "@/lib/certificates/format";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/status-badge";
import type { CertificateExpiryState } from "@/lib/certificates/types";

function variantForState(state: CertificateExpiryState): StatusBadgeVariant {
  if (state === "expired") return "expired";
  if (state === "no_due_date") return "neutral";
  return "active";
}

export function PortalExpiryBadge({
  status,
  dueDate,
}: {
  status: "active";
  dueDate: string | null;
}) {
  const state = getCertificateExpiryState({ status, dueDate });
  const expiringSoon =
    state === "active" &&
    isCertificateExpiringSoon({ status, dueDate });

  const variant = expiringSoon ? "expiring" : variantForState(state);
  const label = expiringSoon ? "Expiring soon" : formatPortalExpiryLabel(state);

  return <StatusBadge label={label} variant={variant} />;
}
