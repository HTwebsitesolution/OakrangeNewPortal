"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createCompanyAndPortalUserAction } from "@/actions/admin/company-user";
import type { UserActionState } from "@/actions/admin/users";
import { FormFlash } from "@/components/admin/form-flash";
import type { UserRole } from "@/types/profile";

const PORTAL_ROLES: { value: UserRole; label: string }[] = [
  { value: "customer_user", label: "Customer user (company-wide certificates)" },
  { value: "site_manager", label: "Site manager (assign sites after setup)" },
];

export function CompanyUserCreateForm() {
  const [state, formAction, pending] = useActionState(
    createCompanyAndPortalUserAction,
    {} as UserActionState
  );

  return (
    <form action={formAction} className="max-w-xl space-y-8">
      <FormFlash state={state} />

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        Creates the company record and the first portal login in one step. Company-wide certificate
        access is granted automatically. Add sites later under the company, then assign site-level
        access if needed.
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Company</legend>
        <div>
          <label htmlFor="company_name" className="block text-xs font-medium text-zinc-600">
            Business name <span className="text-red-600">*</span>
          </label>
          <input
            id="company_name"
            name="company_name"
            required
            autoComplete="organization"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="primary_contact_name" className="block text-xs font-medium text-zinc-600">
            Contact name <span className="text-red-600">*</span>
          </label>
          <input
            id="primary_contact_name"
            name="primary_contact_name"
            required
            autoComplete="name"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-zinc-600">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="postcode" className="block text-xs font-medium text-zinc-600">
              Postcode
            </label>
            <input
              id="postcode"
              name="postcode"
              autoComplete="postal-code"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Portal login
        </legend>
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
          <p className="mt-1 text-xs text-zinc-500">Used to sign in and stored as the company contact email.</p>
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
            placeholder="e.g. 1824newport"
            pattern="[A-Za-z0-9]{4,32}"
            title="4–32 letters or numbers only"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
          <p className="mt-1 text-xs text-zinc-500">Cannot be changed after the account is created.</p>
        </div>
        <div>
          <label htmlFor="role" className="block text-xs font-medium text-zinc-600">
            Role <span className="text-red-600">*</span>
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue="customer_user"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          >
            {PORTAL_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
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
          <p className="mt-1 text-xs text-zinc-500">
            Share securely with the client. Invitation email is not wired in this phase.
          </p>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Creating…" : "Create company and user"}
        </button>
        <Link
          href="/admin/users/new?mode=existing"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
