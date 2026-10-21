import Anthropic from "@anthropic-ai/sdk";
import { Injectable, Logger } from "@nestjs/common";
import { config } from "../common/config";
import { type Analysis, type JobInput, computeScore } from "./analysis";
import { anonymize } from "./anonymize";
import { DEFAULT_MODEL, claudeAssess } from "./claude-scorer";
import { localAssess } from "./local-scorer";

@Injectable()
export class ScoringService {
  private readonly log = new Logger(ScoringService.name);
  private readonly client = config().ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: config().ANTHROPIC_API_KEY, maxRetries: 3 })
    : null;
  private readonly model = config().ANTHROPIC_MODEL || DEFAULT_MODEL;

  get provider() {
    return this.client ? "claude" : "local";
  }

  /** CV'yi değerlendirir. Claude kullanılamazsa (anahtar yok, kota, hata) yerel puanlayıcıya düşer. */
  async assess(input: JobInput, cvText: string, candidateName?: string): Promise<Analysis> {
    const started = Date.now();
    const job: JobInput = {
      title: input.title,
      department: input.department,
      description: input.description,
      requirements: input.requirements.map(({ id, text, keywords, weight, mustHave }) => ({ id, text, keywords, weight, mustHave })),
    };
    const masked = anonymize(cvText, candidateName);

    if (this.client) {
      try {
        const assessment = await claudeAssess(this.client, this.model, job, masked);
        return this.finish(job, assessment, "claude", started, this.model);
      } catch (err) {
        const reason = err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : String(err);
        this.log.warn(`Claude değerlendirmesi başarısız, yerel puanlayıcı kullanılıyor: ${reason}`);
      }
    }
    return this.finish(job, localAssess(job, masked), "local", started);
  }

  private finish(job: JobInput, assessment: ReturnType<typeof localAssess>, provider: Analysis["provider"], started: number, model?: string): Analysis {
    const { score, scored, mustHaveMissing } = computeScore(job.requirements, assessment);
    return { ...assessment, requirements: scored, score, mustHaveMissing, provider, model, durationMs: Date.now() - started };
  }
}
