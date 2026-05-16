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

export function startOfUtcDay(input = new Date()): Date {
  return new Date(
    Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate())
  );
}

export function addUtcDays(input: Date, days: number): Date {
  const next = new Date(input);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function formatPortalExpiryLabel(state: CertificateExpiryState): string {
  if (state === "expired") return "Expired";
  if (state === "no_due_date") return "No due date";
  if (state === "active") return "Active";
  return state.replaceAll("_", " ");
}

export function isCertificateExpiringSoon(input: {
  dueDate: string | null;
  status: CertificateStatus;
  withinDays?: number;
  today?: Date;
}): boolean {
  if (input.status !== "active" || !input.dueDate) return false;

  const expiryState = getCertificateExpiryState({
    status: input.status,
    dueDate: input.dueDate,
    today: input.today,
  });
  if (expiryState !== "active") return false;

  const due = parseDateOnly(input.dueDate);
  const today = startOfUtcDay(input.today ?? new Date());
  const horizon = addUtcDays(today, input.withinDays ?? 30);
  return due >= today && due <= horizon;
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
  const day = startOfUtcDay(input.today ?? new Date());

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
