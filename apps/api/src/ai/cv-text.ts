import mammoth from "mammoth";
// Paketin ana girişi, üst modül yoksa örnek dosya okumaya çalışıyor; doğrudan kütüphane dosyası alınır.
import pdf from "pdf-parse/lib/pdf-parse.js";

export const CV_MIME = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
} as const;

/** PDF ve Word dosyasından düz metin çıkarır. */
export async function extractText(buffer: Buffer, mime: string) {
  if (mime === "application/pdf") {
    const result = await pdf(buffer);
    return result.text.replace(/\u0000/g, "").trim();
  }
  if (mime in CV_MIME) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }
  throw new Error(`Desteklenmeyen dosya türü: ${mime}`);
}

/** Dosya içeriğinin gerçekten PDF/DOCX olduğunu imzasından kontrol eder (uzantıya güvenilmez). */
export function sniffMime(buffer: Buffer): keyof typeof CV_MIME | null {
  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer.includes(Buffer.from("word/"))) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return null;
}
