"use client";

import { useActionState } from "react";
import { cn } from "@/lib/ui/cn";
import {
  createCustomerAction,
  updateCustomerAction,
  type CustomerActionState,
} from "@/actions/admin/customers";
import { COMPANY_STATUSES } from "@/lib/admin/validation";
import { FormFlash } from "@/components/admin/form-flash";
import { Button } from "@/components/ui/button";
import { cardClass, inputClass, labelClass } from "@/lib/ui/classes";

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
    <form action={formAction} className={cn(cardClass, "max-w-xl space-y-4 p-6")}>
      <FormFlash state={state} />
      {customerIdReadable ? (
        <div>
          <label className={labelClass}>Customer ID</label>
          <p className="text-sm text-oak-charcoal">{customerIdReadable}</p>
        </div>
      ) : null}
      <div>
        <label htmlFor="company_name" className={labelClass}>
          Company name <span className="text-oak-danger">*</span>
        </label>
        <input
          id="company_name"
          name="company_name"
          required
          defaultValue={merged.company_name}
          className={inputClass}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="primary_contact_name" className={labelClass}>
            Primary contact name
          </label>
          <input
            id="primary_contact_name"
            name="primary_contact_name"
            defaultValue={merged.primary_contact_name}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="primary_contact_email" className={labelClass}>
            Primary contact email
          </label>
          <input
            id="primary_contact_email"
            name="primary_contact_email"
            type="email"
            defaultValue={merged.primary_contact_email}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="phone" className={labelClass}>
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={merged.phone}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="address_line_1" className={labelClass}>
          Address line 1
        </label>
        <input
          id="address_line_1"
          name="address_line_1"
          defaultValue={merged.address_line_1}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="address_line_2" className={labelClass}>
          Address line 2
        </label>
        <input
          id="address_line_2"
          name="address_line_2"
          defaultValue={merged.address_line_2}
          className={inputClass}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="town_city" className={labelClass}>
            Town / city
          </label>
          <input
            id="town_city"
            name="town_city"
            defaultValue={merged.town_city}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="postcode" className={labelClass}>
            Postcode
          </label>
          <input
            id="postcode"
            name="postcode"
            defaultValue={merged.postcode}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="status" className={labelClass}>
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={merged.status}
          className={inputClass}
        >
          {COMPANY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={merged.notes}
          className={inputClass}
        />
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create customer" : "Save changes"}
        </Button>
        {companyId ? (
          <Button href={`/admin/customers/${companyId}`} variant="secondary">
            Cancel
          </Button>
        ) : (
          <Button href="/admin/customers" variant="secondary">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
