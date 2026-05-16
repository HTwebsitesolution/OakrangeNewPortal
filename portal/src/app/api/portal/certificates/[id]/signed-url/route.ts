import { NextResponse, type NextRequest } from "next/server";
import { logAdminAudit } from "@/lib/audit/log";
import { requirePortalRoute } from "@/lib/auth/require-portal-route";
import { getPortalCertificateForSignedUrl } from "@/lib/certificates/portal-queries";
import { CERTIFICATES_BUCKET } from "@/lib/certificates/storage";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SECONDS = 120;

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
  const { session, response } = await requirePortalRoute();
  if (response) {
    return response;
  }
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const { certificate, error } = await getPortalCertificateForSignedUrl(
    session.supabase,
    id
  );

  if (error) {
    return NextResponse.json({ error: "Could not access certificate." }, { status: 400 });
  }
  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
  }

  const intent =
    request.nextUrl.searchParams.get("intent") === "download" ? "download" : "view";

  const service = createServiceRoleClient();
  const { data, error: signedUrlError } = await service.storage
    .from(CERTIFICATES_BUCKET)
    .createSignedUrl(
      certificate.storage_path,
      SIGNED_URL_TTL_SECONDS,
      intent === "download"
        ? { download: certificate.download_file_name }
        : undefined
    );

  if (signedUrlError || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Could not create a signed URL." },
      { status: 404 }
    );
  }

  const metadata = requestMetadata(request);
  const { error: auditError } = await logAdminAudit(session.supabase, {
    actorProfileId: session.profile.id,
    actorRole: session.profile.role,
    action:
      intent === "download"
        ? "certificate_downloaded_customer"
        : "certificate_viewed_customer",
    entityType: "certificate_document",
    entityId: certificate.id,
    companyId: certificate.company_id,
    siteId: certificate.site_id,
    metadata: {
      intent,
      display_title: certificate.display_title,
      download_file_name: certificate.download_file_name,
    },
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
  });

  if (auditError) {
    console.warn("Customer certificate audit log failed:", auditError.message);
  }

  return NextResponse.redirect(data.signedUrl);
}
