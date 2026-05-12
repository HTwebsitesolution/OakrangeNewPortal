import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Not allowed
      </h1>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        You do not have permission to view that area. Use the navigation from
        your dashboard, or sign in with a different account.
      </p>
      <p className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
        <Link
          href="/portal/dashboard"
          className="font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Customer portal
        </Link>
        <Link
          href="/admin/dashboard"
          className="font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Admin dashboard
        </Link>
      </p>
    </main>
  );
}
