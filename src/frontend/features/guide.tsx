"use client";
import { useLanguage } from "../i18n/provider";
export function Guide({ privacy = false }: { privacy?: boolean }) {
  const { t } = useLanguage();
  return (
    <>
      <h1>
        {privacy
          ? t("Quyền riêng tư và dữ liệu", "Privacy and data")
          : t("Ký quỹ hoạt động thế nào?", "How does escrow work?")}
      </h1>
      {privacy ? (
        <section className="panel">
          <p>
            {t(
              "Địa chỉ ví, điều khoản deal, số tiền, thời hạn và hash bằng chứng được ghi công khai trên blockchain. Giao dịch không thể xóa như lịch sử trình duyệt.",
              "Wallet addresses, deal terms, amounts, deadlines and evidence hashes are public on-chain. Transactions cannot be deleted like browser history.",
            )}
          </p>
          <p>
            {t(
              "Ghi chú được băm trong trình duyệt; ứng dụng không lưu nội dung hoặc nhận file. Gửi hàng và bằng chứng qua kênh đã thỏa thuận. Hash không mã hóa nội dung, nên không ghi mật khẩu hoặc dữ liệu riêng tư.",
              "Notes are hashed in your browser; the app does not store their content or accept files. Share goods and evidence through the agreed channel. Hashing is not encryption: do not include passwords or private data.",
            )}
          </p>
          <p>
            {t(
              "RPC xử lý yêu cầu đọc/gửi giao dịch. Nhà cung cấp hosting/RPC có thể có log vận hành. Cookie chỉ ghi ngôn ngữ. Tab giữ metadata thao tác chưa rõ kết quả trong sessionStorage để khôi phục, rồi xóa khi kết thúc hoặc đổi ví. Redis lưu giới hạn IP dạng HMAC có TTL và report keeper; không lưu nội dung bằng chứng.",
              "RPC providers process transaction reads/submissions. Hosting/RPC providers may retain operational logs. The cookie stores language. Pending operation metadata stays in tab sessionStorage for recovery and is removed on completion or wallet change. Redis stores expiring HMAC IP limits and keeper reports, not evidence content.",
            )}
          </p>
        </section>
      ) : (
        <>
          <section className="panel">
            <h2>{t("Ai có quyền làm gì?", "Who can do what?")}</h2>
            <ul>
              <li>
                {t(
                  "Người bán: tạo deal, bàn giao; không tự rút tiền trước điều kiện giải ngân.",
                  "Seller: creates and delivers; cannot withdraw before payout conditions.",
                )}
              </li>
              <li>
                {t(
                  "Người mua: nạp, xác nhận, mở tranh chấp trước hạn kiểm tra.",
                  "Buyer: funds, confirms and disputes before the review deadline.",
                )}
              </li>
              <li>
                {t(
                  "Trọng tài đã duyệt: nạp cọc và bật nhận trước. Deal mới cho xử sau SLA; deal cũ giữ quyền và hạn đã ký.",
                  "Approved arbitrators deposit bond and enable service. New deals permit late rulings; legacy permissions and deadlines remain unchanged.",
                )}
              </li>
            </ul>
          </section>
          <section className="panel">
            <h2>{t("Thời hạn và tranh chấp", "Deadlines and disputes")}</h2>
            <p>
              {t(
                "Không bàn giao đúng hạn: hoàn người mua. Đã báo bàn giao: người mua có khoảng kiểm tra để xác nhận/tranh chấp. Hết hạn mà không tranh chấp: có thể gửi giao dịch giải ngân.",
                "Missed delivery: refund buyer. After delivery, the buyer has a review window to confirm/dispute. Without a timely dispute, a release transaction can be submitted.",
              )}
            </p>
            <p>
              {t(
                "Deal mới cho trọng tài xử cả sau hạn SLA. Sau hạn, người mua cũng có thể đề nghị settlement và người bán ký đồng ý. Nếu trọng tài bỏ xử và hai bên bất đồng, tiền vẫn có thể khóa.",
                "For new deals, the arbitrator may rule after the SLA. After expiry, a buyer can also propose settlement for the seller to accept. Arbitrator abandonment without mutual agreement can still lock funds.",
              )}
            </p>
          </section>
          <section className="panel">
            <h2>{t("Giới hạn bạn cần hiểu", "Limits to understand")}</h2>
            <ul>
              <li>
                {t(
                  "Cọc không tự chứng minh phán quyết đúng; chưa có phạt xử sai hoặc bảo hiểm.",
                  "Bond does not prove a ruling is correct; there is no wrongful-ruling slashing or insurance.",
                )}
              </li>
              <li>
                {t(
                  "Hash không xác minh hàng hóa ngoài chuỗi. Tài khoản game có thể bị thu hồi; escrow không bảo đảm quyền sở hữu lâu dài.",
                  "A hash does not verify off-chain goods. Game accounts may be reclaimed; escrow does not guarantee lasting ownership.",
                )}
              </li>
              <li>
                {t(
                  "Keeper tự gửi lệnh khi hết hạn kiểm tra và không tranh chấp. Lịch khoảng 5 phút/lượt có thể trễ; chương trình kiểm lại điều kiện trước khi chuyển tiền.",
                  "The keeper submits release after an undisputed review deadline. The roughly 5-minute schedule may be delayed; the program validates conditions before transferring funds.",
                )}
              </li>
              <li>
                {t(
                  "Chương trình Devnet còn quyền nâng cấp, chưa audit độc lập. Không dùng tài sản thật.",
                  "The Devnet program retains upgrade authority and has no independent audit. Do not use real assets.",
                )}
              </li>
            </ul>
          </section>
        </>
      )}
    </>
  );
}
