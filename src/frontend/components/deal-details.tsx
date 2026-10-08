"use client";
import { PublicKey } from "@solana/web3.js";
import { type Deal, amount, vaultAddress } from "@/escrow/client";
import { feeBreakdown } from "@/escrow/fees";
import { useLanguage } from "../i18n/provider";
import { Address, Receipt } from "./feedback";
function vaultAddressFor(id: string) {
  return vaultAddress(new PublicKey(id)).toBase58();
}
export function DealDetails({
  deal,
  deadline,
  receipts,
}: {
  deal: Deal;
  deadline: number;
  receipts: { signature: string; err: unknown; confirmationStatus?: string }[];
}) {
  const { t, locale } = useLanguage();
  const id = deal.address;
  const fees = feeBreakdown(deal.amount, deal.fee, deal.platformFee);
  return (
    <>
      <details className="panel disclosure">
        <summary>{t("Điều kiện giao dịch", "Deal terms")}</summary>
        <p className="terms-text">{deal.terms}</p>
        <dl>
          <div>
            <dt>{t("Tiền giao dịch", "Deal amount")}</dt>
            <dd>{amount(deal.amount)} USDC</dd>
          </div>
          <div>
            <dt>{t("Tổng phí dịch vụ", "Total service fees")}</dt>
            <dd>
              {amount(
                ["refunded", "cancelled"].includes(deal.state)
                  ? 0n
                  : fees.totalFee,
              )}{" "}
              USDC
            </dd>
          </div>
          <div>
            <dt>{t("Phí trọng tài", "Arbitrator fee")}</dt>
            <dd>
              {amount(
                ["refunded", "cancelled"].includes(deal.state) ? 0n : deal.fee,
              )}{" "}
              USDC (1%)
            </dd>
          </div>
          <div>
            <dt>{t("Phí hệ thống pipicachu", "pipicachu platform fee")}</dt>
            <dd>
              {amount(
                ["refunded", "cancelled"].includes(deal.state)
                  ? 0n
                  : deal.platformFee,
              )}{" "}
              USDC ({deal.feeVersion === 0 ? "0" : "1"}%)
            </dd>
          </div>
          <div>
            <dt>{t("Cọc trọng tài", "Arbitrator bond")}</dt>
            <dd>
              {amount(deal.bond)} USDC ·{" "}
              {["completed", "refunded"].includes(deal.state)
                ? t("đã mở khóa", "released")
                : deal.state === "created" || deal.state === "cancelled"
                  ? t("chưa khóa cho deal", "not reserved yet")
                  : t("đang khóa", "reserved")}
            </dd>
          </div>
          {deadline > 0 && (
            <div>
              <dt>{t("Thời hạn", "Deadline")}</dt>
              <dd>
                {new Date(deadline * 1000).toLocaleString(
                  locale === "vi" ? "vi-VN" : "en-US",
                )}
              </dd>
            </div>
          )}
        </dl>
      </details>
      <details className="panel disclosure">
        <summary>{t("Ví và bằng chứng", "Wallets and evidence")}</summary>
        <dl>
          {[
            [t("Người mua", "Buyer"), deal.buyer],
            [t("Người bán", "Seller"), deal.seller],
            [t("Trọng tài", "Arbitrator"), deal.arbitrator],
            ["Mint", deal.mint],
            ["Deal", id],
            ["Vault", vaultAddressFor(id)],
            [t("Hash bàn giao", "Delivery hash"), deal.deliveryHash],
            [t("Hash khiếu nại", "Dispute hash"), deal.disputeHash],
            [t("Hash phán quyết", "Resolution hash"), deal.resolutionHash],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <Address value={value} />
              </dd>
            </div>
          ))}
        </dl>
        <h3>{t("Giao dịch liên quan", "Related transactions")}</h3>
        {receipts.length ? (
          <ul>
            {receipts.map((r) => (
              <li key={r.signature}>
                <Receipt signature={r.signature} />
                {r.err ? ` · ${t("Thất bại", "Failed")}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("Chưa tải được lịch sử.", "History unavailable.")}</p>
        )}
      </details>
      <details className="panel disclosure">
        <summary>{t("Cách hoạt động", "How it works")}</summary>
        <p>
          {t(
            deal.resolutionPolicyVersion === 1
              ? "Người mua xác nhận hoặc khiếu nại trước hạn. Hết hạn không khiếu nại, keeper gửi lệnh trả tiền. Trọng tài được xử sau hạn SLA. Cọc không phải bảo hiểm; bỏ xử và hai bên bất đồng có thể khóa tiền."
              : "Người mua xác nhận hoặc khiếu nại trước hạn. Hết hạn không khiếu nại, keeper gửi lệnh trả tiền. Deal cũ: sau hạn trọng tài, hai bên cần đồng thuận.",
            deal.resolutionPolicyVersion === 1
              ? "The buyer confirms or disputes before the deadline. Without a timely dispute, the keeper submits payout. The arbitrator may rule past the SLA. Bond is not insurance; abandonment without mutual agreement may lock funds."
              : "The buyer confirms or disputes before the deadline. Without a timely dispute, the keeper submits payout. Legacy deal: after the arbitration deadline, both parties must agree.",
          )}
        </p>
      </details>
    </>
  );
}
