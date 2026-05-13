"use client";

type LogoutButtonProps = {
  className?: string;
};

/**
 * Full sign-out must hit the server so Supabase SSR cookies are cleared.
 * @see app/auth/signout/route.ts
 */
export function LogoutButton({ className }: LogoutButtonProps) {
  return (
    <form action="/auth/signout" method="POST" className="inline">
      <button
        type="submit"
        className={
          className ??
          "rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
        }
      >
        Logout
      </button>
    </form>
  );
}
