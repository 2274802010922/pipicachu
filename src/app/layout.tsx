export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "./globals.css";
import { LanguageProvider } from "@/frontend/i18n/provider";
import { WalletProvider } from "@/frontend/wallet";
import { Header, Footer } from "@/frontend/components/header";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://pipicachu.vercel.app",
  ),
  title: "pipicachu — Giao dịch có ký quỹ",
  description:
    "Tạo link giao dịch, ký quỹ USDC Devnet, xác nhận bàn giao và xử lý tranh chấp.",
  icons: { icon: "/brand/picachu-logo.jpg" },
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
          <WalletProvider>
            <Header />
            <main id="main">{children}</main>
            <Footer />
          </WalletProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
