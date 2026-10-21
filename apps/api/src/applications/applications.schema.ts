import { z } from "zod";

const stage = z.enum(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]);
const template = z.enum(["received", "interview", "offer", "rejected"]);

export const MoveBody = z.object({
  stage,
  beforeId: z.string().nullish(),
  afterId: z.string().nullish(),
  reason: z.string().trim().max(300).optional(),
  email: template.optional(),
});
export type MoveBody = z.infer<typeof MoveBody>;

export const BulkBody = z.object({
  ids: z.array(z.string()).min(1).max(200),
  stage,
  reason: z.string().trim().max(300).optional(),
  email: template.optional(),
});
export type BulkBody = z.infer<typeof BulkBody>;

export const NoteBody = z.object({ body: z.string().trim().min(1, "Not boş olamaz.").max(4000) });

export const EmailBody = z.object({
  template,
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().max(8000).optional(),
});

export const ListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  jobId: z.string().optional(),
  stage: stage.optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  sort: z.enum(["recent", "score"]).default("recent"),
  page: z.coerce.number().int().min(1).default(1),
});
export type ListQuery = z.infer<typeof ListQuery>;
