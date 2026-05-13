"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createSiteAction, updateSiteAction, type SiteActionState } from "@/actions/admin/sites";
import { SITE_STATUSES } from "@/lib/admin/validation";
import { FormFlash } from "@/components/admin/form-flash";

type SiteFormValues = {
  site_name: string;
  site_contact_name: string;
  site_contact_email: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  town_city: string;
  postcode: string;
  status: string;
  notes: string;
};

const initial: SiteFormValues = {
  site_name: "",
  site_contact_name: "",
  site_contact_email: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  town_city: "",
  postcode: "",
  status: "active",
  notes: "",
};

export function SiteForm({
  mode,
  companyId,
  siteId,
  defaultValues,
  cancelHref,
}: {
  mode: "create" | "edit";
  companyId: string;
  siteId?: string;
  defaultValues?: Partial<SiteFormValues>;
  cancelHref: string;
}) {
  const merged = { ...initial, ...defaultValues };
  const action =
    mode === "create"
      ? createSiteAction.bind(null, companyId)
      : updateSiteAction.bind(null, companyId, siteId!);
  const [state, formAction, pending] = useActionState(
    action as (p: SiteActionState, fd: FormData) => Promise<SiteActionState>,
    {} as SiteActionState
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <FormFlash state={state} />
      <div>
        <label htmlFor="site_name" className="block text-xs font-medium text-zinc-600">
          Site name <span className="text-red-600">*</span>
        </label>
        <input
          id="site_name"
          name="site_name"
          required
          defaultValue={merged.site_name}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="site_contact_name" className="block text-xs font-medium text-zinc-600">
            Site contact name
          </label>
          <input
            id="site_contact_name"
            name="site_contact_name"
            defaultValue={merged.site_contact_name}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="site_contact_email" className="block text-xs font-medium text-zinc-600">
            Site contact email
          </label>
          <input
            id="site_contact_email"
            name="site_contact_email"
            type="email"
            defaultValue={merged.site_contact_email}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
      </div>
      <div>
        <label htmlFor="phone" className="block text-xs font-medium text-zinc-600">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={merged.phone}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="address_line_1" className="block text-xs font-medium text-zinc-600">
          Address line 1
        </label>
        <input
          id="address_line_1"
          name="address_line_1"
          defaultValue={merged.address_line_1}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label htmlFor="address_line_2" className="block text-xs font-medium text-zinc-600">
          Address line 2
        </label>
        <input
          id="address_line_2"
          name="address_line_2"
          defaultValue={merged.address_line_2}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="town_city" className="block text-xs font-medium text-zinc-600">
            Town / city
          </label>
          <input
            id="town_city"
            name="town_city"
            defaultValue={merged.town_city}
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
            defaultValue={merged.postcode}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
      </div>
      <div>
        <label htmlFor="status" className="block text-xs font-medium text-zinc-600">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={merged.status}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        >
          {SITE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="notes" className="block text-xs font-medium text-zinc-600">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={merged.notes}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : mode === "create" ? "Create site" : "Save changes"}
        </button>
        <Link href={cancelHref} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600">
          Cancel
        </Link>
      </div>
    </form>
  );
}
