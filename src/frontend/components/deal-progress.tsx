"use client";
import { useLanguage } from "../i18n/provider";
import type { Deal } from "@/escrow/client";
export function currentDealStep(
  deal: Pick<Deal, "state" | "approvals">,
  bondReady: boolean,
): number {
  if (deal.state === "created")
    return deal.approvals === 1 && bondReady ? 2 : 1;
  if (deal.state === "funded") return 3;
  if (deal.state === "delivered" || deal.state === "disputed") return 4;
  return -1;
}
export function DealProgress({
  deal,
  bondReady,
}: {
  deal: Deal;
  bondReady: boolean;
}) {
  const { t } = useLanguage(),
    current = currentDealStep(deal, bondReady);
  const labels = [
    t("Tạo link", "Create link"),
    t("Cọc trọng tài", "Arbitrator bond"),
    t("Nạp tiền", "Fund"),
    t("Giao hàng", "Deliver"),
    deal.state === "disputed"
      ? t("Tranh chấp", "Dispute")
      : t("Kiểm tra & trả tiền", "Review & payout"),
  ];
  const finished = (i: number) =>
    deal.state === "completed" ||
    i === 0 ||
    (i === 1 &&
      ["funded", "delivered", "disputed", "refunded"].includes(deal.state)) ||
    (i === 2 &&
      ["funded", "delivered", "disputed", "refunded"].includes(deal.state)) ||
    (i === 3 && ["delivered", "disputed"].includes(deal.state));
  const list = (
    <ol
      className="deal-flow"
      aria-label={t("Các bước giao dịch", "Deal steps")}
    >
      {labels.map((label, i) => (
        <li
          key={i}
          aria-current={current === i ? "step" : undefined}
          className={
            current === i
              ? deal.state === "disputed"
                ? "step-current step-dispute"
                : "step-current"
              : finished(i)
                ? "step-done"
                : "step-future"
          }
        >
          <span className="step-number">
            {finished(i) && current !== i ? "✓" : i + 1}
          </span>
          <span className="step-label">
            {label}
            {current === i && (
              <small>{t("Đang thực hiện", "Current step")}</small>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <div className="progress-desktop">{list}</div>
      <details className="progress-mobile">
        <summary>
          {current >= 0
            ? t(
                `Bước ${current + 1}/5 · ${labels[current]}`,
                `Step ${current + 1}/5 · ${labels[current]}`,
              )
            : t("Giao dịch đã kết thúc", "Deal ended")}
        </summary>
        {list}
      </details>
    </>
  );
}
