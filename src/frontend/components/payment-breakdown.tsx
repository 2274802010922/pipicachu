"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/provider";
import { Address } from "./feedback";
import { amount } from "@/escrow/amounts";
import { feeBreakdown } from "@/escrow/fees";
import type { Deal } from "@/escrow/types";
import type { ProgramAuthority } from "@/escrow/program-authority";
import { PROGRAM_ID } from "@/escrow/constants";

export function ProgramTrust() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<ProgramAuthority | null>(null);
  useEffect(() => {
    let active = true;
    const read = () =>
      void fetch("/api/program-status", { cache: "no-store" })
        .then((r) => r.json())
        .then((v: ProgramAuthority) => {
          if (
            active &&
            v.programId === PROGRAM_ID.toBase58() &&
            ["immutable", "upgradeable", "unknown"].includes(v.state)
          )
            setStatus(v);
        })
        .catch(() => {
          if (active) setStatus(null);
        });
    read();
    const timer = setInterval(read, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const immutable = status?.state === "immutable",
    upgradeable = status?.state === "upgradeable";
  return (
    <div className="payment-trust">
      <strong>
        {immutable
          ? t(
              "Chương trình đã bỏ quyền nâng cấp",
              "Program upgrade authority removed",
            )
          : upgradeable
            ? t(
                "Devnet: chương trình còn quyền nâng cấp",
                "Devnet: program remains upgradeable",
              )
            : t(
                "Chưa xác minh được quyền nâng cấp",
                "Upgrade authority not verified",
              )}
      </strong>
      <p className="small">
        {immutable
          ? t(
              "Code chương trình này không thể nâng cấp. Phiên bản mới phải dùng chương trình khác; điều kiện deal hiện tại giữ nguyên.",
              "This program's code cannot be upgraded. New versions require another program; existing deal terms remain unchanged.",
            )
          : t(
              "Manager và trọng tài không có chức năng sửa phí. Khi còn quyền nâng cấp, không thể cam kết chủ dự án không thay logic.",
              "Manager and arbitrator have no fee-edit action. While upgrade authority exists, the operator can still replace program logic.",
            )}
      </p>
      <a
        href={`https://explorer.solana.com/address/${status?.programData || PROGRAM_ID.toBase58()}?cluster=devnet`}
        target="_blank"
        rel="noreferrer"
      >
        {t(
          "Kiểm chứng chương trình trên Explorer",
          "Verify program on Explorer",
        )}{" "}
        ↗
      </a>
      {status?.authority && (
        <details>
          <summary>
            {t("Ví giữ quyền nâng cấp", "Upgrade authority wallet")}
          </summary>
          <Address value={status.authority} />
        </details>
      )}
    </div>
  );
}

export function PaymentBreakdown({
  deal,
  treasury,
  compact = false,
}: {
  deal: Deal;
  treasury: string | null;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const refund = deal.state === "refunded",
    cancelled = deal.state === "cancelled";
  const f = feeBreakdown(deal.amount, deal.fee, deal.platformFee, refund);
  const rows = refund
    ? [
        [
          t("Người mua được hoàn", "Buyer refund"),
          deal.amount,
          deal.buyer,
        ] as const,
      ]
    : [
        [t("Người bán", "Seller"), f.sellerNet, deal.seller] as const,
        [
          t("Trọng tài", "Arbitrator"),
          f.arbitratorFee,
          deal.arbitrator,
        ] as const,
        ["pipicachu", f.platformFee, treasury] as const,
      ];
  return (
    <section
      className={`payment-breakdown ${compact ? "payment-compact" : "panel"}`}
      aria-label={t("Phân bổ tiền on-chain", "On-chain payment allocation")}
    >
      <h3>
        {cancelled
          ? t("Đã hủy — chưa nạp tiền", "Cancelled — no deposit")
          : refund
            ? t("Hoàn tiền theo deal", "Deal refund")
            : deal.state === "completed"
              ? t("Phân bổ của deal đã hoàn tất", "Completed deal allocation")
              : t("Tiền sẽ được chia thế nào?", "How will funds be split?")}
      </h3>
      {!cancelled && (
        <>
          <p>
            <strong>{amount(deal.amount)} USDC</strong> ·{" "}
            {refund
              ? t(
                  "Hoàn 100% · phí dịch vụ 0",
                  "100% refund · zero service fees",
                )
              : deal.feeVersion === 0
                ? t(
                    "Điều kiện deal cũ · 99 / 1 / 0",
                    "Legacy deal terms · 99 / 1 / 0",
                  )
                : "98% / 1% / 1%"}
          </p>
          <table>
            <caption className="sr-only">
              {t("Số tiền và địa chỉ nhận", "Amounts and recipients")}
            </caption>
            <thead>
              <tr>
                <th>{t("Người nhận", "Recipient")}</th>
                <th>USDC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, n, wallet]) => (
                <tr key={label}>
                  <td>
                    {label}
                    {
                      <div className="small">
                        {wallet ? (
                          <Address value={wallet} />
                        ) : (
                          t(
                            "Chưa đọc được ví nhận phí",
                            "Fee recipient unavailable",
                          )
                        )}
                      </div>
                    }
                  </td>
                  <td>
                    <strong>{amount(n)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small">
            {t(
              "Phí được lưu on-chain từ lúc tạo deal. Hoàn tiền: người mua nhận đủ tiền ban đầu, không phí dịch vụ. Phí mạng và SOL tạo tài khoản tính riêng.",
              "Fees are stored in the on-chain deal at creation. Refund returns the full principal with zero service fees. Network fees and account rent in SOL are separate.",
            )}
          </p>
          {!compact && (
            <details>
              <summary>
                {t("Làm tròn và địa chỉ nhận", "Rounding and recipients")}
              </summary>
              <p className="small">
                {t(
                  "Mỗi phí làm tròn xuống đến 0,000001 USDC; phần dư thuộc người bán. Nếu ví hệ thống trùng một bên, các khoản được cộng vào cùng token account; bảng vẫn tách theo vai.",
                  "Each fee rounds down to 0.000001 USDC; the seller receives the remainder. If the platform shares a participant wallet, transfers aggregate into one token account; this table keeps the roles separate.",
                )}
              </p>
            </details>
          )}
        </>
      )}
      {compact ? (
        <details>
          <summary>
            {t("Quyền nâng cấp chương trình", "Program upgrade authority")}
          </summary>
          <ProgramTrust />
        </details>
      ) : (
        <ProgramTrust />
      )}
    </section>
  );
}
