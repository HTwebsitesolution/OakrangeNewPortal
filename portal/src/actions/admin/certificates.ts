"use server";

import { requireAdminSupabase } from "@/lib/auth/require-session";
import { logAdminAudit } from "@/lib/audit/log";
import { revalidateCertificatePaths } from "@/lib/certificates/service";

export type CertificateActionState = {
  ok?: boolean;
  error?: string;
  success?: "voided" | "archived";
};

async function updateCertificateStatus(
  certificateId: string,
  nextStatus: "void" | "archived",
  success: "voided" | "archived"
): Promise<CertificateActionState> {
  const { supabase, profile } = await requireAdminSupabase();

  const { data: certificate, error: loadError } = await supabase
    .from("certificate_documents")
    .select("id, company_id, site_id, status, document_type, display_title")
    .eq("id", certificateId)
    .maybeSingle();

  if (loadError) {
    return { error: loadError.message };
  }

  if (!certificate) {
    return { error: "Certificate not found." };
  }

  if (certificate.status !== "active") {
    return {
      error: `Only active certificates can be ${nextStatus === "void" ? "voided" : "archived"}.`,
    };
  }

  const { error: updateError } = await supabase
    .from("certificate_documents")
    .update({ status: nextStatus })
    .eq("id", certificateId)
    .eq("status", "active");

  if (updateError) {
    return { error: updateError.message };
  }

  const { error: auditError } = await logAdminAudit(supabase, {
    actorProfileId: profile.id,
    actorRole: profile.role,
    action: nextStatus === "void" ? "certificate_voided" : "certificate_archived",
    entityType: "certificate_document",
    entityId: certificateId,
    companyId: certificate.company_id,
    siteId: certificate.site_id,
    metadata: {
      document_type: certificate.document_type,
      display_title: certificate.display_title,
      previous_status: certificate.status,
      next_status: nextStatus,
    },
  });

  if (auditError) {
    console.warn(
      `Audit log (${nextStatus === "void" ? "certificate_voided" : "certificate_archived"}) failed:`,
      auditError.message
    );
  }

  revalidateCertificatePaths({
    certificateId,
    companyId: certificate.company_id,
    siteId: certificate.site_id,
  });

  return { ok: true, success };
}

export async function voidCertificateAction(
  certificateId: string,
  prev: CertificateActionState
): Promise<CertificateActionState> {
  void prev;
  return updateCertificateStatus(certificateId, "void", "voided");
}

export async function archiveCertificateAction(
  certificateId: string,
  prev: CertificateActionState
): Promise<CertificateActionState> {
  void prev;
  return updateCertificateStatus(certificateId, "archived", "archived");
}
