import { getCertificateDocumentTypeLabel } from "@/lib/certificates/document-types";
import type {
  CertificateDocumentType,
  CertificateExpiryState,
  CertificateStatus,
} from "@/lib/certificates/types";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function parseDateOnly(input: string): Date {
  return new Date(`${input}T00:00:00.000Z`);
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeFilenameSegment(value: string): string {
  return compactWhitespace(
    value
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
      .replace(/\.+$/g, "")
      .replace(/[\u{0080}-\u{FFFF}]/gu, " ")
  );
}

export function formatCertificateDate(input: string): string {
  return DATE_FORMATTER.format(parseDateOnly(input));
}

export function buildCertificateDisplayTitle(input: {
  companyName: string;
  siteName: string | null;
  documentType: CertificateDocumentType;
  issueDate: string;
  displayTitleOverride?: string | null;
}): string {
  const override = compactWhitespace(input.displayTitleOverride ?? "");
  if (override) {
    return override;
  }

  const base = [
    input.siteName ? input.siteName : input.companyName,
    getCertificateDocumentTypeLabel(input.documentType),
    formatCertificateDate(input.issueDate),
  ];

  return compactWhitespace(base.join(" - "));
}

export function buildCertificateDownloadFilename(input: {
  companyName: string;
  siteName: string | null;
  documentType: CertificateDocumentType;
  issueDate: string;
}): string {
  const parts = [
    sanitizeFilenameSegment(input.companyName),
    input.siteName ? sanitizeFilenameSegment(input.siteName) : null,
    sanitizeFilenameSegment(getCertificateDocumentTypeLabel(input.documentType)),
    sanitizeFilenameSegment(formatCertificateDate(input.issueDate)),
  ].filter(Boolean) as string[];

  return `${parts.join(" - ")}.pdf`;
}

export function getCertificateExpiryState(input: {
  status: CertificateStatus;
  dueDate: string | null;
  today?: Date;
}): CertificateExpiryState {
  if (input.status === "void") return "void";
  if (input.status === "replaced") return "replaced";
  if (input.status === "archived") return "archived";
  if (!input.dueDate) return "no_due_date";

  const due = parseDateOnly(input.dueDate);
  const today = input.today ?? new Date();
  const day = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  return due < day ? "expired" : "active";
}

export function getCertificatePublishedMessage(input: {
  companyName: string;
  siteName: string | null;
}): string {
  if (input.siteName) {
    return `Certificate published successfully. This document is now visible to authorised users for: ${input.companyName} — ${input.siteName}`;
  }

  return `Certificate published successfully. This document is now visible to authorised company-level users for: ${input.companyName}`;
}
