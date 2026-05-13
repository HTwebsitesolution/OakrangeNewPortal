import "server-only";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logAdminAudit } from "@/lib/audit/log";
import { parseCertificateDocumentType } from "@/lib/certificates/document-types";
import {
  buildCertificateDisplayTitle,
  buildCertificateDownloadFilename,
  getCertificatePublishedMessage,
} from "@/lib/certificates/format";
import {
  CERTIFICATES_BUCKET,
  buildCertificateStoragePath,
} from "@/lib/certificates/storage";
import type {
  CertificateStatus,
  CertificateUploadContext,
  CertificateUploadValues,
} from "@/lib/certificates/types";
import {
  buildCertificateUploadValues,
  normalizeCertificateTags,
  validateCertificatePdf,
  validateCertificateUploadInput,
  type CertificateUploadInput,
} from "@/lib/certificates/validation";
import type { SessionProfile } from "@/types/profile";

type AuditRequestMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

type CreateServiceRoleClient = {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        file: File,
        options: { contentType: string; upsert: boolean }
      ): Promise<{ error: { message: string } | null }>;
      remove(paths: string[]): Promise<{ error: { message: string } | null }>;
      createSignedUrl(
        path: string,
        expiresIn: number,
        options?: { download?: string | boolean }
      ): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
    };
  };
};

type UploadActor = Pick<SessionProfile, "id" | "role">;

export type CertificateRouteSource = "global" | "customer" | "site" | "replace";

export type PublishedCertificateResult = {
  certificateId: string;
  displayTitle: string;
  downloadFileName: string;
  successMessage: string;
  companyId: string;
  siteId: string | null;
};

type StoredCertificateRow = {
  id: string;
  company_id: string;
  site_id: string | null;
  document_type: string;
  original_file_name: string;
  display_title: string;
  download_file_name: string;
  storage_path: string;
  file_size_bytes: number | null;
  mime_type: string;
  issue_date: string;
  due_date: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  published_at: string | null;
  status: CertificateStatus;
  notes: string | null;
  search_tags: string[] | null;
  replaced_by_document_id: string | null;
};

type BaseUploadOptions = {
  supabase: SupabaseClient;
  service: CreateServiceRoleClient;
  actor: UploadActor;
  context: CertificateUploadContext;
  values: CertificateUploadValues;
  file: File;
  audit?: AuditRequestMetadata;
};

