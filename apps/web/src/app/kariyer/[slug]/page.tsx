import { ArrowUpRight, Briefcase, Globe, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CareersHeader } from "@/components/CareersHeader";
import { relative, workTypeLabel } from "@/lib/format";
import { serverGet } from "@/lib/server";
import type { WorkType } from "@/lib/types";

interface CompanyPage {
  name: string;
  slug: string;
  about: string;
  website: string | null;
  brandColor: string;
  jobs: { slug: string; title: string; department: string; location: string; workType: WorkType; employmentType: string; publishedAt: string }[];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await serverGet<CompanyPage>(`/careers/${(await params).slug}`);
  return c ? { title: `${c.name} kariyer`, description: c.about.slice(0, 160) } : {};
}

export default async function CareersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await serverGet<CompanyPage>(`/careers/${slug}`);
  if (!company) notFound();
  const departments = [...new Set(company.jobs.map((j) => j.department))];

  return (
    <div className="min-h-dvh">
      <CareersHeader name={company.name} slug={company.slug} color={company.brandColor} />
      <section className="relative overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${company.brandColor}, #0f0f1a)` }}>
        <div className="grid-bg absolute inset-0 opacity-20" />
        <div className="absolute -top-20 right-0 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-5 py-20">
          <p className="text-sm font-medium text-white/70">Kariyer</p>
          <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">{company.name}'de birlikte çalışalım</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">{company.about}</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-4 py-1.5 backdrop-blur">{company.jobs.length} açık pozisyon</span>
            {company.website && <a href={company.website} target="_blank" className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur hover:bg-white/20"><Globe className="size-4" />Web sitesi</a>}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-5 py-14">
        {company.jobs.length === 0 ? (
          <p className="card p-10 text-center text-slate-500">Şu an açık pozisyon yok. Takipte kalın!</p>
        ) : (
          departments.map((d) => (
            <section key={d} className="mb-10">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-500 uppercase"><Briefcase className="size-4" />{d}</h2>
              <div className="stagger space-y-3">
                {company.jobs.filter((j) => j.department === d).map((j) => (
                  <Link key={j.slug} href={`/kariyer/${slug}/${j.slug}`} className="card group flex items-center justify-between gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div>
                      <p className="text-lg font-semibold">{j.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="size-3.5" />{j.location}</span>
                        <span>{workTypeLabel[j.workType]}</span>
                        <span>{j.employmentType}</span>
                        <span className="text-slate-400">{relative(j.publishedAt)}</span>
                      </p>
                    </div>
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 transition group-hover:bg-[var(--c)] group-hover:text-white dark:bg-white/5" style={{ ["--c" as string]: company.brandColor }}>
                      <ArrowUpRight className="size-5 transition group-hover:rotate-45" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
