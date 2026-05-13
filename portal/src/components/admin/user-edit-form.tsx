"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updatePortalUserAction, type UserActionState } from "@/actions/admin/users";
import { USER_ROLES } from "@/lib/admin/validation";
import { FormFlash } from "@/components/admin/form-flash";
import type { UserRole } from "@/types/profile";

type CompanyOption = { id: string; company_name: string };

export function UserEditForm({
  profileId,
  defaultEmail,
  defaultFullName,
  defaultRole,
  defaultCompanyId,
  defaultIsActive,
  companies,
}: {
  profileId: string;
  defaultEmail: string;
  defaultFullName: string;
  defaultRole: UserRole;
  defaultCompanyId: string | null;
  defaultIsActive: boolean;
  companies: CompanyOption[];
}) {
  const bound = updatePortalUserAction.bind(null, profileId);
  const [state, formAction, pending] = useActionState(bound, {} as UserActionState);
  const [role, setRole] = useState<UserRole>(defaultRole);
  const needsCompany = role === "site_manager" || role === "customer_user";

  return (
    <form action={formAction} className="max-w-xl space-y-4">
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
          defaultValue={defaultEmail}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Changing email updates Auth when <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> is set.
        </p>
      </div>
      <div>
        <label htmlFor="full_name" className="block text-xs font-medium text-zinc-600">
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          defaultValue={defaultFullName}
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
        <label htmlFor="is_active_select" className="block text-xs font-medium text-zinc-600">
          Account status
        </label>
        <select
          id="is_active_select"
          name="is_active"
          defaultValue={defaultIsActive ? "true" : "false"}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <Link
          href={`/admin/users/${profileId}`}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
