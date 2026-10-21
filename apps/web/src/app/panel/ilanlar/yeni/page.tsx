"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { JobForm } from "@/components/JobForm";
import { PageHeader } from "@/components/ui";

export default function NewJobPage() {
  return (
    <>
      <PageHeader
        back={<Link href="/panel/ilanlar" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" /> İlanlar</Link>}
        title="Yeni ilan"
        subtitle="İlanı yazın, kriterleri belirleyin; başvurular bu kriterlere göre otomatik değerlendirilsin."
      />
      <JobForm />
    </>
  );
}
