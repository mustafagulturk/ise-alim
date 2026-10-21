import type { Stage } from "@prisma/client";

export const PIPELINE: Stage[] = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED"];

export const STAGE_LABEL: Record<Stage, string> = {
  APPLIED: "Yeni başvuru",
  SCREENING: "Ön değerlendirme",
  INTERVIEW: "Mülakat",
  OFFER: "Teklif",
  HIRED: "İşe alındı",
  REJECTED: "Elendi",
};

export function stageIndex(stage: Stage) {
  return PIPELINE.indexOf(stage);
}

/** Yeni aşama hunide daha ileriyse en ileri aşamayı günceller. */
export function furthest(current: Stage, next: Stage): Stage {
  return stageIndex(next) > stageIndex(current) ? next : current;
}
