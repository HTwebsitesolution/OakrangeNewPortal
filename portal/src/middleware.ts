import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets, image optimization files,
     * and Phase 5 certificate API uploads/downloads that need raw multipart bodies
     * and JSON auth responses from their own route handlers.
     */
    "/((?!api/admin/certificates|api/portal/certificates|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
