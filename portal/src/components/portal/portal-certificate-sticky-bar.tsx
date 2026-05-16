import { brand } from "@/lib/copy/brand";
import { Button } from "@/components/ui/button";

export function PortalCertificateStickyBar({ certificateId }: { certificateId: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-oak-border bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-6xl gap-2">
        <Button
          href={`/api/portal/certificates/${certificateId}/signed-url?intent=view`}
          variant="secondary"
          className="min-h-11 flex-1"
          target="_blank"
          rel="noopener noreferrer"
        >
          {brand.portal.mobileViewPdf}
        </Button>
        <Button
          href={`/api/portal/certificates/${certificateId}/signed-url?intent=download`}
          variant="primary"
          className="min-h-11 flex-1"
        >
          {brand.portal.mobileDownload}
        </Button>
      </div>
    </div>
  );
}
