export const CERTIFICATES_BUCKET = "certificates";
export const CERTIFICATE_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export function buildCertificateStoragePath(input: {
  companyId: string;
  siteId: string | null;
  certificateId: string;
}): string {
  return `certificates/${input.companyId}/${input.siteId ?? "company"}/${input.certificateId}.pdf`;
}
