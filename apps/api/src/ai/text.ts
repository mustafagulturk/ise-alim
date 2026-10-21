const MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

/** Karşılaştırma için Türkçe duyarlı küçük harf + aksan temizleme ("İŞ Güvenliği" -> "is guvenligi"). */
export function norm(text: string) {
  return text
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşüâîû]/g, (c) => MAP[c])
    .replace(/[ \t]+/g, " ");
}

/** Metni cümle/satır parçalarına böler; kanıt alıntısı için kullanılır. */
export function sentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+|•|·|•/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 3);
}

const STOP = new Set(
  "ve ile en az bir iyi derecede bilgi deneyim deneyimli tecrube tecrubeli konusunda olan veya gibi tercihen sahip yil yillik uzerinde ileri seviye seviyede temel hakim hakimiyet bilen bilgisi kullanimi calisma calismis deneyimi gelistirme uretim ileri bilgisi olmak calisabilme yazma aliskanligi kullanimi surecleri programi sektoru derecede iyi seviye konusu alaninda".split(
    " ",
  ),
);

/** Gereksinim metninden anahtar kelime çıkarır ("En az 3 yıl React deneyimi" -> ["react"]). */
export function keywordsFrom(text: string) {
  return [
    ...new Set(
      norm(text)
        .replace(/[()/,;:]/g, " ")
        .split(" ")
        .map((w) => w.replace(/[^a-z0-9#+.]/g, "").replace(/\.$/, ""))
        .filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+\+?$/.test(w)),
    ),
  ];
}
