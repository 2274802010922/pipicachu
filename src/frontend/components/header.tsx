"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useLanguage } from "../i18n/provider";
export function Header() {
  const { locale, setLocale, t } = useLanguage(),
    [open, setOpen] = useState(false);
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
              pipicachu
              <small>{t("HIỂU GIAO DỊCH", "TRANSACTIONS, EXPLAINED")}</small>
            </span>
          </Link>
          <div className="header-actions">
            <nav
              className={open ? "nav open" : "nav"}
              aria-label={t("Điều hướng chính", "Main navigation")}
            >
              <Link onClick={() => setOpen(false)} href="/guide">
                {t("Hướng dẫn", "Guide")}
              </Link>
              <Link onClick={() => setOpen(false)} href="/demo">
                Demo
              </Link>
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
            <button
              className="mobile-menu"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? t("Đóng", "Close") : "Menu"}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="footer">
      <p>
        pipicachu ·{" "}
        {t(
          "Dữ kiện có bằng chứng. Giải thích dễ hiểu.",
          "Evidence-backed facts. Clear explanations.",
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
