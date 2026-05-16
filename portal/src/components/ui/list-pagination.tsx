import Link from "next/link";
import { buildPageHref } from "@/lib/pagination";

export function ListPagination({
  basePath,
  searchParams,
  page,
  hasMore,
  rowCount,
}: {
  basePath: string;
  searchParams: URLSearchParams;
  page: number;
  hasMore: boolean;
  rowCount: number;
}) {
  if (page <= 1 && !hasMore) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Showing {rowCount} {rowCount === 1 ? "row" : "rows"}.
      </p>
    );
  }

  const prevHref = page > 1 ? buildPageHref(basePath, searchParams, page - 1) : null;
  const nextHref = hasMore ? buildPageHref(basePath, searchParams, page + 1) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Page {page}
        {rowCount > 0 ? ` · ${rowCount} on this page` : ""}
      </p>
      <div className="flex gap-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400 dark:border-zinc-800">
            Previous
          </span>
        )}
        {nextHref ? (
          <Link
            href={nextHref}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400 dark:border-zinc-800">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
