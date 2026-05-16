"use client";

import { useActionState, useState } from "react";
import {
  deleteCustomerAction,
  type CustomerActionState,
} from "@/actions/admin/customers";
import { FormFlash } from "@/components/admin/form-flash";
import { Button } from "@/components/ui/button";
import { cardClass, inputClass, labelClass } from "@/lib/ui/classes";

export function CustomerDeleteForm({
  companyId,
  companyName,
  customerIdReadable,
  siteCount,
  certificateCount,
  userCount,
}: {
  companyId: string;
  companyName: string;
  customerIdReadable: string;
  siteCount: number;
  certificateCount: number;
  userCount: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const boundDelete = deleteCustomerAction.bind(null, companyId);
  const [state, formAction, pending] = useActionState(
    boundDelete as (
      p: CustomerActionState,
      fd: FormData
    ) => Promise<CustomerActionState>,
    {} as CustomerActionState
  );

  return (
    <section className={`${cardClass} mt-10 border-red-200 p-6`}>
      <h2 className="text-lg font-semibold text-oak-navy">Delete customer</h2>
      <p className="mt-1 text-sm text-oak-muted">
        Permanently remove <span className="font-medium text-oak-charcoal">{companyName}</span> (
        {customerIdReadable}). This cannot be undone.
      </p>
      <ul className="mt-3 list-inside list-disc text-sm text-oak-muted">
        <li>{siteCount} site{siteCount === 1 ? "" : "s"} will be removed</li>
        <li>
          {certificateCount} certificate{certificateCount === 1 ? "" : "s"} will be removed from the
          portal and storage
        </li>
        <li>
          {userCount} linked user{userCount === 1 ? "" : "s"} will be deactivated (accounts are not
          deleted)
        </li>
      </ul>

      {!showForm ? (
        <Button
          type="button"
          variant="danger"
          className="mt-4"
          onClick={() => setShowForm(true)}
        >
          Delete customer…
        </Button>
      ) : (
        <form action={formAction} className="mt-4 max-w-md space-y-4">
          <FormFlash state={state} />
          <div>
            <label htmlFor="confirm_name" className={labelClass}>
              Type <span className="font-semibold text-oak-charcoal">{companyName}</span> to confirm
            </label>
            <input
              id="confirm_name"
              name="confirm_name"
              type="text"
              autoComplete="off"
              required
              disabled={pending}
              className={inputClass}
              placeholder={companyName}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Deleting…" : "Permanently delete customer"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
