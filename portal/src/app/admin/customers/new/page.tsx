import Link from "next/link";
import { CustomerForm } from "@/components/admin/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← Customers
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">New customer</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Customer ID is generated automatically when you save.
        </p>
      </div>
      <CustomerForm mode="create" />
    </div>
  );
}
