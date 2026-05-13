import { NextResponse, type NextRequest } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import {
  loadCertificateUploadContext,
  parseCertificateUploadFormData,
  publishCertificateDocument,
  revalidateCertificatePaths,
} from "@/lib/certificates/service";
import { CERTIFICATE_MAX_FILE_SIZE_BYTES } from "@/lib/certificates/storage";
import { buildCertificateUploadValues } from "@/lib/certificates/validation";
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

export async function POST(request: NextRequest) {
  const { session, response } = await requireAdminRoute();
  if (response) {
    return response;
  }
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    const contentLength = Number(request.headers.get("content-length") ?? "");
    const likelyOversize =
      Number.isFinite(contentLength) &&
      contentLength > CERTIFICATE_MAX_FILE_SIZE_BYTES;

    return NextResponse.json(
      {
        error: likelyOversize
          ? "PDF exceeds the 20 MB upload limit for Phase 5."
          : "Invalid certificate upload.",
      },
      { status: 400 }
    );
  }

  const parsed = parseCertificateUploadFormData(formData);
  if (parsed.error || !parsed.input || !parsed.file) {
    return NextResponse.json(
      { error: parsed.error ?? "Invalid certificate upload." },
      { status: 400 }
    );
  }

  const { context, error: contextError } = await loadCertificateUploadContext(
    session.supabase,
    parsed.input.companyId,
    parsed.input.siteId
  );
  if (contextError || !context) {
    return NextResponse.json(
      { error: contextError ?? "Certificate upload context could not be loaded." },
      { status: 400 }
    );
  }

  const service = createServiceRoleClient();
  const { error, result } = await publishCertificateDocument({
    supabase: session.supabase,
    service,
    actor: session.profile,
    context,
    values: buildCertificateUploadValues(context, parsed.input),
    file: parsed.file,
    audit: auditMetadata(request),
  });

  if (error || !result) {
    return NextResponse.json(
      { error: error ?? "Certificate upload failed." },
      { status: 400 }
    );
  }

  revalidateCertificatePaths({
    certificateId: result.certificateId,
    companyId: result.companyId,
    siteId: result.siteId,
  });

  return NextResponse.json({
    ok: true,
    redirectTo: `/admin/certificates/${result.certificateId}?flash=published`,
  });
}
