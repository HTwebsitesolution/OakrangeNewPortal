import type { CertificateDocumentType } from "@/lib/certificates/types";

export const CERTIFICATE_DOCUMENT_TYPES: Array<{
  value: CertificateDocumentType;
  label: string;
}> = [
  { value: "calibration_certificate", label: "Calibration Certificate" },
  { value: "service_report", label: "Service Report" },
  { value: "inspection_certificate", label: "Inspection Certificate" },
  { value: "repair_certificate", label: "Repair Certificate" },
  { value: "other_certificate", label: "Other Certificate" },
];

export function parseCertificateDocumentType(
  value: string | null | undefined
): CertificateDocumentType | null {
  const match = CERTIFICATE_DOCUMENT_TYPES.find((item) => item.value === value);
  return match?.value ?? null;
}

export function getCertificateDocumentTypeLabel(
  value: CertificateDocumentType
): string {
  return (
    CERTIFICATE_DOCUMENT_TYPES.find((item) => item.value === value)?.label ??
    value
  );
}
