import type { Deal } from "@/escrow/client";
import arbitratorConfig from "@/escrow/arbitrator-config.json";
export function organizationName(address: string, locale: string) {
  const label =
    address === arbitratorConfig.wallet
      ? locale === "vi"
        ? "Trọng tài của dự án"
        : "Project arbitrator"
      : locale === "vi"
        ? "Trọng tài đã duyệt"
        : "Approved arbitrator";
  return `${label} · ${address.slice(0, 4)}…${address.slice(-4)}`;
}
export const STATE_LABELS: Record<Deal["state"], [string, string]> = {
  created: ["Chờ chấp thuận / nạp tiền", "Awaiting acceptance / funding"],
  funded: ["Đã ký quỹ · chờ bàn giao", "Funded · awaiting delivery"],
  delivered: ["Đã báo bàn giao · chờ kiểm tra", "Delivered · awaiting review"],
  disputed: ["Đang tranh chấp", "Disputed"],
  completed: ["Đã trả người bán", "Paid to seller"],
  refunded: ["Đã hoàn người mua", "Refunded to buyer"],
  cancelled: ["Đã hủy trước khi nạp", "Cancelled before funding"],
};
export const ACTION_LABELS: Record<string, [string, string]> = {
  accept_deal: ["Chấp thuận làm trọng tài", "Accept arbitration role"],
  fund: ["Nạp tiền vào ký quỹ", "Fund escrow"],
  cancel_deal: ["Hủy deal chưa nạp", "Cancel unfunded deal"],
  deliver: ["Đánh dấu đã bàn giao", "Mark delivered"],
  confirm: [
    "Xác nhận nhận hàng và trả người bán",
    "Confirm receipt and pay seller",
  ],
  dispute: ["Mở tranh chấp", "Open dispute"],
  finalize: ["Giải ngân sau thời hạn", "Release after review deadline"],
  refund_expired: [
    "Hoàn tiền do quá hạn bàn giao",
    "Refund after delivery deadline",
  ],
  resolve_seller: ["Phán quyết: trả người bán", "Rule: pay seller"],
  resolve_buyer: ["Phán quyết: hoàn người mua", "Rule: refund buyer"],
  propose_seller: ["Đề nghị trả người bán", "Propose seller payout"],
  propose_buyer: ["Đề nghị hoàn người mua", "Propose buyer refund"],
  accept_settlement: [
    "Đồng ý đề nghị và kết thúc deal",
    "Accept proposal and settle",
  ],
};
