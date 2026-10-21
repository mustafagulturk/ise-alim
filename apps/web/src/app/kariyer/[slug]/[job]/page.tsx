import { ArrowLeft, Banknote, Briefcase, CheckCircle2, Clock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { ApplyForm } from "@/components/ApplyForm";
import { CareersHeader } from "@/components/CareersHeader";
import { money, workTypeLabel } from "@/lib/format";
import { serverGet } from "@/lib/server";
import type { WorkType } from "@/lib/types";

interface PublicJob {
  slug: string;
  title: string;
  department: string;
  location: string;
  workType: WorkType;
  employmentType: string;
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  publishedAt: string;
  requirements: { text: string; mustHave: boolean }[];
  company: { name: string; slug: string; about: string; website: string | null; brandColor: string };
}

async function load(params: Promise<{ slug: string; job: string }>) {
  const { slug, job } = await params;
  return serverGet<PublicJob>(`/careers/${slug}/jobs/${job}`);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; job: string }> }): Promise<Metadata> {
  const job = await load(params);
  return job ? { title: `${job.title} | ${job.company.name}`, description: job.description.replace(/[#*-]/g, "").slice(0, 160) } : {};
}

export default async function JobPage({ params }: { params: Promise<{ slug: string; job: string }> }) {
  const job = await load(params);
  if (!job) notFound();
  const c = job.company;

  // Google for Jobs için yapılandırılmış veri (schema.org JobPosting).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.publishedAt,
    employmentType: job.employmentType === "Tam zamanlı" ? "FULL_TIME" : job.employmentType === "Yarı zamanlı" ? "PART_TIME" : "OTHER",
    hiringOrganization: { "@type": "Organization", name: c.name, sameAs: c.website ?? undefined },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "TR" } },
    ...(job.workType === "REMOTE" ? { jobLocationType: "TELECOMMUTE" } : {}),
  };

  return (
    <div className="min-h-dvh">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <CareersHeader name={c.name} slug={c.slug} color={c.brandColor} />
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${c.brandColor}, #d946ef, #fb923c)` }} />
      <main className="mx-auto grid max-w-5xl gap-10 px-5 py-10 lg:grid-cols-[1fr_380px]">
        <article className="animate-fade-up">
          <Link href={`/kariyer/${c.slug}`} className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="size-4" /> Tüm pozisyonlar</Link>
          <p className="text-sm font-medium" style={{ color: c.brandColor }}>{job.department}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{job.title}</h1>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {[
              { icon: MapPin, t: job.location },
              { icon: Briefcase, t: workTypeLabel[job.workType] },
              { icon: Clock, t: job.employmentType },
              ...(job.salaryMin && job.salaryMax ? [{ icon: Banknote, t: `${money(job.salaryMin)} - ${money(job.salaryMax)}` }] : []),
            ].map(({ icon: Icon, t }) => (
              <span key={t} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 dark:bg-white/5"><Icon className="size-4 text-slate-500" />{t}</span>
            ))}
          </div>
          <div className="prose-kadro mt-8">
            <Markdown>{job.description}</Markdown>
          </div>
          {job.requirements.length > 0 && (
            <div className="card mt-8 p-6">
              <h2 className="font-semibold">Başvurunuzu değerlendirirken baktığımız kriterler</h2>
              <p className="mt-1 text-sm text-slate-500">Şeffaflık için paylaşıyoruz. CV'nizde bu konulardaki deneyiminizi açıkça belirtmeniz faydalı olur.</p>
              <ul className="mt-4 space-y-2">
                {job.requirements.map((r) => (
                  <li key={r.text} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: c.brandColor }} />
                    <span>{r.text} {r.mustHave && <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase dark:bg-white/10 dark:text-slate-300">Zorunlu</span>}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <ApplyForm slug={c.slug} jobSlug={job.slug} color={c.brandColor} company={c.name} />
        </aside>
      </main>
    </div>
  );
}
