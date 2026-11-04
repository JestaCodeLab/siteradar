"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import useSWR from "swr";
import { SubscriptionForm } from "@/components/subscription-form";
import { Crumbs, ErrorState, PageHeader, Skeleton, SubStatusChip } from "@/components/ui";
import { fetcher, type Subscription } from "@/lib/api";

export default function EditSubscriptionPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, mutate } = useSWR<Subscription>(`/api/subscriptions/${id}`, fetcher);
  if (error) return <ErrorState message={error.message} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96" />;
  return (
    <>
      <Crumbs items={[{ label: "Subscriptions", href: "/subscriptions" }, { label: data.name }]} />
      <PageHeader title={data.name} subtitle={<SubStatusChip status={data.status} />} />
      <Suspense><SubscriptionForm key={data.id + ":" + data.invoices.length} sub={data} /></Suspense>
    </>
  );
}
