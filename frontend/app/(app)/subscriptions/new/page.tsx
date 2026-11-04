import { Suspense } from "react";
import { SubscriptionForm } from "@/components/subscription-form";
import { Crumbs, PageHeader } from "@/components/ui";

export default function NewSubscriptionPage() {
  return (
    <>
      <Crumbs items={[{ label: "Subscriptions", href: "/subscriptions" }, { label: "Add subscription" }]} />
      <PageHeader title="Add subscription" subtitle="Upload the invoice or receipt first and we fill in what we can read from it. Check the details before saving." />
      <Suspense><SubscriptionForm /></Suspense>
    </>
  );
}
