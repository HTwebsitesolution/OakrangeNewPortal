import Link from "next/link";
import { CustomerForm } from "@/components/admin/customer-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/customers"
        className="text-sm font-medium text-oak-muted hover:text-oak-orange"
      >
        ← Customers
      </Link>
      <PageHeader
        title="New customer"
        description="Customer ID is generated automatically when you save."
      />
      <CustomerForm mode="create" />
    </div>
  );
}