function textValue(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalTextValue(formData: FormData, key: string): string | null {
  const value = textValue(formData, key);
  return value || null;
}

async function removeStorageObject(
  service: CreateServiceRoleClient,
  storagePath: string
): Promise<void> {
  const { error } = await service.storage
    .from(CERTIFICATES_BUCKET)
    .remove([storagePath]);
  if (error) {
    console.warn("Certificate storage cleanup failed:", error.message);
  }
}

async function deleteDraftRow(
  supabase: SupabaseClient,
  certificateId: string
): Promise<void> {
  const { error } = await supabase
    .from("certificate_documents")
    .delete()
    .eq("id", certificateId);
  if (error) {
    console.warn("Certificate row cleanup failed:", error.message);
  }
}

function buildInsertRow(
  certificateId: string,
  values: CertificateUploadValues,
  actorProfileId: string
) {
  const displayTitle = buildCertificateDisplayTitle({
    companyName: values.companyName,
    siteName: values.siteName,
    documentType: values.documentType,
    issueDate: values.issueDate,
    displayTitleOverride: values.displayTitleOverride,
  });
  const downloadFileName = buildCertificateDownloadFilename({
    companyName: values.companyName,
    siteName: values.siteName,
    documentType: values.documentType,
    issueDate: values.issueDate,
  });
  const storagePath = buildCertificateStoragePath({
    companyId: values.companyId,
    siteId: values.siteId,
    certificateId,
  });

  return {
    row: {
      id: certificateId,
      company_id: values.companyId,
      site_id: values.siteId,
      document_type: values.documentType,
      original_file_name: values.originalFileName,
      display_title: displayTitle,
      download_file_name: downloadFileName,
      storage_path: storagePath,
      file_size_bytes: values.fileSizeBytes,
      mime_type: values.mimeType,
      issue_date: values.issueDate,
      due_date: values.dueDate,
      uploaded_by: actorProfileId,
      published_at: null,
      status: "active" as const,
      notes: values.notes,
      search_tags: values.tags.length > 0 ? values.tags : null,
      replaced_by_document_id: null,
    },
    displayTitle,
    downloadFileName,
    storagePath,
  };
}

async function finalizeCertificatePublish(
  supabase: SupabaseClient,
  certificateId: string
): Promise<string> {
  const publishedAt = new Date().toISOString();
  const { error } = await supabase
    .from("certificate_documents")
    .update({ published_at: publishedAt })
    .eq("id", certificateId);
  if (error) {
    throw new Error(error.message);
  }
  return publishedAt;
}

async function logCertificateAudit(
  supabase: SupabaseClient,
  actor: UploadActor,
  action:
    | "certificate_uploaded"
    | "certificate_published"
    | "certificate_replaced"
    | "certificate_voided"
    | "certificate_archived"
    | "certificate_viewed_admin"
    | "certificate_downloaded_admin",
  input: {
    certificateId: string;
    companyId: string;
    siteId: string | null;
    metadata: Record<string, unknown>;
    audit?: AuditRequestMetadata;
  }
): Promise<void> {
  const { error } = await logAdminAudit(supabase, {
    actorProfileId: actor.id,
    actorRole: actor.role,
    action,
    entityType: "certificate_document",
    entityId: input.certificateId,
    companyId: input.companyId,
    siteId: input.siteId,
    metadata: input.metadata,
    ipAddress: input.audit?.ipAddress,
    userAgent: input.audit?.userAgent,
  });

  if (error) {
    console.warn(`Audit log (${action}) failed:`, error.message);
  }
}

export function parseCertificateUploadFormData(formData: FormData): {
  error: string | null;
  file: File | null;
  input: CertificateUploadInput | null;
} {
  const companyId = textValue(formData, "company_id");
  const siteId = optionalTextValue(formData, "site_id");
  const documentType = parseCertificateDocumentType(
    textValue(formData, "document_type")
  );
  if (!documentType) {
    return { error: "Document type is required.", file: null, input: null };
  }

  const fileValue = formData.get("file");
  const file = fileValue instanceof File ? fileValue : null;
  const pdf = validateCertificatePdf(file);
  if (pdf.error) {
    return { error: pdf.error, file, input: null };
  }

  return {
    error: null,
    file,
    input: {
      companyId,
      siteId,
      documentType,
      issueDate: textValue(formData, "issue_date"),
      dueDate: optionalTextValue(formData, "due_date"),
      notes: optionalTextValue(formData, "notes"),
      displayTitleOverride: optionalTextValue(formData, "display_title_override"),
      originalFileName: pdf.originalFileName,
      fileSizeBytes: pdf.fileSizeBytes,
      mimeType: pdf.mimeType,
      tags: normalizeCertificateTags(textValue(formData, "tags")),
    },
  };
}

export async function loadCertificateUploadContext(
  supabase: SupabaseClient,
  companyId: string,
  siteId: string | null
): Promise<{ context: CertificateUploadContext | null; error: string | null }> {
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, company_name, customer_id_readable, status")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    return { context: null, error: companyError.message };
  }

  if (!company) {
    return { context: null, error: "Customer not found." };
  }

  if (!siteId) {
    return {
      context: {
        companyId: company.id,
        companyName: company.company_name,
        customerIdReadable: company.customer_id_readable,
        companyStatus: company.status,
        siteId: null,
        siteName: null,
        siteStatus: null,
      },
      error: null,
    };
  }

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, site_name, status")
    .eq("id", siteId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (siteError) {
    return { context: null, error: siteError.message };
  }

  if (!site) {
    return { context: null, error: "Site not found for this customer." };
  }

  return {
    context: {
      companyId: company.id,
      companyName: company.company_name,
      customerIdReadable: company.customer_id_readable,
      companyStatus: company.status,
      siteId: site.id,
      siteName: site.site_name,
      siteStatus: site.status,
    },
    error: null,
  };
}

export async function publishCertificateDocument(
  options: BaseUploadOptions
): Promise<{ error: string | null; result: PublishedCertificateResult | null }> {
  const validationError = validateCertificateUploadInput(
    options.context,
    options.values
  );
  if (validationError) {
    return { error: validationError, result: null };
  }

  const certificateId = crypto.randomUUID();
  const { row, displayTitle, downloadFileName, storagePath } = buildInsertRow(
    certificateId,
    options.values,
    options.actor.id
  );

  const { error: insertError } = await options.supabase
    .from("certificate_documents")
    .insert(row);
  if (insertError) {
    return { error: insertError.message, result: null };
  }

  const storage = options.service.storage.from(CERTIFICATES_BUCKET);
  const { error: uploadError } = await storage.upload(storagePath, options.file, {
    contentType: options.values.mimeType,
    upsert: false,
  });

  if (uploadError) {
    await deleteDraftRow(options.supabase, certificateId);
    return { error: uploadError.message, result: null };
  }

  await logCertificateAudit(options.supabase, options.actor, "certificate_uploaded", {
    certificateId,
    companyId: options.values.companyId,
    siteId: options.values.siteId,
    metadata: {
      document_type: options.values.documentType,
      original_file_name: options.values.originalFileName,
      display_title: displayTitle,
      download_file_name: downloadFileName,
      issue_date: options.values.issueDate,
      due_date: options.values.dueDate,
      status: "active",
    },
    audit: options.audit,
  });

  try {
    await finalizeCertificatePublish(options.supabase, certificateId);
  } catch (error) {
    await removeStorageObject(options.service, storagePath);
    await deleteDraftRow(options.supabase, certificateId);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to publish certificate.",
      result: null,
    };
  }

  await logCertificateAudit(options.supabase, options.actor, "certificate_published", {
    certificateId,
    companyId: options.values.companyId,
    siteId: options.values.siteId,
    metadata: {
      document_type: options.values.documentType,
      display_title: displayTitle,
      download_file_name: downloadFileName,
      published_at: new Date().toISOString(),
    },
    audit: options.audit,
  });

  return {
    error: null,
    result: {
      certificateId,
      displayTitle,
      downloadFileName,
      successMessage: getCertificatePublishedMessage({
        companyName: options.values.companyName,
        siteName: options.values.siteName,
      }),
      companyId: options.values.companyId,
      siteId: options.values.siteId,
    },
  };
}

