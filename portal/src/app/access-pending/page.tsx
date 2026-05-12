import Link from "next/link";

export default function AccessPendingPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Access not ready
      </h1>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Your account exists, but no portal profile is linked yet. Oakrange must
        finish setting up your user before you can sign in.
      </p>
      <p className="mt-8">
        <Link
          href="/login"
          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
