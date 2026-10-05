"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLanguage } from "../i18n/provider";
import { WalletButton } from "../wallet";
export function Header() {
  const { locale, setLocale, t } = useLanguage();
  const pathname = usePathname();
  return (
    <>
      <a className="skip" href="#main">
        {t("Đến nội dung chính", "Skip to content")}
      </a>
      <header className="header">
        <div className="header-inner">
          <Link className="brand" href="/">
            <Image
              src="/brand/picachu-logo.jpg"
              alt=""
              width={48}
              height={36}
              priority
            />
            <span>
              pipicachu<small>{t("GIAO DỊCH CÓ KÝ QUỸ", "ESCROW DEALS")}</small>
            </span>
          </Link>
          <div className="header-actions">
            <nav aria-label={t("Điều hướng chính", "Main navigation")}>
              <Link
                className="workspace-entry"
                href="/admin"
                aria-current={pathname === "/admin" ? "page" : undefined}
                title={t("Mở workspace trọng tài", "Open arbitrator workspace")}
              >
                {t("Trọng tài", "Arbitrator")}
              </Link>
              <Link href="/demo">Demo</Link>
              <Link href="/guide">{t("Hướng dẫn", "Guide")}</Link>
            </nav>
            <label className="sr-only" htmlFor="language">
              {t("Ngôn ngữ", "Language")}
            </label>
            <select
              id="language"
              value={locale}
              onChange={(e) => setLocale(e.target.value === "en" ? "en" : "vi")}
            >
              <option value="vi">VI</option>
              <option value="en">EN</option>
            </select>
            <WalletButton />
          </div>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  const { t } = useLanguage();
  return (
    <footer>
      <p>
        {t(
          "Solana Devnet · USDC thử nghiệm không có giá trị thật.",
          "Solana Devnet · Test USDC has no real value.",
        )}
      </p>
      <div>
        <Link href="/privacy">{t("Quyền riêng tư", "Privacy")}</Link>
        <a
          href="https://github.com/2274802010922/pipicachu"
          target="_blank"
          rel="noreferrer"
        >
          GitHub ↗
        </a>
      </div>
    </footer>
  );
}