export async function replaceCertificateDocument(options: {
  supabase: SupabaseClient;
  service: CreateServiceRoleClient;
  actor: UploadActor;
  existing: StoredCertificateRow & {
    company_name: string;
    customer_id_readable: string;
    site_name: string | null;
    company_status: "active" | "inactive";
    site_status: "active" | "inactive" | null;
  };
  input: Omit<
    CertificateUploadInput,
    "companyId" | "siteId" | "documentType"
  > & { documentType?: never; companyId?: never; siteId?: never };
  file: File;
  audit?: AuditRequestMetadata;
}): Promise<{ error: string | null; result: PublishedCertificateResult | null }> {
  if (options.existing.status !== "active") {
    return {
      error: "Only active certificates can be replaced.",
      result: null,
    };
  }

  const { error, result } = await publishCertificateDocument({
    supabase: options.supabase,
    service: options.service,
    actor: options.actor,
    context: {
      companyId: options.existing.company_id,
      companyName: options.existing.company_name,
      customerIdReadable: options.existing.customer_id_readable,
      companyStatus: options.existing.company_status,
      siteId: options.existing.site_id,
      siteName: options.existing.site_name,
      siteStatus: options.existing.site_status,
    },
    values: buildCertificateUploadValues(
      {
        companyId: options.existing.company_id,
        companyName: options.existing.company_name,
        customerIdReadable: options.existing.customer_id_readable,
        companyStatus: options.existing.company_status,
        siteId: options.existing.site_id,
        siteName: options.existing.site_name,
        siteStatus: options.existing.site_status,
      },
      {
        companyId: options.existing.company_id,
        siteId: options.existing.site_id,
        documentType: options.existing.document_type as CertificateUploadValues["documentType"],
        issueDate: options.input.issueDate,
        dueDate: options.input.dueDate,
        notes: options.input.notes,
        displayTitleOverride: options.input.displayTitleOverride,
        originalFileName: options.input.originalFileName,
        fileSizeBytes: options.input.fileSizeBytes,
        mimeType: options.input.mimeType,
        tags: options.input.tags,
      }
    ),
    file: options.file,
    audit: options.audit,
  });

  if (error || !result) {
    return { error: error ?? "Failed to replace certificate.", result: null };
  }

  const { error: updateError } = await options.supabase
    .from("certificate_documents")
    .update({
      status: "replaced",
      replaced_by_document_id: result.certificateId,
    })
    .eq("id", options.existing.id)
    .eq("status", "active");

  if (updateError) {
    return { error: updateError.message, result: null };
  }

  await logCertificateAudit(options.supabase, options.actor, "certificate_replaced", {
    certificateId: options.existing.id,
    companyId: options.existing.company_id,
    siteId: options.existing.site_id,
    metadata: {
      replacement_certificate_id: result.certificateId,
      replaced_from_status: options.existing.status,
    },
    audit: options.audit,
  });

  return { error: null, result };
}

