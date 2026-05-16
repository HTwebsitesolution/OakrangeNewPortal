import Link from "next/link";
import { AUDIT_ACTION_OPTIONS, AUDIT_ENTITY_TYPE_OPTIONS } from "@/lib/audit/queries";
import type { AuditLogListFilters } from "@/lib/audit/queries";

type Props = {
  filters: AuditLogListFilters;
  companies: Array<{ id: string; company_name: string; customer_id_readable: string }>;
  users: Array<{ id: string; full_name: string | null; email: string }>;
};

function inputClassName() {
  return "mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900";
}

export function AuditLogFiltersForm({ filters, companies, users }: Props) {
  return (
    <form
      action="/admin/audit-logs"
      method="GET"
      className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Filters</h2>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Apply
          </button>
          <Link
            href="/admin/audit-logs"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
          >
            Reset
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor="q" className="block text-xs font-medium text-zinc-600">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={filters.search ?? ""}
            placeholder="Action, user, company, certificate title…"
            className={inputClassName()}
          />
        </div>

        <div>
          <label htmlFor="action" className="block text-xs font-medium text-zinc-600">
            Action
          </label>
          <select id="action" name="action" defaultValue={filters.action ?? ""} className={inputClassName()}>
            <option value="">Any</option>
            {AUDIT_ACTION_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="entityType" className="block text-xs font-medium text-zinc-600">
            Entity type
          </label>
          <select
            id="entityType"
            name="entityType"
            defaultValue={filters.entityType ?? ""}
            className={inputClassName()}
          >
            <option value="">Any</option>
            {AUDIT_ENTITY_TYPE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="userId" className="block text-xs font-medium text-zinc-600">
            User
          </label>
          <select id="userId" name="userId" defaultValue={filters.userId ?? ""} className={inputClassName()}>
            <option value="">Any</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="companyId" className="block text-xs font-medium text-zinc-600">
            Company
          </label>
          <select
            id="companyId"
            name="companyId"
            defaultValue={filters.companyId ?? ""}
            className={inputClassName()}
          >
            <option value="">Any</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.customer_id_readable} — {company.company_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dateFrom" className="block text-xs font-medium text-zinc-600">
            From date
          </label>
          <input
            id="dateFrom"
            name="dateFrom"
            type="date"
            defaultValue={filters.dateFrom ?? ""}
            className={inputClassName()}
          />
        </div>
        <div>
          <label htmlFor="dateTo" className="block text-xs font-medium text-zinc-600">
            To date
          </label>
          <input
            id="dateTo"
            name="dateTo"
            type="date"
            defaultValue={filters.dateTo ?? ""}
            className={inputClassName()}
          />
        </div>

        <div>
          <label htmlFor="entityId" className="block text-xs font-medium text-zinc-600">
            Entity ID
          </label>
          <input
            id="entityId"
            name="entityId"
            defaultValue={filters.entityId ?? ""}
            placeholder="UUID"
            className={inputClassName()}
          />
        </div>
      </div>
    </form>
  );
}
