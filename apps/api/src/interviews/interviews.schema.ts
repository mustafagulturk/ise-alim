import { z } from "zod";

export const InterviewBody = z.object({
  title: z.string().trim().min(2, "Başlık girin.").max(100),
  startsAt: z.iso.datetime({ offset: true, error: "Geçerli bir tarih seçin." }),
  durationMin: z.number().int().min(15).max(480),
  location: z.string().trim().min(2, "Yer ya da toplantı bağlantısı girin.").max(300),
  panelistIds: z.array(z.string()).min(1, "En az bir mülakatçı seçin.").max(8),
});
export type InterviewBody = z.infer<typeof InterviewBody>;

export const SCORECARD_CRITERIA = ["Teknik yetkinlik", "Problem çözme", "İletişim", "Takım uyumu"] as const;

export const ScorecardBody = z.object({
  ratings: z.record(z.string(), z.number().int().min(1).max(5)),
  recommendation: z.enum(["STRONG_NO", "NO", "YES", "STRONG_YES"]),
  notes: z.string().trim().max(4000).default(""),
  answers: z
    .record(z.string(), z.object({ note: z.string().trim().max(1000).default(""), signal: z.enum(["good", "weak"]).nullable().default(null) }))
    .default({}),
});
export type ScorecardBody = z.infer<typeof ScorecardBody>;

const ids = z.array(z.string()).min(1, "En az bir mülakatçı seçin.").max(8);

export const SlotQuery = z.object({
  panelistIds: z.preprocess((v) => (typeof v === "string" ? v.split(",").filter(Boolean) : v), ids),
  durationMin: z.coerce.number().int().min(15).max(240).default(60),
});
export type SlotQuery = z.infer<typeof SlotQuery>;

export const InviteBody = z.object({
  title: z.string().trim().min(2, "Başlık girin.").max(100),
  durationMin: z.number().int().min(15).max(240),
  location: z.string().trim().min(2, "Yer ya da toplantı bağlantısı girin.").max(300),
  panelistIds: ids,
  slots: z.array(z.iso.datetime({ offset: true })).min(1, "En az bir saat seçin.").max(10, "En fazla 10 seçenek gönderebilirsiniz."),
  sendEmail: z.boolean().default(true),
});
export type InviteBody = z.infer<typeof InviteBody>;

export const BookBody = z.object({ startsAt: z.iso.datetime({ offset: true, error: "Bir saat seçin." }) });
