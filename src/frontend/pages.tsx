"use client";
import Link from "next/link";
import { useLanguage } from "./i18n/provider";
import { Analyzer } from "./analyzer";
export function Home() {
  const { t } = useLanguage();
  return (
    <>
      <section className="page hero">
        <p className="eyebrow">
          SOLANA · {t("CHO NGƯỜI MỚI", "FOR BEGINNERS")}
        </p>
        <h1>
          {t("Hiểu giao dịch Solana", "Understand Solana transactions")}
          <br />
          <span>{t("bằng tiếng Việt.", "in plain language.")}</span>
        </h1>
        <p className="lead">
          {t(
            "Tiền đã đi đâu? Ví nhận được gì? Dán một link để xem dữ kiện rõ ràng và đối chiếu khoản bạn đang chờ nhận.",
            "Where did the money go? What did the wallet receive? Paste a link to see clear facts and compare a payment you expect.",
          )}
        </p>
        <Analyzer />
        <div className="trust-line">
          <span>{t("Không cần kết nối ví", "No wallet connection")}</span>
          <span>{t("Không lưu lịch sử", "No transaction history")}</span>
          <span>{t("Mainnet & Devnet", "Mainnet & Devnet")}</span>
        </div>
      </section>
      <section className="page how">
        <div>
          <p className="eyebrow">{t("BA BƯỚC", "THREE STEPS")}</p>
          <h2>
            {t("Kiểm tra mà không cần đọc mã.", "Check without reading code.")}
          </h2>
        </div>
        <ol className="steps">
          <li>
            <span>01</span>
            <h3>{t("Dán link", "Paste a link")}</h3>
            <p>
              {t(
                "Sao chép link giao dịch từ Explorer hoặc Solscan.",
                "Copy a transaction link from Explorer or Solscan.",
              )}
            </p>
          </li>
          <li>
            <span>02</span>
            <h3>{t("Hiểu kết quả", "Understand the result")}</h3>
            <p>
              {t(
                "Đọc trạng thái, số tiền, phí và phần chưa đủ dữ liệu.",
                "Read status, amounts, fees and any missing evidence.",
              )}
            </p>
          </li>
          <li>
            <span>03</span>
            <h3>{t("Đối chiếu", "Compare")}</h3>
            <p>
              {t(
                "Nhập ví nhận, token và số tiền bạn mong đợi.",
                "Enter the recipient, token and expected amount.",
              )}
            </p>
          </li>
        </ol>
      </section>
      <section className="page demo-cta">
        <div>
          <p className="eyebrow">{t("THỬ TRƯỚC", "TRY IT")}</p>
          <h2>
            {t(
              "Một giao dịch. Một kết quả dễ hiểu.",
              "One transaction. A clear result.",
            )}
          </h2>
          <p>
            {t(
              "Xem giao dịch mẫu có nguồn, hoặc ký chuyển SOL trong phòng thử nghiệm Devnet.",
              "Explore sourced examples, or sign a SOL transfer in the Devnet lab.",
            )}
          </p>
        </div>
        <Link className="button primary" href="/demo">
          {t("Mở Demo", "Open Demo")} →
        </Link>
      </section>
      <section className="page boundaries">
        <h3>{t("Biết rõ giới hạn", "Know the limits")}</h3>
        <p>
          {t(
            "MVP hỗ trợ chuyển SOL/USDC và đọc các giao dịch Jupiter thông dụng. Thao tác chưa giải mã được ghi rõ. Tool không xác nhận danh tính, không phục hồi tiền và không bảo đảm an toàn giao dịch.",
            "The MVP supports SOL/USDC transfers and common Jupiter activity. Unsupported operations are labeled. The tool does not verify identity, recover funds, or guarantee transaction safety.",
          )}
        </p>
      </section>
    </>
  );
}
export function Guide() {
  const { t } = useLanguage();
  return (
    <article className="page prose">
      <p className="eyebrow">{t("HƯỚNG DẪN", "GUIDE")}</p>
      <h1>
        {t(
          "Đọc giao dịch trong vài bước.",
          "Read a transaction in a few steps.",
        )}
      </h1>
      <h2>{t("Lấy đúng link giao dịch", "Get the transaction link")}</h2>
      <p>
        {t(
          "Mở lịch sử trong ví hoặc sàn, chọn một giao dịch rồi mở Explorer. Sao chép link có /tx/. Link địa chỉ ví /address/ không phải giao dịch.",
          "Open wallet or exchange history, choose a transaction and open its explorer. Copy the /tx/ link. A wallet /address/ link is not a transaction.",
        )}
      </p>
      <h2>{t("Trạng thái nói điều gì?", "What does the status mean?")}</h2>
      <dl>
        <dt>{t("Đã hoàn tất", "Finalized")}</dt>
        <dd>
          {t(
            "Mạng đã hoàn tất xác nhận giao dịch. Vẫn cần kiểm tra đúng ví và token.",
            "The network finalized the transaction. Still check the recipient and token.",
          )}
        </dd>
        <dt>{t("Thất bại", "Failed")}</dt>
        <dd>
          {t(
            "Các thao tác bị hủy; phí mạng có thể vẫn được thu.",
            "The operations were rolled back; the network fee may still be charged.",
          )}
        </dd>
        <dt>{t("Chưa đủ dữ liệu", "Not enough data")}</dt>
        <dd>
          {t(
            "Có thể do mạng được chọn, giới hạn nguồn dữ liệu hoặc giao dịch chưa xác nhận. Không có nghĩa tiền đã mất.",
            "This can reflect the selected network, provider limitations or unconfirmed data. It does not mean funds are lost.",
          )}
        </dd>
      </dl>
      <h2>
        {t("Token được xác minh bằng mint", "Tokens are identified by mint")}
      </h2>
      <p>
        {t(
          "Tên USDC có thể bị sao chép. pipicachu dùng địa chỉ mint USDC của Circle theo đúng mạng, không dùng tên hoặc hình token để đối chiếu.",
          "The USDC name can be copied. pipicachu compares Circle's USDC mint for the selected network, not token names or images.",
        )}
      </p>
      <h2>
        {t("Phí khác số tiền chuyển", "Fees differ from transferred amounts")}
      </h2>
      <p>
        {t(
          "Phí mạng, tiền tạo tài khoản và khoản hoàn lại khi đóng tài khoản là những phần khác nhau. Chênh lệch số dư SOL không tự bằng số tiền swap.",
          "Network fees, account creation deposits and closure refunds are different. A SOL balance change is not automatically the swap amount.",
        )}
      </p>
      <h2>{t("Đối chiếu có giới hạn", "Comparison has limits")}</h2>
      <p>
        {t(
          "Chỉ đối chiếu một giao dịch với mạng, ví, token và số tiền bạn nhập. Không chứng minh hóa đơn được trả duy nhất, người gửi là ai hoặc sàn đã ghi có.",
          "Compares a transaction with your network, wallet, token and amount. It does not prove unique invoice payment, sender identity or exchange credit.",
        )}
      </p>
      <h2>{t("Thử nghiệm Devnet", "Devnet testing")}</h2>
      <p>
        {t(
          "Trong Demo, chọn Kết nối ví và ký chuyển 0,001 SOL Devnet. Nếu thiếu SOL, dùng faucet Solana cho ví thử nghiệm. Bạn xem lại người nhận và số tiền trước khi ký.",
          "In Demo, connect a wallet and sign a 0.001 SOL Devnet transfer. Use the Solana faucet if your test wallet lacks SOL. Review the recipient and amount before signing.",
        )}
      </p>
      <a href="https://faucet.solana.com/" target="_blank" rel="noreferrer">
        Solana Faucet ↗
      </a>
      <p>
        <Link href="/demo">{t("Mở phòng Demo", "Open Demo")} →</Link>
      </p>
    </article>
  );
}
export function Privacy() {
  const { t } = useLanguage();
  return (
    <article className="page prose">
      <p className="eyebrow">{t("QUYỀN RIÊNG TƯ", "PRIVACY")}</p>
      <h1>{t("Thông tin được dùng thế nào?", "How is information used?")}</h1>
      <h2>{t("Không có tài khoản hay lịch sử", "No accounts or history")}</h2>
      <p>
        {t(
          "Ứng dụng không lưu lịch sử tra cứu hoặc thông tin đối chiếu của bạn. Mã giao dịch và mạng trong link chia sẻ là dữ liệu công khai. Cookie chỉ nhớ ngôn ngữ.",
          "The app does not store your lookup history or comparison details. A shared signature and network are public data. A cookie remembers only your language.",
        )}
      </p>
      <h2>RPC</h2>
      <p>
        {t(
          "Server gửi mã giao dịch tới RPC mạng được chọn để đọc dữ liệu blockchain. Nhà cung cấp RPC có chính sách xử lý riêng. Không tải website từ link bạn dán.",
          "The server sends the signature to the selected network's RPC provider to read blockchain data. Providers have their own policies. The pasted website is not fetched.",
        )}
      </p>
      <h2>AI / OpenRouter</h2>
      <p>
        {t(
          "Nếu AI được bật, chỉ ngữ cảnh đã chuẩn hóa như trạng thái, loại thao tác và loại tài sản được gửi. Không gửi địa chỉ đầy đủ, mã giao dịch, số tiền đối chiếu, memo hay raw log. Khi AI không khả dụng, ứng dụng dùng diễn giải từ dữ kiện.",
          "When AI is enabled, only normalized context such as status, operation types and asset types is sent. Full addresses, signatures, expected amounts, memos and raw logs are excluded. A fact-based template is used if AI is unavailable.",
        )}
      </p>
      <h2>{t("Cache và giới hạn lượt gọi", "Cache and request limits")}</h2>
      <p>
        {t(
          "Dữ kiện giao dịch công khai đã hoàn tất có thể được cache tối đa 24 giờ, dữ liệu chưa hoàn tất tối đa 5 giây. Bộ đếm lượt gọi dùng mã IP băm, không phải hồ sơ người dùng. Trạng thái demo giữ tối đa một giờ để tránh gửi lặp.",
          "Finalized public facts may be cached for up to 24 hours, unfinished data for up to 5 seconds. Request counters use hashed IP identifiers, not user profiles. Demo state lasts up to one hour to prevent duplicate sends.",
        )}
      </p>
      <h2>{t("Ví của bạn", "Your wallet")}</h2>
      <p>
        {t(
          "Tra cứu không cần ký. Phòng demo chỉ ký và gửi giao dịch Devnet đã được xem trước. Tool không yêu cầu recovery phrase, private key hoặc mật khẩu ví.",
          "Lookups do not require signing. The lab only signs and broadcasts a previewed Devnet transaction. The tool never asks for a recovery phrase, private key or wallet password.",
        )}
      </p>
      <h2>{t("Giới hạn kết luận", "Limits")}</h2>
      <p>
        {t(
          "Tool không xác nhận danh tính, nguồn tiền hợp pháp, an toàn tuyệt đối hay việc sàn ghi có. Đối chiếu không phải hệ thống xử lý hóa đơn chống dùng lại giao dịch.",
          "The tool does not establish identity, lawful funds, absolute safety or exchange credit. Comparison is not an invoice system with transaction reuse protection.",
        )}
      </p>
    </article>
  );
}
