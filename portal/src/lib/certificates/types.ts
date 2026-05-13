export const CERTIFICATE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CertificateStatus =
  | "active"
  | "void"
  | "replaced"
  | "archived";

export type CertificateDocumentType =
  | "calibration_certificate"
  | "service_report"
  | "inspection_certificate"
  | "repair_certificate"
  | "other_certificate";

export type CertificateExpiryState =
  | "active"
  | "expired"
  | "no_due_date"
  | "void"
  | "replaced"
  | "archived";

export type CertificateUploadValues = {
  companyId: string;
  companyName: string;
  customerIdReadable: string;
  siteId: string | null;
  siteName: string | null;
  documentType: CertificateDocumentType;
  issueDate: string;
  dueDate: string | null;
  notes: string | null;
  tags: string[];
  displayTitleOverride: string | null;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
};

export type CertificateUploadContext = {
  companyId: string;
  companyName: string;
  customerIdReadable: string;
  companyStatus: "active" | "inactive";
  siteId: string | null;
  siteName: string | null;
  siteStatus: "active" | "inactive" | null;
};
