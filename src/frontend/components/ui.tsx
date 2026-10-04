"use client";
import { useLanguage } from "../i18n/provider";
import { formatAmount } from "@/core/amount";
import type { Analysis, Comparison } from "@/shared/types";
export function AddressDisplay({ address }: { address: string | null }) {
  const { t } = useLanguage();
  return address ? (
    <span className="address">
      <code title={address}>{address}</code>
      <button
        type="button"
        className="copy"
        aria-label={t("Sao chép địa chỉ", "Copy address")}
        onClick={() => void navigator.clipboard.writeText(address)}
      >
        {t("Sao chép", "Copy")}
      </button>
    </span>
  ) : (
    <span>—</span>
  );
}
export function Notice({
  children,
  kind = "info",
}: {
  children: React.ReactNode;
  kind?: "info" | "error" | "success";
}) {
  return (
    <div
      className={`notice ${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function StatusBadge({ analysis }: { analysis: Analysis }) {
  const { t } = useLanguage();
  const text =
    analysis.state === "failed"
      ? t("Giao dịch thất bại", "Transaction failed")
      : analysis.state === "unknown"
        ? t("Chưa đủ dữ liệu", "Not enough data")
        : analysis.finality === "finalized"
          ? t("Đã hoàn tất trên mạng", "Finalized on the network")
          : t("Chưa hoàn tất xác nhận", "Not finalized yet");
  return (
    <span
      className={`status ${analysis.state === "success" && analysis.finality === "finalized" ? "success" : analysis.state === "failed" ? "error" : "info"}`}
    >
      {text}
    </span>
  );
}
export function ComparisonResult({
  result,
  decimals,
}: {
  result: Comparison;
  decimals: number;
}) {
  const { locale, t } = useLanguage();
  const labels = {
    matched: t(
      "Khớp thông tin bạn nhập và đã hoàn tất",
      "Matches your details and is finalized",
    ),
    underpaid: t("Nhận thiếu so với yêu cầu", "Received less than expected"),
    overpaid: t("Nhận dư so với yêu cầu", "Received more than expected"),
    "wrong-network": t("Không khớp mạng mong đợi", "Wrong expected network"),
    "wrong-recipient": t("Không khớp ví nhận", "Wrong recipient"),
    "wrong-token": t("Không khớp token mong đợi", "Wrong expected token"),
    failed: t(
      "Giao dịch thất bại — chưa xác nhận thanh toán",
      "Failed transaction — payment not confirmed",
    ),
    pending: t("Đang chờ mạng hoàn tất", "Waiting for finalization"),
    insufficient: t(
      "Chưa đủ bằng chứng để đối chiếu",
      "Insufficient evidence to compare",
    ),
  };
  const checkLabels = {
    network: t("Mạng", "Network"),
    recipient: t("Ví nhận", "Recipient"),
    token: "Token",
    amount: t("Số tiền", "Amount"),
    finalized: t("Mạng đã hoàn tất", "Finalized"),
  };
  return (
    <section className="comparison-result" aria-live="polite">
      <Notice kind={result.verdict === "matched" ? "success" : "info"}>
        <strong>{labels[result.verdict]}</strong>
        {result.receivedAtomic !== null && (
          <p>
            {t("Số tiền nhận được", "Amount received")}:{" "}
            {formatAmount(result.receivedAtomic, decimals, locale)}.{" "}
            {t("Mong đợi", "Expected")}:{" "}
            {formatAmount(result.expectedAtomic, decimals, locale)}.
          </p>
        )}
      </Notice>
      <dl className="check-list">
        {Object.entries(result.checks).map(([key, value]) => (
          <div key={key}>
            <dt>{checkLabels[key as keyof typeof checkLabels]}</dt>
            <dd>
              {value === null
                ? t("Chưa kết luận", "Undetermined")
                : value
                  ? t("Khớp", "Matches")
                  : t("Chưa khớp", "Does not match")}
            </dd>
          </div>
        ))}
      </dl>
      <p className="muted small">
        {t(
          "Chỉ đối chiếu giao dịch này với thông tin bạn nhập. Không xác minh danh tính, hóa đơn, ghi có của sàn hoặc việc sử dụng lại giao dịch.",
          "Only compares this transaction with your input. Does not verify identity, invoices, exchange credit, or reuse of the transaction.",
        )}
      </p>
    </section>
  );
}
export function errorText(code: string, vi: boolean): string {
  const messages: Record<string, [string, string]> = {
    INVALID_INPUT: [
      "Thông tin chưa hợp lệ. Kiểm tra lại các trường đã nhập.",
      "Invalid input. Check the fields.",
    ],
    INVALID_LINK: [
      "Dùng link giao dịch HTTPS từ Solana Explorer hoặc Solscan.",
      "Use an HTTPS transaction link from Solana Explorer or Solscan.",
    ],
    TRANSACTION_LINK_REQUIRED: [
      "Đây chưa phải link giao dịch. Sao chép link có /tx/ từ Explorer.",
      "This is not a transaction link. Copy an Explorer link containing /tx/.",
    ],
    INVALID_SIGNATURE: [
      "Mã giao dịch chưa hợp lệ. Địa chỉ ví không phải mã giao dịch.",
      "Invalid transaction signature. A wallet address is not a transaction signature.",
    ],
    INVALID_RECIPIENT: [
      "Địa chỉ ví chưa hợp lệ. Sao chép lại địa chỉ đầy đủ.",
      "Invalid wallet address. Copy the full address.",
    ],
    INVALID_AMOUNT: [
      "Nhập số tiền dương, ví dụ 50 hoặc 50,5; không dùng dấu phân cách hàng nghìn.",
      "Enter a positive amount, such as 50 or 50.5; do not use thousands separators.",
    ],
    AMOUNT_PRECISION: [
      "Số tiền có quá nhiều chữ số thập phân cho token này.",
      "Too many decimal places for this token.",
    ],
    UNSUPPORTED_NETWORK: [
      "Chỉ hỗ trợ Solana Mainnet và Devnet, không dùng custom RPC.",
      "Only Solana Mainnet and Devnet are supported; no custom RPC.",
    ],
    UNSUPPORTED_VERSION: [
      "Phiên bản giao dịch này chưa được hỗ trợ.",
      "This transaction version is not yet supported.",
    ],
    RPC_UNAVAILABLE: [
      "Chưa đọc được dữ liệu mạng. Thử lại sau; chưa thể kết luận giao dịch thất bại.",
      "Network data is unavailable. Retry later; this does not mean the transaction failed.",
    ],
    RPC_RATE_LIMIT: [
      "Nguồn dữ liệu đang giới hạn lượt đọc. Đợi một lúc rồi thử lại.",
      "The data provider is rate-limiting requests. Wait and retry.",
    ],
    RPC_NETWORK_MISMATCH: [
      "RPC không khớp mạng đã chọn. Thao tác đã bị chặn.",
      "RPC does not match the selected network. The operation was blocked.",
    ],
    LIMITER_UNAVAILABLE: [
      "Dịch vụ giới hạn lượt gọi chưa sẵn sàng. Thử lại sau hoặc xem ví dụ đã lưu trong Demo.",
      "The request limiter is unavailable. Retry later or view archived examples in Demo.",
    ],
    RATE_LIMITED: [
      "Bạn đã kiểm tra nhiều lần trong thời gian ngắn. Đợi một phút rồi thử lại.",
      "Too many requests. Wait a minute and retry.",
    ],
    DEMO_NOT_CONFIGURED: [
      "Ví nhận demo chưa được cấu hình. Xem hướng dẫn thiết lập Devnet.",
      "The demo recipient is not configured. See the Devnet setup guide.",
    ],
    DEMO_SELF_TRANSFER: [
      "Ví gửi cần khác ví nhận demo.",
      "The sender must differ from the demo recipient.",
    ],
    DEMO_SIMULATION_FAILED: [
      "Giao dịch thử chưa thể chạy. Kiểm tra SOL Devnet và phí mạng trong ví.",
      "The demo cannot run yet. Check your Devnet SOL balance and network fees.",
    ],
    DEMO_EXPIRED: [
      "Bản chuẩn bị đã hết hạn. Chuẩn bị lại trước khi ký.",
      "The prepared transaction expired. Prepare it again before signing.",
    ],
    TRANSACTION_CHANGED: [
      "Nội dung đã thay đổi sau khi chuẩn bị. Giao dịch bị chặn trước khi gửi.",
      "The prepared message changed. The transaction was blocked before broadcast.",
    ],
    WALLET_MISSING: [
      "Mở trang này trong trình duyệt có Phantom để ký thử Devnet.",
      "Open this page in a browser with Phantom to sign a Devnet demo.",
    ],
    WALLET_REJECTED: [
      "Bạn đã hủy ký. Tool chưa gửi giao dịch.",
      "Signing was cancelled. The tool did not broadcast a transaction.",
    ],
    WALLET_CHANGED: [
      "Ví đang dùng đã thay đổi. Chuẩn bị lại giao dịch.",
      "The connected wallet changed. Prepare a new transaction.",
    ],
    INTERNAL_ERROR: [
      "Chưa xử lý được yêu cầu. Thử lại sau.",
      "The request could not be processed. Try again later.",
    ],
  };
  return (messages[code] || messages.INTERNAL_ERROR)[vi ? 0 : 1];
}
