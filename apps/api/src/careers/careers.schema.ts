import { z } from "zod";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

export const ApplyBody = z.object({
  name: z.string().trim().min(3, "Adınızı ve soyadınızı girin.").max(80),
  email: z.email("Geçerli bir e-posta girin.").max(160),
  phone: optional(30),
  city: optional(60),
  linkedin: optional(200),
  coverLetter: optional(3000),
  source: optional(60),
  kvkk: z.literal("true", { error: "Devam etmek için aydınlatma metnini onaylayın." }),
});
export type ApplyBody = z.infer<typeof ApplyBody>;
