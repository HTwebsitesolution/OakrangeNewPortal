import { NextResponse, type NextRequest } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { logAdminAudit } from "@/lib/audit/log";
import { CERTIFICATES_BUCKET } from "@/lib/certificates/storage";
import { loadCertificateForAdmin } from "@/lib/certificates/service";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

function requestMetadata(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function GET(
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
  const { certificate, error } = await loadCertificateForAdmin(session.supabase, id);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
  }
  if (!certificate.storage_path) {
    return NextResponse.json(
      { error: "Certificate file path is missing." },
      { status: 400 }
    );
  }

  const intent =
    request.nextUrl.searchParams.get("intent") === "download"
      ? "download"
      : "view";
  const service = createServiceRoleClient();
  const { data, error: signedUrlError } = await service.storage
    .from(CERTIFICATES_BUCKET)
    .createSignedUrl(
      certificate.storage_path,
      60,
      intent === "download"
        ? { download: certificate.download_file_name }
        : undefined
    );

  if (signedUrlError || !data?.signedUrl) {
    return NextResponse.json(
      { error: signedUrlError?.message ?? "Could not create a signed URL." },
      { status: 404 }
    );
  }

  const metadata = requestMetadata(request);
  const { error: auditError } = await logAdminAudit(session.supabase, {
    actorProfileId: session.profile.id,
    actorRole: session.profile.role,
    action:
      intent === "download"
        ? "certificate_downloaded_admin"
        : "certificate_viewed_admin",
    entityType: "certificate_document",
    entityId: certificate.id,
    companyId: certificate.company_id,
    siteId: certificate.site_id,
    metadata: {
      display_title: certificate.display_title,
      download_file_name: certificate.download_file_name,
      intent,
    },
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
  });

  if (auditError) {
    console.warn(
      `Audit log (${intent === "download" ? "certificate_downloaded_admin" : "certificate_viewed_admin"}) failed:`,
      auditError.message
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
