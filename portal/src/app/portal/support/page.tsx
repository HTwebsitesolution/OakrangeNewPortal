export default function PortalSupportPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Support</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        For help with your certificates or portal access, contact Oakrange.
      </p>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">Oakrange support</p>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Email: support@oakrange.co.uk (placeholder)
        </p>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Phone: 0114 000 0000 (placeholder)
        </p>
        <p className="mt-3 text-zinc-500">
          Online ticketing is not available in this release. Your account manager can help with
          urgent certificate requests.
        </p>
      </div>
    </div>
  );
}
