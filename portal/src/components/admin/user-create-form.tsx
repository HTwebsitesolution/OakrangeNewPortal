"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createPortalUserAction, type UserActionState } from "@/actions/admin/users";
import { USER_ROLES } from "@/lib/admin/validation";
import { FormFlash } from "@/components/admin/form-flash";
import type { UserRole } from "@/types/profile";

type CompanyOption = { id: string; company_name: string };

export function UserCreateForm({
  companies,
  defaultCompanyId,
}: {
  companies: CompanyOption[];
  defaultCompanyId?: string | null;
}) {
  const [state, formAction, pending] = useActionState(createPortalUserAction, {} as UserActionState);
  const [role, setRole] = useState<UserRole>("customer_user");
  const needsCompany = role === "site_manager" || role === "customer_user";

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        Creates a real Supabase Auth user and profile using the service role key. Share the
        temporary password securely; invitation email is not wired in this phase.
      </div>
      <form action={formAction} className="space-y-4">
        <FormFlash state={state} />
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-zinc-600">
            Email <span className="text-red-600">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="full_name" className="block text-xs font-medium text-zinc-600">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-xs font-medium text-zinc-600">
            Role <span className="text-red-600">*</span>
          </label>
          <select
            id="role"
            name="role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          >
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {needsCompany ? (
          <div>
            <label htmlFor="company_id" className="block text-xs font-medium text-zinc-600">
              Company <span className="text-red-600">*</span>
            </label>
            <select
              id="company_id"
              name="company_id"
              required={needsCompany}
              defaultValue={defaultCompanyId ?? ""}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            >
              <option value="">Select company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="company_id" value="" />
        )}
        <div>
          <label htmlFor="temp_password" className="block text-xs font-medium text-zinc-600">
            Temporary password <span className="text-red-600">*</span>
          </label>
          <input
            id="temp_password"
            name="temp_password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "Creating…" : "Create user"}
          </button>
          <Link href="/admin/users" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
