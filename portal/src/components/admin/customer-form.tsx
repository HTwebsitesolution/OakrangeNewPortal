"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createCustomerAction,
  updateCustomerAction,
  type CustomerActionState,
} from "@/actions/admin/customers";
import { COMPANY_STATUSES } from "@/lib/admin/validation";
import { FormFlash } from "@/components/admin/form-flash";

export type CustomerFormValues = {
  company_name: string;
  primary_contact_name: string;
  primary_contact_email: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  town_city: string;
  postcode: string;
  status: string;
  notes: string;
};

const initial: CustomerFormValues = {
  company_name: "",
  primary_contact_name: "",
  primary_contact_email: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  town_city: "",
  postcode: "",
  status: "active",
  notes: "",
};

export function CustomerForm({
  mode,
  companyId,
  customerIdReadable,
  defaultValues,
}: {
  mode: "create" | "edit";
  companyId?: string;
  customerIdReadable?: string;
  defaultValues?: Partial<CustomerFormValues>;
}) {
  const merged = { ...initial, ...defaultValues };
  const action =
    mode === "create"
      ? createCustomerAction
      : updateCustomerAction.bind(null, companyId!);
  const [state, formAction, pending] = useActionState(
    action as (
      p: CustomerActionState,
      fd: FormData
    ) => Promise<CustomerActionState>,
    {} as CustomerActionState
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <FormFlash state={state} />
      {customerIdReadable ? (
        <div>
          <label className="block text-xs font-medium text-zinc-500">Customer ID</label>
          <p className="text-sm text-zinc-900 dark:text-zinc-100">{customerIdReadable}</p>
        </div>
      ) : null}
      <div>
        <label htmlFor="company_name" className="block text-xs font-medium text-zinc-600">
          Company name <span className="text-red-600">*</span>
        </label>
        <input
          id="company_name"
          name="company_name"
          required
          defaultValue={merged.company_name}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="primary_contact_name" className="block text-xs font-medium text-zinc-600">
            Primary contact name
          </label>
          <input
            id="primary_contact_name"
            name="primary_contact_name"
            defaultValue={merged.primary_contact_name}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="primary_contact_email" className="block text-xs font-medium text-zinc-600">
            Primary contact email
          </label>
          <input
            id="primary_contact_email"
            name="primary_contact_email"
            type="email"
            defaultValue={merged.primary_contact_email}
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
          {COMPANY_STATUSES.map((s) => (
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
          {pending ? "Saving…" : mode === "create" ? "Create customer" : "Save changes"}
        </button>
        {companyId ? (
          <Link
            href={`/admin/customers/${companyId}`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
          >
            Cancel
          </Link>
        ) : (
          <Link href="/admin/customers" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600">
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
