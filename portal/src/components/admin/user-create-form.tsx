"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createPortalUserAction, type UserActionState } from "@/actions/admin/users";
import { CustomerSearchSelect } from "@/components/admin/customer-search-select";
import { ADMIN_LEVELS } from "@/lib/admin/validation";
import type { CompanySearchRow } from "@/lib/admin/company-search";
import { FormFlash } from "@/components/admin/form-flash";
import type { AdminLevel, UserRole } from "@/types/profile";

export function UserCreateForm({
  initialCompany,
  creatableRoles,
  actorIsSuperAdmin,
}: {
  initialCompany?: CompanySearchRow | null;
  creatableRoles: UserRole[];
  actorIsSuperAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(createPortalUserAction, {} as UserActionState);
  const [role, setRole] = useState<UserRole>(creatableRoles[0] ?? "customer_user");
  const [adminLevel, setAdminLevel] = useState<AdminLevel>("admin");
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchRow | null>(
    initialCompany ?? null
  );
  const needsCompany = role === "site_manager" || role === "customer_user";
  const isInternalAdmin = role === "oakrange_admin";

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        Creates a real Supabase Auth user and profile using the service role key. Share the
        temporary password securely; invitation email is not wired in this phase.
      </div>
      {!actorIsSuperAdmin ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Internal Oakrange admin accounts can only be created by a Super Admin.
        </p>
      ) : null}
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
          <label htmlFor="username" className="block text-xs font-medium text-zinc-600">
            Username <span className="text-red-600">*</span>
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            minLength={4}
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. 1824newport or 378STC"
            pattern="[A-Za-z0-9]{4,32}"
            title="4–32 letters or numbers only"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Letters and numbers only (mixed case is fine). Cannot be changed after the account is created.
          </p>
        </div>
        <div>
          <label htmlFor="full_name" className="block text-xs font-medium text-zinc-600">
            Business name
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
            {creatableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {isInternalAdmin && actorIsSuperAdmin ? (
          <div>
            <label htmlFor="admin_level" className="block text-xs font-medium text-zinc-600">
              Admin level <span className="text-red-600">*</span>
            </label>
            <select
              id="admin_level"
              name="admin_level"
              required
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value as AdminLevel)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            >
              {ADMIN_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level === "super_admin" ? "Super Admin" : "Admin"}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              Super Admins can create and manage other internal admins. Standard Admins manage
              companies and portal users only.
            </p>
          </div>
        ) : null}
        {needsCompany ? (
          <CustomerSearchSelect
            label="Company"
            value={selectedCompany}
            onChange={setSelectedCompany}
            required
          />
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
