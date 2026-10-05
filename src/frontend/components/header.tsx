"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Menu, X } from "lucide-react";
import { useLanguage } from "../i18n/provider";
import { WalletButton } from "../wallet";
function layoutSnapshot() {
  return window.matchMedia("(max-width:767px)").matches
    ? "mobile"
    : window.matchMedia("(max-width:1023px)").matches
      ? "tablet"
      : "desktop";
}
function subscribeLayout(changed: () => void) {
  const queries = [
    window.matchMedia("(max-width:767px)"),
    window.matchMedia("(max-width:1023px)"),
  ];
  queries.forEach((q) => q.addEventListener("change", changed));
  return () => queries.forEach((q) => q.removeEventListener("change", changed));
}
export function Header() {
  const { locale, setLocale, t } = useLanguage();
  const pathname = usePathname();
  const layout = useSyncExternalStore(
    subscribeLayout,
    layoutSnapshot,
    () => "desktop",
  );
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    workspace = useRef<HTMLAnchorElement>(null);
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (layout !== "mobile" && dialog.current?.open) {
      dialog.current.close();
      workspace.current?.focus();
    }
  }, [layout]);
  const close = () => dialog.current?.close();
  const brand = (
    <Link key="brand" className="brand" href="/">
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
  );
  const navigation = (
    <nav
      key="navigation"
      className="header-nav"
      aria-label={t("Điều hướng chính", "Main navigation")}
    >
      <Link
        ref={workspace}
        className="workspace-entry"
        href="/admin"
        aria-current={pathname === "/admin" ? "page" : undefined}
        title={t("Mở workspace trọng tài", "Open arbitrator workspace")}
      >
        {t("Trọng tài", "Arbitrator")}
      </Link>
      <Link
        className="nav-secondary"
        href="/demo"
        aria-current={pathname === "/demo" ? "page" : undefined}
      >
        Demo
      </Link>
      <Link
        className="nav-secondary"
        href="/guide"
        aria-current={pathname === "/guide" ? "page" : undefined}
      >
        {t("Hướng dẫn", "Guide")}
      </Link>
    </nav>
  );
  const tools = (
    <div key="tools" className="header-tools">
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
        ref={trigger}
        className="header-menu-button"
        aria-label={t("Mở menu", "Open menu")}
        aria-expanded={opened}
        aria-controls="mobile-navigation"
        onClick={() => {
          dialog.current?.showModal();
          setOpened(true);
        }}
      >
        <Menu size={22} aria-hidden="true" />
      </button>
    </div>
  );
  const wallet = (
    <div key="wallet" className="header-wallet">
      <WalletButton />
    </div>
  );
  const slots =
    layout === "mobile"
      ? [brand, tools, navigation, wallet]
      : layout === "tablet"
        ? [brand, tools, wallet, navigation]
        : [brand, navigation, tools, wallet];
  return (
    <>
      <a className="skip" href="#main">
        {t("Đến nội dung chính", "Skip to content")}
      </a>
      <header className="header">
        <div className="header-inner">{slots}</div>
      </header>
      <dialog
        id="mobile-navigation"
        ref={dialog}
        className="mobile-menu-dialog"
        aria-labelledby="mobile-menu-title"
        onKeyDown={(event) => {
          if (
            event.key !== "Tab" ||
            event.ctrlKey ||
            event.altKey ||
            event.metaKey
          )
            return;
          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not(:disabled), a[href]",
          );
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClose={() => {
          setOpened(false);
          if (window.matchMedia("(max-width:767px)").matches)
            trigger.current?.focus();
        }}
        onClick={(event) => {
          if (event.target !== dialog.current) return;
          const rect = dialog.current.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close();
        }}
      >
        <div className="mobile-menu-heading">
          <h2 id="mobile-menu-title">{t("Điều hướng", "Navigation")}</h2>
          <button
            className="mobile-menu-close"
            autoFocus
            aria-label={t("Đóng menu", "Close menu")}
            onClick={close}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <nav
          className="mobile-menu-nav"
          aria-label={t("Menu di động", "Mobile menu")}
        >
          <Link
            className="button"
            href="/demo"
            onClick={close}
            aria-current={pathname === "/demo" ? "page" : undefined}
          >
            Demo
          </Link>
          <Link
            className="button"
            href="/guide"
            onClick={close}
            aria-current={pathname === "/guide" ? "page" : undefined}
          >
            {t("Hướng dẫn", "Guide")}
          </Link>
        </nav>
      </dialog>
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
