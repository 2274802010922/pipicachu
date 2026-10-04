import type { Analysis, Explanation, Locale } from "../shared/types";
export function templateExplanation(a: Analysis, locale: Locale): Explanation {
  const vi = locale === "vi";
  const line =
    a.state === "failed"
      ? vi
        ? "Giao dịch không hoàn thành. Các thao tác chuyển tài sản trong giao dịch đã bị hủy, nhưng phí mạng có thể vẫn được thu."
        : "The transaction did not complete. Its asset operations were rolled back, but the network fee may still be charged."
      : a.state === "unknown"
        ? vi
          ? "Chưa có đủ dữ liệu để xác định kết quả. Kiểm tra lại mạng đã chọn hoặc thử lại sau."
          : "There is not enough data to determine the result. Check the selected network or try again later."
        : a.state === "pending" || a.finality !== "finalized"
          ? vi
            ? "Mạng chưa hoàn tất xác nhận. Hãy kiểm tra lại trước khi dùng giao dịch làm bằng chứng nhận tiền."
            : "The network has not finalized this transaction. Check again before relying on it as payment evidence."
          : a.category === "swap"
            ? vi
              ? "Giao dịch tương tác với Jupiter. Thay đổi số dư SOL có thể bao gồm phí mạng và tiền tạo hoặc đóng tài khoản, ngoài phần trao đổi."
              : "The transaction interacts with Jupiter. The SOL balance change can include fees and account creation or closure, in addition to the exchange."
            : a.completeness === "partial"
              ? vi
                ? "Một phần thao tác chưa được giải mã đầy đủ. Chỉ các dữ kiện có bằng chứng mới được hiển thị; chưa thể kết luận toàn bộ mục đích giao dịch."
                : "Some operations are only partially decoded. Only evidenced facts are shown; the full transaction intent cannot be established."
              : vi
                ? "Đối chiếu đúng địa chỉ ví nhận và token trước khi kết luận. Một giao dịch hoàn tất không tự chứng minh danh tính người gửi hay việc sàn đã ghi có."
                : "Check the recipient address and token. A finalized transaction does not establish the sender's identity or an exchange account credit.";
  return { lines: [line], source: "template" };
}
