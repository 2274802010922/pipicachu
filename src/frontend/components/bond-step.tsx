"use client";
import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "../i18n/provider";
import { amount, type Arbitrator, type Deal } from "@/escrow/client";
import { bondReadiness } from "@/escrow/bond";
export function BondStep({
  deal,
  profile,
  wallet,
  busy,
  fresh,
  onPrepare,
  feedback,
}: {
  deal: Deal;
  profile: Arbitrator | null | undefined;
  wallet: string | null;
  busy: boolean;
  fresh: boolean;
  onPrepare: (missing: bigint) => Promise<void>;
  feedback: React.ReactNode;
}) {
  const { t } = useLanguage();
  const [accepted, setAccepted] = useState(false);
  const [copied, setCopied] = useState("");
  const readiness = fresh ? bondReadiness(deal.bond, profile) : null;
  const isArbitrator = wallet === deal.arbitrator;
  const done = readiness?.ready && deal.approvals === 1;
  return (
    <section
      className="panel bond-step action-card"
      aria-labelledby="bond-step-title"
    >
      <span className="eyebrow">{t("BƯỚC 2/5", "STEP 2/5")}</span>
      <h2 id="bond-step-title">
        {t(
          "Trọng tài nạp cọc và nhận deal",
          "Arbitrator deposits bond and accepts the deal",
        )}
      </h2>
      <div className="bond-amounts">
        <div>
          <span>{t("Cọc cần", "Required bond")}</span>
          <strong>{amount(deal.bond)} USDC</strong>
        </div>
        <div>
          <span>{t("Cần nạp thêm", "Additional deposit")}</span>
          <strong>
            {readiness ? `${amount(readiness.missing)} USDC` : "—"}
          </strong>
        </div>
      </div>
      <p className="small">
        {done
          ? t(
              "Đủ cọc, đã nhận deal. Người mua có thể nạp.",
              "Bond sufficient and deal accepted. Buyer can fund.",
            )
          : !readiness
            ? t(
                "Chưa đọc được cọc. Tải lại trạng thái.",
                "Bond unavailable. Refresh state.",
              )
            : readiness.ready
              ? t(
                  "Đủ cọc hiện có. Chỉ cần nhận deal.",
                  "Existing bond is sufficient. Accept the deal.",
                )
              : t(
                  "Chưa đủ cọc. Trọng tài nạp phần còn thiếu.",
                  "Insufficient bond. The arbitrator deposits the shortfall.",
                )}
      </p>
      {isArbitrator && !done && readiness && fresh ? (
        <>
          <label className="check compact-consent">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              {t(
                "Tôi đồng ý nhận deal và khoản cọc này.",
                "I accept this deal and bond amount.",
              )}
            </span>
          </label>
          <div className="actions main-actions">
            <button
              className="primary action-current"
              disabled={!accepted || busy}
              onClick={async () => {
                await onPrepare(readiness.missing);
                setAccepted(false);
              }}
            >
              {readiness.missing > 0n
                ? deal.approvals === 1
                  ? t(
                      `Nạp thêm ${amount(readiness.missing)} USDC`,
                      `Deposit ${amount(readiness.missing)} USDC`,
                    )
                  : t(
                      `Nạp ${amount(readiness.missing)} USDC và nhận deal`,
                      `Deposit ${amount(readiness.missing)} USDC and accept`,
                    )
                : t("Nhận deal", "Accept deal")}
            </button>
          </div>
        </>
      ) : !done ? (
        <>
          <p>
            {t(
              "Chờ ví trọng tài thực hiện bước này.",
              "Waiting for the arbitrator wallet.",
            )}
          </p>
          <button
            className="primary action-current"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${location.origin}/deals/${deal.address}`,
                );
                setCopied(t("Đã sao chép link.", "Link copied."));
              } catch {
                setCopied(
                  t(
                    "Sao chép link trên thanh địa chỉ.",
                    "Copy the address-bar link.",
                  ),
                );
              }
            }}
          >
            {t("Sao chép link gửi trọng tài", "Copy link for arbitrator")}
          </button>
        </>
      ) : null}
      {copied && (
        <p role="status" className="small">
          {copied}
        </p>
      )}
      {isArbitrator && feedback}
      <details>
        <summary>{t("Chi tiết cọc", "Bond details")}</summary>
        <p>
          {t("Cọc khả dụng:", "Available bond:")}{" "}
          {readiness ? `${amount(readiness.available)} USDC` : "—"}
        </p>
        <p className="small">
          {t(
            "Dùng cọc hiện có nếu đủ. Phần cọc của deal chỉ khóa khi người mua nạp tiền; người bán không nạp cọc.",
            "Reuse existing available bond. This deal’s bond is reserved when the buyer funds; the seller deposits no bond.",
          )}
        </p>
        <code className="address">{deal.arbitrator}</code>
        <Link href="/admin" target="_blank" rel="noreferrer">
          {t("Quản lý quỹ cọc", "Manage bond pool")} ↗
        </Link>
      </details>
    </section>
  );
}
