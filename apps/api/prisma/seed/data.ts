import type { WorkType } from "@prisma/client";

export const FIRST = [
  "Ahmet", "Ayşe", "Mehmet", "Zeynep", "Can", "Elif", "Emre", "Deniz", "Burcu", "Kerem", "Selin", "Mert", "Ece", "Onur",
  "Gizem", "Barış", "İrem", "Oğuz", "Seda", "Tolga", "Pınar", "Yiğit", "Ceren", "Umut", "Melis", "Serkan", "Damla", "Kaan",
  "Nazlı", "Hakan", "Esra", "Furkan", "Buse", "Cem", "Duygu", "Batuhan", "Şeyma", "Arda", "Gamze", "Tuna", "Ezgi", "Alper",
];
export const LAST = [
  "Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Aydın", "Öztürk", "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin",
  "Kara", "Koç", "Kurt", "Özdemir", "Şimşek", "Polat", "Erdoğan", "Güneş", "Aksoy", "Tekin", "Bulut", "Korkmaz", "Ünal",
];
export const CITIES = ["İstanbul", "Ankara", "İzmir", "Bursa", "Eskişehir", "Kocaeli", "Antalya", "Konya", "Uzaktan (Trabzon)"];
export const SCHOOLS = [
  "Orta Doğu Teknik Üniversitesi", "İstanbul Teknik Üniversitesi", "Ege Üniversitesi", "Hacettepe Üniversitesi",
  "Yıldız Teknik Üniversitesi", "Anadolu Üniversitesi", "Dokuz Eylül Üniversitesi", "Kocaeli Üniversitesi", "Sakarya Üniversitesi",
];
export const SOURCES = ["Kariyer sayfası", "Kariyer sayfası", "LinkedIn", "LinkedIn", "Referans", "Kariyer.net", "Etkinlik"];

export interface RoleProfile {
  key: string;
  job: {
    title: string;
    department: string;
    location: string;
    workType: WorkType;
    salaryMin?: number;
    salaryMax?: number;
    status: "OPEN" | "DRAFT" | "CLOSED";
    description: string;
    requirements: { text: string; keywords: string[]; weight: number; mustHave: boolean }[];
  };
  titles: string[];
  degree: string;
  companies: string[];
  /** Becerinin CV'de geçme olasılığı adayın "kalitesine" göre ölçeklenir. Önce gelenler daha temel beceriler. */
  skills: { name: string; bullet: string }[];
  extras: string[];
  /** Başka bir rolün becerileri (ör. full stack profiller); yetenek havuzunun ilanlar arası eşleşme bulabilmesi için. */
  crossover?: { name: string; bullet: string }[];
  count: number;
}

