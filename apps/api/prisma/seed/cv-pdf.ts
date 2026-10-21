import PDFDocument from "pdfkit";
import { join } from "node:path";

export interface CvData {
  name: string;
  title: string;
  email: string;
  phone: string;
  city: string;
  summary: string;
  experience: { company: string; role: string; period: string; bullets: string[] }[];
  education: string[];
  skills: string[];
  languages: string[];
  accent: string;
}

const FONT = join(__dirname, "..", "fonts", "DejaVuSans.ttf");
const BOLD = join(__dirname, "..", "fonts", "DejaVuSans-Bold.ttf");

/** Demo verisi için gerçekçi görünen tek sayfalık CV PDF'i üretir. */
export function renderCv(cv: CvData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `${cv.name} - CV`, Author: cv.name } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont("r", FONT).registerFont("b", BOLD);

    doc.rect(0, 0, doc.page.width, 8).fill(cv.accent);
    doc.fillColor("#111827").font("b").fontSize(22).text(cv.name, 48, 40);
    doc.fillColor(cv.accent).font("r").fontSize(12).text(cv.title);
    doc.moveDown(0.3).fillColor("#4b5563").fontSize(9).text(`${cv.email}  ·  ${cv.phone}  ·  ${cv.city}`);
    doc.moveDown(0.8);

    const section = (title: string) => {
      doc.moveDown(0.6).fillColor(cv.accent).font("b").fontSize(10.5).text(title.toLocaleUpperCase("tr"), { characterSpacing: 0.6 });
      const y = doc.y + 2;
      doc.moveTo(48, y).lineTo(doc.page.width - 48, y).lineWidth(0.6).strokeColor("#e5e7eb").stroke();
      doc.moveDown(0.5).fillColor("#1f2937").font("r").fontSize(9.5);
    };

    section("Özet");
    doc.text(cv.summary, { lineGap: 2 });

    section("İş Deneyimi");
    for (const e of cv.experience) {
      doc.font("b").fontSize(10).fillColor("#111827").text(`${e.role} · ${e.company}`, { continued: true });
      doc.font("r").fillColor("#6b7280").text(`   ${e.period}`);
      doc.font("r").fontSize(9.5).fillColor("#1f2937");
      for (const b of e.bullets) doc.text(`• ${b}`, { indent: 8, lineGap: 1.5 });
      doc.moveDown(0.4);
    }

    section("Eğitim");
    for (const ed of cv.education) doc.text(ed, { lineGap: 2 });

    section("Beceriler");
    doc.text(cv.skills.join(" · "), { lineGap: 2 });

    section("Diller");
    doc.text(cv.languages.join(" · "));

    doc.end();
  });
}
