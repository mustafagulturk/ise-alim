import { norm } from "./text";

const MONTHS: Record<string, number> = {
  oca: 1, sub: 2, mar: 3, nis: 4, may: 5, haz: 6, tem: 7, agu: 8, eyl: 9, eki: 10, kas: 11, ara: 12,
  jan: 1, feb: 2, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const NOW_WORDS = "halen|devam|gunumuz|hala|present|current|now|simdi";
const DATE = `(?:(\\d{1,2})[./]|([a-z]{3})[a-z]*\\.?\\s+)?((?:19|20)\\d{2})`;
const RANGE = new RegExp(`${DATE}\\s*[-–—]\\s*(?:${DATE}|(${NOW_WORDS}))`, "g");

function toMonth(m: string | undefined, name: string | undefined, year: string, end: boolean) {
  const month = m ? Number(m) : name ? (MONTHS[name] ?? (end ? 12 : 1)) : end ? 12 : 1;
  return Number(year) * 12 + Math.min(Math.max(month, 1), 12) - 1;
}

/**
 * CV'deki tarih aralıklarından (ör. "03/2019 - Halen", "2016 – 2020") toplam deneyimi yıl olarak hesaplar.
 * Çakışan aralıklar birleştirilir, eğitim satırları sayılmaz.
 */
export function experienceYears(text: string, now = new Date()): number | null {
  const current = now.getFullYear() * 12 + now.getMonth();
  const ranges: [number, number][] = [];
  for (const line of norm(text).split("\n")) {
    if (/universite|lise|lisans|egitim|university|bachelor|master/.test(line)) continue;
    for (const m of line.matchAll(RANGE)) {
      const start = toMonth(m[1], m[2], m[3], false);
      // Bitiş ayı dahil sayılır: "01/2020 - 12/2020" 12 aydır.
      const end = (m[7] ? current : m[6] ? toMonth(m[4], m[5], m[6], true) : current) + 1;
      if (end > start && end <= current + 2) ranges.push([start, end]);
    }
  }
  if (!ranges.length) {
    const stated = norm(text).match(/(\d{1,2})\+?\s*(?:yil|years?)\s*(?:lik)?\s*(?:deneyim|tecrube|experience)/);
    return stated ? Number(stated[1]) : null;
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [s, e] = ranges[0];
  for (const [a, b] of ranges.slice(1)) {
    if (a <= e) e = Math.max(e, b);
    else {
      total += e - s;
      [s, e] = [a, b];
    }
  }
  total += e - s;
  return Math.round((total / 12) * 10) / 10;
}
