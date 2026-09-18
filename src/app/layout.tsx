import type { Metadata } from "next";
import { getTranslations } from "@/i18n";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aksesuar ERP + POS",
  description: "Telefon aksesuar magazalari icin multi-tenant ERP, POS, stok ve kasa platformu",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getTranslations();
  return (
    <html lang={locale}>
      <body>
        <Providers locale={locale} dictionary={t}>{children}</Providers>
      </body>
    </html>
  );
}