export const ROLES: RoleProfile[] = [
  {
    key: "backend",
    count: 14,
    job: {
      title: "Kıdemli Backend Geliştirici (Node.js)",
      department: "Mühendislik",
      location: "İstanbul",
      workType: "HYBRID",
      salaryMin: 120000,
      salaryMax: 170000,
      status: "OPEN",
      description: `Lumen'in ödeme ve sipariş altyapısını geliştiren platform ekibine katılacak bir backend geliştirici arıyoruz. Günde milyonlarca isteği karşılayan servisleri tasarlayacak, ölçeklendirecek ve ekibe teknik liderlik yapacaksın.

## Neler yapacaksın?
- Node.js ve TypeScript ile yüksek trafikli REST ve olay tabanlı servisler geliştirmek
- PostgreSQL şema tasarımı ve sorgu optimizasyonu
- Servislerin Docker/Kubernetes üzerinde yayına alınması ve izlenmesi
- Kod incelemeleriyle ekibin kalitesini yükseltmek

## Aradığımız nitelikler
- En az 5 yıl backend geliştirme deneyimi
- Node.js ve TypeScript ile üretimde çalışmış olmak
- PostgreSQL ile ileri seviye deneyim
- Docker ve Kubernetes bilgisi
- Kafka ya da RabbitMQ ile mikroservis deneyimi tercih sebebidir
- Otomatik test yazma alışkanlığı
- İyi derecede İngilizce`,
      requirements: [
        { text: "En az 5 yıl backend geliştirme deneyimi", keywords: ["backend", "yazılım", "api"], weight: 5, mustHave: true },
        { text: "Node.js ve TypeScript ile üretim deneyimi", keywords: ["node.js", "typescript"], weight: 5, mustHave: true },
        { text: "PostgreSQL ile ileri seviye deneyim", keywords: ["postgresql"], weight: 4, mustHave: false },
        { text: "Docker ve Kubernetes bilgisi", keywords: ["docker", "kubernetes"], weight: 3, mustHave: false },
        { text: "Kafka/RabbitMQ ile mikroservis deneyimi", keywords: ["mikroservis"], weight: 3, mustHave: false },
        { text: "Otomatik test yazma alışkanlığı", keywords: ["test"], weight: 2, mustHave: false },
        { text: "İyi derecede İngilizce", keywords: ["ingilizce"], weight: 2, mustHave: false },
      ],
    },
    titles: ["Backend Geliştirici", "Kıdemli Yazılım Mühendisi", "Yazılım Geliştirici", "Full Stack Geliştirici"],
    degree: "Bilgisayar Mühendisliği",
    companies: ["Trendyol", "Getir", "Papara", "Insider", "Peak Games", "Hepsiburada", "Param", "Logo Yazılım", "Sahibinden"],
    skills: [
      { name: "Node.js", bullet: "Node.js ve Express ile günlük 2 milyon isteği karşılayan sipariş API'sini geliştirdim" },
      { name: "TypeScript", bullet: "Mevcut JavaScript kod tabanını TypeScript'e taşıyarak üretim hatalarını %40 azalttım" },
      { name: "PostgreSQL", bullet: "PostgreSQL'de yavaş sorguları indeks ve sorgu planı analiziyle 1,8 sn'den 120 ms'ye indirdim" },
      { name: "Docker", bullet: "Tüm servisleri Docker ile konteynerleştirip GitHub Actions ile CI/CD hattı kurdum" },
      { name: "Kubernetes", bullet: "Kubernetes üzerinde otomatik ölçekleme ve sıfır kesintili dağıtım yapılandırdım" },
      { name: "Kafka", bullet: "Monolit uygulamayı Kafka ile haberleşen 6 mikroservise ayırdım" },
      { name: "Jest", bullet: "Jest ile birim ve entegrasyon testleri yazarak test kapsamını %25'ten %80'e çıkardım" },
      { name: "Redis", bullet: "Redis önbellek katmanı ekleyerek veritabanı yükünü yarıya indirdim" },
      { name: "NestJS", bullet: "NestJS ile modüler bir bildirim servisi tasarladım ve 3 kişilik ekibe mentorluk yaptım" },
    ],
    extras: ["Git", "Linux", "REST", "GraphQL", "AWS", "Agile/Scrum"],
    crossover: [
      { name: "React", bullet: "React ile şirket içi operasyon panelini geliştirip backend servislerine bağladım" },
      { name: "Next.js", bullet: "Next.js ile müşteri portalını sunucu tarafı render ederek SEO trafiğini %30 artırdım" },
    ],
  },
  {
    key: "frontend",
    count: 11,
    job: {
      title: "Frontend Geliştirici (React)",
      department: "Mühendislik",
      location: "Uzaktan",
      workType: "REMOTE",
      salaryMin: 80000,
      salaryMax: 120000,
      status: "OPEN",
      description: `Müşterilerimizin her gün kullandığı yönetim panelini ve mobil web deneyimini geliştirecek bir frontend geliştirici arıyoruz.

## Neler yapacaksın?
- React ve TypeScript ile hızlı, erişilebilir arayüzler geliştirmek
- Tasarım ekibiyle Figma üzerinden birlikte çalışmak
- Performans ölçümü ve iyileştirmesi yapmak

## Aradığımız nitelikler
- En az 2 yıl React deneyimi
- TypeScript bilgisi
- Next.js ile sunucu tarafı render deneyimi tercih sebebidir
- Test (Jest, Playwright) yazma deneyimi
- Figma ile çalışabilme
- Erişilebilirlik ve performans konularına ilgi`,
      requirements: [
        { text: "En az 2 yıl React deneyimi", keywords: ["react"], weight: 5, mustHave: true },
        { text: "TypeScript bilgisi", keywords: ["typescript"], weight: 4, mustHave: false },
        { text: "Next.js ile SSR deneyimi", keywords: ["next.js"], weight: 3, mustHave: false },
        { text: "Test yazma deneyimi (Jest, Playwright)", keywords: ["test"], weight: 3, mustHave: false },
        { text: "Figma ile çalışabilme", keywords: ["figma"], weight: 2, mustHave: false },
        { text: "Erişilebilirlik ve web performansı", keywords: ["erişilebilirlik", "performans"], weight: 2, mustHave: false },
      ],
    },
    titles: ["Frontend Geliştirici", "React Geliştirici", "UI Geliştirici", "Yazılım Geliştirici"],
    degree: "Yazılım Mühendisliği",
    companies: ["Yemeksepeti", "Modanisa", "Obilet", "Armut", "Colendi", "BiTaksi", "Kolay İK", "Akakçe"],
    skills: [
      { name: "React", bullet: "React ile 40'tan fazla ekrandan oluşan yönetim panelini sıfırdan geliştirdim" },
      { name: "TypeScript", bullet: "TypeScript ve ortak bileşen kütüphanesiyle tutarlı bir tasarım sistemi kurdum" },
      { name: "Next.js", bullet: "Next.js ile sunucu tarafı render'a geçerek sayfa açılışını 3,1 sn'den 1,2 sn'ye indirdim" },
      { name: "Jest", bullet: "Jest ve Playwright ile kritik akışlar için otomatik test yazdım" },
      { name: "Figma", bullet: "Figma tasarımlarını tasarımcılarla birlikte piksel hassasiyetinde hayata geçirdim" },
      { name: "Erişilebilirlik", bullet: "WCAG kurallarına göre erişilebilirlik iyileştirmeleri yaptım, Lighthouse performans puanını 62'den 95'e çıkardım" },
      { name: "Redux", bullet: "Redux'tan TanStack Query'ye geçişi yöneterek durum kodunu %50 azalttım" },
    ],
    extras: ["HTML", "CSS", "Tailwind CSS", "Git", "Vite", "Storybook"],
    crossover: [
      { name: "Node.js", bullet: "Node.js ve Express ile arayüzün ihtiyaç duyduğu BFF katmanını yazdım" },
      { name: "PostgreSQL", bullet: "PostgreSQL üzerinde raporlama sorguları yazarak panel ekranlarını besledim" },
    ],
  },
  {
    key: "design",
    count: 7,
    job: {
      title: "Ürün Tasarımcısı (UI/UX)",
      department: "Tasarım",
      location: "İstanbul",
      workType: "HYBRID",
      status: "OPEN",
      description: `Kullanıcı araştırmasından prototipe kadar ürün tasarım sürecinin tamamında söz sahibi olacak bir tasarımcı arıyoruz.

## Aradığımız nitelikler
- En az 3 yıl ürün/arayüz tasarımı deneyimi
- Figma'da ileri seviye; bileşen ve tasarım sistemi kurabilme
- Kullanıcı araştırması ve kullanılabilirlik testi deneyimi
- Mobil uygulama tasarımı deneyimi
- Portfolyo zorunludur`,
      requirements: [
        { text: "En az 3 yıl ürün/arayüz tasarımı deneyimi", keywords: ["ui/ux"], weight: 5, mustHave: true },
        { text: "Figma'da ileri seviye, tasarım sistemi", keywords: ["figma", "tasarım sistemi"], weight: 4, mustHave: true },
        { text: "Kullanıcı araştırması ve kullanılabilirlik testi", keywords: ["kullanıcı araştırması", "kullanılabilirlik"], weight: 4, mustHave: false },
        { text: "Mobil uygulama tasarımı", keywords: ["mobil"], weight: 3, mustHave: false },
        { text: "Portfolyo", keywords: ["portfolyo", "behance", "dribbble"], weight: 2, mustHave: false },
      ],
    },
    titles: ["Ürün Tasarımcısı", "UI/UX Tasarımcı", "Arayüz Tasarımcısı"],
    degree: "Endüstriyel Tasarım",
    companies: ["Getir", "Turkcell", "Akbank", "Hepsiburada", "Marti", "Dream Games"],
    skills: [
      { name: "UI/UX", bullet: "UI/UX tasarım süreçlerini yürüterek ödeme akışının dönüşüm oranını %18 artırdım" },
      { name: "Figma", bullet: "Figma'da 200'den fazla bileşenden oluşan tasarım sistemi kurdum" },
      { name: "Kullanıcı araştırması", bullet: "Her çeyrek 20+ kullanıcıyla kullanıcı araştırması ve kullanılabilirlik testi yaptım" },
      { name: "Mobil", bullet: "iOS ve Android için mobil uygulama arayüzlerini tasarladım" },
      { name: "Portfolyo", bullet: "Çalışmalarım Behance portfolyomda yer alıyor (behance.net/ornek)" },
      { name: "Prototip", bullet: "Etkileşimli prototiplerle geliştirme öncesi fikirleri doğruladım" },
    ],
    extras: ["Adobe Illustrator", "Protopie", "Miro", "Wireframe"],
  },
  {
    key: "sales",
    count: 8,
    job: {
      title: "Kurumsal Satış Temsilcisi",
      department: "Satış",
      location: "Ankara",
      workType: "ONSITE",
      status: "OPEN",
      description: `Kamu ve kurumsal müşterilere yazılım çözümlerimizi anlatacak, portföy büyütecek satış ekibi arkadaşı arıyoruz.

## Aradığımız nitelikler
- En az 2 yıl B2B satış deneyimi
- CRM (Salesforce, HubSpot) kullanımı
- Hedef odaklı çalışma ve hedef aşma geçmişi
- B sınıfı ehliyet
- Yazılım/SaaS sektörü deneyimi tercih sebebidir`,
      requirements: [
        { text: "En az 2 yıl B2B satış deneyimi", keywords: ["b2b"], weight: 5, mustHave: true },
        { text: "CRM kullanımı", keywords: ["crm"], weight: 3, mustHave: false },
        { text: "Hedef aşma geçmişi", keywords: ["hedef"], weight: 4, mustHave: false },
        { text: "B sınıfı ehliyet", keywords: ["ehliyet"], weight: 2, mustHave: false },
        { text: "Yazılım/SaaS sektörü deneyimi", keywords: ["saas", "yazılım"], weight: 2, mustHave: false },
      ],
    },
    titles: ["Satış Temsilcisi", "Kurumsal Satış Uzmanı", "Müşteri Temsilcisi"],
    degree: "İşletme",
    companies: ["Logo Yazılım", "Mikro Yazılım", "Netsis", "Türk Telekom", "Vodafone Business", "Paraşüt"],
    skills: [
      { name: "B2B satış", bullet: "B2B satış ekibinde 60'tan fazla kurumsal müşteri portföyünü yönettim" },
      { name: "Hedef", bullet: "Yıllık satış hedefini üst üste 3 yıl %115 oranında aştım" },
      { name: "CRM", bullet: "Salesforce CRM üzerinde satış hunisini ve teklif süreçlerini takip ettim" },
      { name: "SaaS", bullet: "SaaS muhasebe yazılımının KOBİ'lere satışını yaptım" },
      { name: "Ehliyet", bullet: "B sınıfı ehliyet sahibiyim, saha ziyaretlerine uygunum" },
    ],
    extras: ["Sunum", "Müzakere", "Excel"],
  },
  {
    key: "finance",
    count: 6,
    job: {
      title: "Muhasebe Uzmanı",
      department: "Finans",
      location: "İzmir",
      workType: "ONSITE",
      status: "OPEN",
      description: `Finans ekibimizde genel muhasebe süreçlerini yürütecek bir uzman arıyoruz.

## Aradığımız nitelikler
- En az 3 yıl genel muhasebe deneyimi
- SMMM stajını tamamlamış olmak tercih sebebidir
- E-fatura, e-defter ve beyanname süreçlerine hakimiyet
- Logo, Netsis ya da SAP gibi bir ERP programını aktif kullanmak
- İleri seviye Excel`,
      requirements: [
        { text: "En az 3 yıl genel muhasebe deneyimi", keywords: ["muhasebe"], weight: 5, mustHave: true },
        { text: "E-fatura, e-defter, beyanname süreçleri", keywords: ["e-fatura", "beyanname"], weight: 4, mustHave: false },
        { text: "ERP programı (Logo, Netsis, SAP)", keywords: ["sap"], weight: 3, mustHave: false },
        { text: "İleri seviye Excel", keywords: ["excel"], weight: 3, mustHave: false },
        { text: "SMMM stajı", keywords: ["smmm"], weight: 2, mustHave: false },
      ],
    },
    titles: ["Muhasebe Uzmanı", "Muhasebe Sorumlusu", "Mali İşler Uzmanı"],
    degree: "İktisat",
    companies: ["Arçelik", "Pınar", "Kordsa", "Bilim İlaç", "Vestel"],
    skills: [
      { name: "Muhasebe", bullet: "Genel muhasebe, cari hesap mutabakatı ve ay sonu kapanış işlemlerini yürüttüm" },
      { name: "E-fatura", bullet: "E-fatura ve e-defter geçişini yönettim; KDV ve muhtasar beyannamelerini hazırladım" },
      { name: "ERP", bullet: "Logo Tiger ve SAP FI modüllerini aktif olarak kullandım" },
      { name: "Excel", bullet: "Excel'de pivot tablo ve makrolarla aylık raporlamayı otomatikleştirdim" },
      { name: "SMMM", bullet: "SMMM stajımı tamamladım" },
    ],
    extras: ["Bütçe", "Raporlama", "Mali tablolar"],
  },
  {
    key: "devops",
    count: 0,
    job: {
      title: "DevOps Mühendisi",
      department: "Mühendislik",
      location: "İstanbul",
      workType: "HYBRID",
      status: "DRAFT",
      description: `Altyapımızı kod olarak yönetecek, gözlemlenebilirliği artıracak bir DevOps mühendisi arıyoruz.

- Kubernetes ve Helm ile üretim deneyimi
- Terraform ile altyapı yönetimi
- AWS ya da Azure deneyimi
- Prometheus ve Grafana ile izleme`,
      requirements: [
        { text: "Kubernetes ve Helm ile üretim deneyimi", keywords: ["kubernetes"], weight: 5, mustHave: true },
        { text: "Terraform ile altyapı yönetimi", keywords: ["terraform"], weight: 4, mustHave: false },
        { text: "AWS ya da Azure deneyimi", keywords: ["aws", "azure"], weight: 3, mustHave: false },
      ],
    },
    titles: [],
    degree: "",
    companies: [],
    skills: [],
    extras: [],
  },
];
