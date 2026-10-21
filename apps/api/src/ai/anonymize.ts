/**
 * CV metnini modele göndermeden önce kişisel verileri maskeler (KVKK).
 * Değerlendirme yalnızca yetkinliğe dayansın diye ad, iletişim bilgileri ve doğum tarihi çıkarılır.
 */
export function anonymize(text: string, candidateName?: string) {
  let out = text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[E-POSTA]")
    .replace(/https?:\/\/\S+|(?:www\.|linkedin\.com\/|github\.com\/)\S+/gi, "[BAĞLANTI]")
    .replace(/(?:\+?90[\s-]?)?\(?0?\s?5\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g, "[TELEFON]")
    .replace(/(doğum tarihi|d\.\s?tarihi|birth date)\s*[:\-]?\s*[\d./-]+/gi, "$1: [GİZLİ]")
    .replace(/\b(medeni hal|uyruk|cinsiyet|askerlik)\s*[:\-]\s*[^\n]+/gi, "$1: [GİZLİ]");

  if (candidateName) {
    for (const part of candidateName.split(/\s+/).filter((p) => p.length > 2)) {
      out = out.replace(new RegExp(`(?<!\\p{L})${escape(part)}(?!\\p{L})`, "giu"), "[AD]");
    }
  }
  return out;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