export function revalidateCertificatePaths(input: {
  certificateId: string;
  companyId: string;
  siteId: string | null;
  extraCertificateIds?: string[];
}): void {
  const paths = new Set<string>([
    "/admin/certificates",
    `/admin/certificates/${input.certificateId}`,
    `/admin/customers/${input.companyId}/certificates`,
    `/admin/customers/${input.companyId}`,
    `/admin/customers/${input.companyId}/sites`,
  ]);

  if (input.siteId) {
    paths.add(`/admin/customers/${input.companyId}/sites/${input.siteId}`);
    paths.add(`/admin/customers/${input.companyId}/sites/${input.siteId}/certificates`);
  }

  for (const extraId of input.extraCertificateIds ?? []) {
    paths.add(`/admin/certificates/${extraId}`);
  }

  for (const path of paths) {
    revalidatePath(path);
  }
}

export async function loadCertificateForAdmin(
  supabase: SupabaseClient,
  certificateId: string
): Promise<{
  certificate: (StoredCertificateRow & {
    companies: {
      id: string;
      company_name: string;
      customer_id_readable: string;
      status: "active" | "inactive";
    } | null;
    sites: { id: string; site_name: string; status: "active" | "inactive" } | null;
    profiles: { id: string; email: string; full_name: string } | null;
  }) | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("certificate_documents")
    .select(
      "*, companies(id, company_name, customer_id_readable, status), sites(id, site_name, status), profiles(id, email, full_name)"
    )
    .eq("id", certificateId)
    .maybeSingle();

  if (error) {
    return { certificate: null, error: error.message };
  }

  return {
    certificate: data as
      | (StoredCertificateRow & {
          companies: {
            id: string;
            company_name: string;
            customer_id_readable: string;
            status: "active" | "inactive";
          } | null;
          sites: { id: string; site_name: string; status: "active" | "inactive" } | null;
          profiles: { id: string; email: string; full_name: string } | null;
        })
      | null,
    error: null,
  };
}
