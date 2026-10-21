export const TEMPLATES = {
  received: {
    label: "Başvuru alındı",
    subject: "{sirket} | Başvurunuz bize ulaştı",
    body: `Merhaba {aday},

{pozisyon} pozisyonu için yaptığınız başvuru bize ulaştı. Teşekkür ederiz.

Başvurunuzun hangi aşamada olduğunu aşağıdaki bağlantıdan dilediğiniz zaman takip edebilirsiniz:
{takip_linki}

Sevgiler,
{sirket} İşe Alım Ekibi`,
  },
  interview: {
    label: "Mülakat daveti",
    subject: "{sirket} | {pozisyon} mülakat daveti",
    body: `Merhaba {aday},

Başvurunuzu inceledik ve sizinle tanışmak istiyoruz. Mülakat detayları için takip sayfanızı kontrol edebilirsiniz:
{takip_linki}

Görüşmek üzere,
{sirket} İşe Alım Ekibi`,
  },
  offer: {
    label: "Teklif",
    subject: "{sirket} | Size bir teklifimiz var",
    body: `Merhaba {aday},

{pozisyon} süreci boyunca gösterdiğiniz ilgi için teşekkür ederiz. Sizinle çalışmak istiyoruz! Teklif detaylarını konuşmak için kısa süre içinde sizi arayacağız.

{sirket} İşe Alım Ekibi`,
  },
  rejected: {
    label: "Olumsuz dönüş",
    subject: "{sirket} | {pozisyon} başvurunuz hakkında",
    body: `Merhaba {aday},

{pozisyon} pozisyonuna gösterdiğiniz ilgi için teşekkür ederiz. Değerlendirmelerimiz sonucunda bu pozisyon için başka adaylarla ilerlemeye karar verdik.

Bilgilerinizi uygun pozisyonlar için saklamak isteriz. Yolunuz açık olsun.

{sirket} İşe Alım Ekibi`,
  },
} as const;

export type TemplateKey = keyof typeof TEMPLATES;

export function render(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}
