import { brand } from "@/lib/copy/brand";

const linkClass = "font-medium text-oak-navy hover:text-oak-orange dark:text-zinc-50";

export default function PortalSupportPage() {
  const { phone, phoneTel } = brand.auth.login;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Support</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        For help with your certificates or portal access, contact Oakrange.
      </p>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">Oakrange support</p>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Email:{" "}
          {brand.portal.supportEmails.map((email, i) => (
            <span key={email}>
              {i > 0 ? " or " : null}
              <a href={`mailto:${email}`} className={linkClass}>
                {email}
              </a>
            </span>
          ))}
        </p>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Phone:{" "}
          <a href={`tel:${phoneTel}`} className={linkClass}>
            {phone}
          </a>
        </p>
        <p className="mt-3 text-zinc-500">
          Online ticketing is not available in this release. Your account manager can help with
          urgent certificate requests.
        </p>
      </div>
    </div>
  );
}
