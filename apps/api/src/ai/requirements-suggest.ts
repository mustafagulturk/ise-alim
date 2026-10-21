import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { keywordsFrom, norm } from "./text";

export const SuggestedRequirements = z.object({
  requirements: z.array(
    z.object({
      text: z.string().describe("Kısa ve ölçülebilir kriter, ör. 'En az 3 yıl React deneyimi'."),
      keywords: z.array(z.string()).describe("CV'de aranacak 1-4 anahtar kelime, küçük harf."),
      weight: z.number().int().describe("1 (az önemli) ile 5 (çok önemli) arası."),
      mustHave: z.boolean().describe("Olmazsa olmaz mı?"),
    }),
  ),
});
export type SuggestedRequirements = z.infer<typeof SuggestedRequirements>;

/** İlan metninden değerlendirme kriterleri önerir. Model yoksa madde işaretli satırlardan çıkarır. */
export async function suggestRequirements(client: Anthropic | null, model: string, title: string, description: string): Promise<SuggestedRequirements> {
  if (client) {
    try {
      const res = await client.messages.parse({
        model,
        max_tokens: 16000,
        output_config: { effort: "low", format: zodOutputFormat(SuggestedRequirements) },
        system: "Bir iş ilanından CV taramasında kullanılacak 4-8 değerlendirme kriteri çıkar. Türkçe yaz. Ayrımcı kriter (yaş, cinsiyet, medeni hal) önerme.",
        messages: [{ role: "user", content: `Pozisyon: ${title}\n\n${description}` }],
      });
      if (res.parsed_output) {
        return {
          requirements: res.parsed_output.requirements.map((r) => ({ ...r, weight: Math.min(5, Math.max(1, r.weight)) })),
        };
      }
    } catch {
      // Yerel yönteme düş.
    }
  }
  const lines = description
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[-*•]\s+/.test(l))
    .map((l) => l.replace(/^[-*•]\s+/, "").replace(/\.$/, ""))
    .filter((l) => l.length > 4 && l.length < 140)
    .slice(0, 8);
  return {
    requirements: lines.map((text) => {
      const n = norm(text);
      const mustHave = /zorunlu|en az|sart|mutlaka/.test(n);
      return { text, keywords: keywordsFrom(text).slice(0, 4), weight: mustHave ? 5 : /tercih|arti|avantaj/.test(n) ? 2 : 3, mustHave };
    }),
  };
}
