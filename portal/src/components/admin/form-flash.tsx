"use client";

export function FormFlash({
  state,
}: {
  state: { error?: string; ok?: boolean };
}) {
  if (state.error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        Saved successfully.
      </p>
    );
  }
  return null;
}
