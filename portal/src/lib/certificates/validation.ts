import {
  CERTIFICATE_MAX_FILE_SIZE_BYTES,
} from "@/lib/certificates/storage";
import {
  CERTIFICATE_UUID_RE,
  type CertificateDocumentType,
  type CertificateUploadContext,
  type CertificateUploadValues,
} from "@/lib/certificates/types";

export type CertificateUploadInput = {
  companyId: string;
  siteId: string | null;
  documentType: CertificateDocumentType;
  issueDate: string;
  dueDate: string | null;
  notes: string | null;
  displayTitleOverride: string | null;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  tags: string[];
};

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function parseDateOnly(input: string): Date {
  return new Date(`${input}T00:00:00.000Z`);
}

export function normalizeCertificateTags(raw: string): string[] {
  return [...new Set(
    raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
  )];
}

export function validateCertificatePdf(file: File | null): {
  error: string | null;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
} {
  if (!file) {
    return {
      error: "A PDF file is required.",
      originalFileName: "",
      fileSizeBytes: 0,
      mimeType: "",
    };
  }

  const originalFileName = file.name.trim();
  const mimeType = file.type.trim();

  if (!originalFileName) {
    return {
      error: "Uploaded file must have a filename.",
      originalFileName,
      fileSizeBytes: file.size,
      mimeType,
    };
  }

  if (!originalFileName.toLowerCase().endsWith(".pdf")) {
    return {
      error: "Only PDF files are supported in Phase 5.",
      originalFileName,
      fileSizeBytes: file.size,
      mimeType,
    };
  }

  if (mimeType && mimeType !== "application/pdf") {
    return {
      error: "Uploaded file must be a PDF (`application/pdf`).",
      originalFileName,
      fileSizeBytes: file.size,
      mimeType,
    };
  }

  if (file.size <= 0) {
    return {
      error: "Uploaded PDF is empty.",
      originalFileName,
      fileSizeBytes: file.size,
      mimeType,
    };
  }

  if (file.size > CERTIFICATE_MAX_FILE_SIZE_BYTES) {
    return {
      error: "PDF exceeds the 20 MB upload limit for Phase 5.",
      originalFileName,
      fileSizeBytes: file.size,
      mimeType,
    };
  }

  return {
    error: null,
    originalFileName,
    fileSizeBytes: file.size,
    mimeType: mimeType || "application/pdf",
  };
}

export function validateCertificateUploadInput(
  context: CertificateUploadContext,
  input: CertificateUploadInput
): string | null {
  if (!CERTIFICATE_UUID_RE.test(input.companyId)) {
    return "Customer is required.";
  }

  if (input.companyId !== context.companyId) {
    return "Customer selection does not match the requested upload context.";
  }

  if (context.companyStatus !== "active") {
    return "Cannot publish a new certificate for an inactive customer.";
  }

  if (input.siteId && !CERTIFICATE_UUID_RE.test(input.siteId)) {
    return "Site selection is invalid.";
  }

  if (input.siteId !== context.siteId && context.siteId) {
    return "Site selection does not match the requested upload context.";
  }

  if (input.siteId && !context.siteId) {
    return "Selected site could not be validated for this customer.";
  }

  if (context.siteId && context.siteStatus !== "active") {
    return "Cannot publish a new certificate for an inactive site.";
  }

  if (!input.issueDate) {
    return "Issue / calibration date is required.";
  }

  if (Number.isNaN(parseDateOnly(input.issueDate).getTime())) {
    return "Issue / calibration date is invalid.";
  }

  if (input.dueDate && Number.isNaN(parseDateOnly(input.dueDate).getTime())) {
    return "Due date is invalid.";
  }

  if (
    input.dueDate &&
    parseDateOnly(input.dueDate).getTime() < parseDateOnly(input.issueDate).getTime()
  ) {
    return "Due date cannot be before the issue / calibration date.";
  }

  if (input.displayTitleOverride && input.displayTitleOverride.length > 200) {
    return "Display title override must be 200 characters or fewer.";
  }

  if (input.notes && input.notes.length > 2000) {
    return "Notes must be 2000 characters or fewer.";
  }

  if (input.tags.length > 20) {
    return "Use 20 tags or fewer.";
  }

  return null;
}

export function buildCertificateUploadValues(
  context: CertificateUploadContext,
  input: CertificateUploadInput
): CertificateUploadValues {
  return {
    companyId: context.companyId,
    companyName: context.companyName,
    customerIdReadable: context.customerIdReadable,
    siteId: context.siteId,
    siteName: context.siteName,
    documentType: input.documentType,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    notes: normalizeOptionalText(input.notes),
    tags: input.tags,
    displayTitleOverride: normalizeOptionalText(input.displayTitleOverride),
    originalFileName: input.originalFileName,
    fileSizeBytes: input.fileSizeBytes,
    mimeType: input.mimeType || "application/pdf",
  };
}
