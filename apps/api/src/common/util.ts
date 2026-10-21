import { randomBytes } from "node:crypto";

const TR: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u" };

/** "Kıdemli Backend Geliştirici" -> "kidemli-backend-gelistirici" */
export function slugify(text: string) {
  return text
    .replace(/[çğıİöşü]/gi, (c) => TR[c] ?? TR[c.toLowerCase()] ?? c)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 80);
}

export function token(bytes = 18) {
  return randomBytes(bytes).toString("base64url");
}

/** Kanban sıralaması için iki komşu arasına sıra numarası üretir. */
export function rankBetween(before: number | null, after: number | null) {
  if (before == null && after == null) return 1000;
  if (before == null) return after! - 1000;
  if (after == null) return before + 1000;
  return (before + after) / 2;
}
