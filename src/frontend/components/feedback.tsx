"use client";
import { useLanguage } from "../i18n/provider";
export function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Address({ value }: { value: string }) {
  return <code className="address">{value}</code>;
}
export function Receipt({ signature }: { signature: string }) {
  const { t } = useLanguage();
  return (
    <a
      href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
      target="_blank"
      rel="noreferrer"
    >
      {t("Xem giao dịch trên Explorer", "View transaction on Explorer")} ↗
    </a>
  );
}
