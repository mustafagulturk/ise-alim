import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Kadro | Yapay zekâ destekli işe alım", template: "%s | Kadro" },
  description: "İlanını yayınla, başvuruları topla, yapay zekâ her CV'yi kriterlerine göre kanıtlarıyla puanlasın. Ekibinle kanban üzerinde birlikte karar ver.",
};

export const viewport: Viewport = { themeColor: "#6d28d9" };

// Tema tercihi sayfa çizilmeden uygulanır, açık/koyu geçişinde yanıp sönme olmaz.
const themeScript = `try{var t=localStorage.getItem('kadro:tema');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
