import type { Metadata } from "next";
import { cookies } from "next/headers";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "./globals.css";
import { LanguageProvider } from "@/frontend/i18n/provider";
import { Footer, Header } from "@/frontend/components/header";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3104",
  ),
  title: "pipicachu — Hiểu giao dịch Solana",
  description:
    "Dán link giao dịch Solana. Hiểu tài sản thay đổi và đối chiếu khoản nhận bằng tiếng Việt hoặc English.",
  icons: { icon: "/brand/picachu-logo.jpg" },
  openGraph: {
    title: "pipicachu",
    description:
      "Solana transactions, explained. Kiểm tra giao dịch bằng dữ kiện có bằng chứng.",
    images: ["/brand/picachu-logo.jpg"],
  },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale =
    (await cookies()).get("pipicachu_locale")?.value === "en" ? "en" : "vi";
  return (
    <html lang={locale}>
      <body>
        <LanguageProvider initial={locale}>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
