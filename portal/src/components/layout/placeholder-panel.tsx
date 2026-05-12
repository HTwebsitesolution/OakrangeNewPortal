export function PlaceholderPanel({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {description ??
          "This area will be implemented in a later phase. Navigation is available above."}
      </p>
    </div>
  );
}
