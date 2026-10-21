import { z } from "zod";

export const RequirementBody = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(3, "Kriteri yazın.").max(200),
  keywords: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(8).optional(),
  weight: z.number().int().min(1).max(5),
  mustHave: z.boolean(),
});

export const JobBody = z
  .object({
    title: z.string().trim().min(3, "Pozisyon adını girin.").max(120),
    department: z.string().trim().min(2, "Departmanı girin.").max(60),
    location: z.string().trim().min(2, "Konumu girin.").max(60),
    workType: z.enum(["ONSITE", "HYBRID", "REMOTE"]),
    employmentType: z.string().trim().max(40).default("Tam zamanlı"),
    description: z.string().trim().min(30, "İlan açıklaması en az 30 karakter olmalı.").max(10_000),
    salaryMin: z.number().int().positive().nullable().optional(),
    salaryMax: z.number().int().positive().nullable().optional(),
    status: z.enum(["DRAFT", "OPEN", "CLOSED"]).default("DRAFT"),
    requirements: z.array(RequirementBody).max(15, "En fazla 15 kriter ekleyebilirsiniz."),
  })
  .refine((j) => !j.salaryMin || !j.salaryMax || j.salaryMin <= j.salaryMax, {
    message: "Alt sınır üst sınırdan büyük olamaz.",
    path: ["salaryMax"],
  });

export type JobBody = z.infer<typeof JobBody>;

export const SuggestBody = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(30, "Önce ilan açıklamasını yazın.").max(10_000),
});
