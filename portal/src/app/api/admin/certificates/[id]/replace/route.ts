import { NextResponse, type NextRequest } from "next/server";
import { one } from "@/lib/admin/embed";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import {
  loadCertificateForAdmin,
  parseCertificateUploadFormData,
  replaceCertificateDocument,
  revalidateCertificatePaths,
} from "@/lib/certificates/service";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

function auditMetadata(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdminRoute();
  if (response) {
    return response;
  }
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const { certificate, error: certificateError } = await loadCertificateForAdmin(
    session.supabase,
    id
  );
  if (certificateError) {
    return NextResponse.json({ error: certificateError }, { status: 400 });
  }
  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
  }

  const company = one(certificate.companies);
  const site = one(certificate.sites);
  if (!company) {
    return NextResponse.json(
      { error: "Certificate customer context could not be loaded." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const parsed = parseCertificateUploadFormData(formData);
  if (parsed.error || !parsed.input || !parsed.file) {
    return NextResponse.json(
      { error: parsed.error ?? "Invalid replacement upload." },
      { status: 400 }
    );
  }

  const service = createServiceRoleClient();
  const { error, result } = await replaceCertificateDocument({
    supabase: session.supabase,
    service,
    actor: session.profile,
    existing: {
      ...certificate,
      company_name: company.company_name,
      customer_id_readable: company.customer_id_readable,
      site_name: site?.site_name ?? null,
      company_status: company.status,
      site_status: site?.status ?? null,
    },
    input: {
      issueDate: parsed.input.issueDate,
      dueDate: parsed.input.dueDate,
      notes: parsed.input.notes,
      displayTitleOverride: parsed.input.displayTitleOverride,
      originalFileName: parsed.input.originalFileName,
      fileSizeBytes: parsed.input.fileSizeBytes,
      mimeType: parsed.input.mimeType,
      tags: parsed.input.tags,
    },
    file: parsed.file,
    audit: auditMetadata(request),
  });

  if (error || !result) {
    return NextResponse.json(
      { error: error ?? "Certificate replacement failed." },
      { status: 400 }
    );
  }

  revalidateCertificatePaths({
    certificateId: result.certificateId,
    companyId: result.companyId,
    siteId: result.siteId,
    extraCertificateIds: [certificate.id],
  });

  return NextResponse.json({
    ok: true,
    redirectTo: `/admin/certificates/${result.certificateId}?flash=replaced&previous=${certificate.id}`,
  });
}
