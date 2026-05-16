import { Button } from "@/components/ui/button";

export function PortalCertificateActions({ certificateId }: { certificateId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button href={`/portal/certificates/${certificateId}`} variant="secondary" className="px-3 py-1.5">
        Details
      </Button>
      <Button
        href={`/api/portal/certificates/${certificateId}/signed-url?intent=view`}
        variant="secondary"
        className="px-3 py-1.5"
        target="_blank"
        rel="noopener noreferrer"
      >
        View PDF
      </Button>
      <Button
        href={`/api/portal/certificates/${certificateId}/signed-url?intent=download`}
        variant="primary"
        className="px-3 py-1.5"
      >
        Download
      </Button>
    </div>
  );
}
