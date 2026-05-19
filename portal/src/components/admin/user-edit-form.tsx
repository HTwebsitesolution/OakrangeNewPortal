"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updatePortalUserAction, type UserActionState } from "@/actions/admin/users";
import { ADMIN_LEVELS } from "@/lib/admin/validation";
import { FormFlash } from "@/components/admin/form-flash";
import type { AdminLevel, UserRole } from "@/types/profile";

type CompanyOption = { id: string; company_name: string };

export function UserEditForm({
  profileId,
  defaultEmail,
  defaultFullName,
  defaultRole,
  defaultAdminLevel,
  defaultCompanyId,
  defaultIsActive,
  companies,
  creatableRoles,
  actorIsSuperAdmin,
  targetIsInternalAdmin,
}: {
  profileId: string;
  defaultEmail: string;
  defaultFullName: string;
  defaultRole: UserRole;
  defaultAdminLevel: AdminLevel | null;
  defaultCompanyId: string | null;
  defaultIsActive: boolean;
  companies: CompanyOption[];
  creatableRoles: UserRole[];
  actorIsSuperAdmin: boolean;
  targetIsInternalAdmin: boolean;
}) {
  const bound = updatePortalUserAction.bind(null, profileId);
  const [state, formAction, pending] = useActionState(bound, {} as UserActionState);
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [adminLevel, setAdminLevel] = useState<AdminLevel>(defaultAdminLevel ?? "admin");
  const needsCompany = role === "site_manager" || role === "customer_user";
  const isInternalAdmin = role === "oakrange_admin";
  const roleLocked = targetIsInternalAdmin && !actorIsSuperAdmin;

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
        {roleLocked ? (
          <>
            <input type="hidden" name="role" value={defaultRole} />
            <p className="mt-1 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              {defaultRole}
            </p>
          </>
        ) : (
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
        )}
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
        </div>
      ) : targetIsInternalAdmin && defaultAdminLevel ? (
        <input type="hidden" name="admin_level" value={defaultAdminLevel} />
      ) : null}
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
