"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { JobForm } from "@/components/JobForm";
import { PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import type { Job } from "@/lib/types";

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data } = useQuery({ queryKey: ["job", id], queryFn: () => api.get<Job>(`/jobs/${id}`) });
  return (
    <>
      <PageHeader
        back={<Link href={`/panel/ilanlar/${id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" /> Aday hattı</Link>}
        title="İlanı düzenle"
        subtitle={data?.title}
      />
      {data ? <JobForm job={data} /> : <Skeleton className="h-96" />}
    </>
  );
}
