export function AuditMetadataPanel({
  metadata,
}: {
  metadata: Record<string, unknown> | null;
}) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return <p className="text-sm text-zinc-500">No additional metadata.</p>;
  }

  return (
    <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
      {JSON.stringify(metadata, null, 2)}
    </pre>
  );
}
