"use client";
import Link from "next/link";
import { useLanguage } from "../i18n/provider";
import { Notice, Address } from "../components/feedback";
import deployment from "@/escrow/deployment.json";
import arbitratorConfig from "@/escrow/arbitrator-config.json";
import samples from "@/escrow/samples.json";
export function Demo() {
  const { t } = useLanguage();
  return (
    <>
      <span className="eyebrow">DEVNET / DEMO</span>
      <h1>{t("Thử trọn luồng ký quỹ", "Try the full escrow flow")}</h1>
      <p className="lead">
        {t(
          "Ba ví độc lập: người bán, người mua và trọng tài. SOL trả phí; USDC Devnet dùng cho deal và cọc.",
          "Three separate wallets: seller, buyer and arbitrator. SOL pays network fees; Devnet USDC funds deals and bonds.",
        )}
      </p>
      <section className="panel">
        <h2>{t("Xem video demo", "Watch the demo video")}</h2>
        <p>
          {t(
            "2 phút 56 giây · giọng nam và phụ đề Việt. Người bán tạo link, người mua nạp 2 USDC Devnet rồi xác nhận; người bán nhận 1,96 USDC.",
            "2:56 · Vietnamese narration and subtitles. The seller creates a link, the buyer deposits 2 Devnet USDC and confirms; the seller receives 1.96 USDC.",
          )}
        </p>
        <a
          className="button primary"
          href="https://www.youtube.com/watch?v=mTY3e3qX_4k"
          target="_blank"
          rel="noreferrer"
        >
          {t("Xem trên YouTube ↗", "Watch on YouTube ↗")}
        </a>
        <p className="small">
          {t(
            "Mở đầu là tình huống minh họa. Clip chưa quay việc giao file, tranh chấp hoặc keeper; bản tiếng Anh chờ footage riêng.",
            "The opening is illustrative. File delivery, dispute and keeper are not shown; an English version awaits separate footage.",
          )}
        </p>
      </section>
      <section className="panel">
        <h2>{t("Chuẩn bị", "Prepare")}</h2>
        <ol>
          <li>
            {t(
              "Bật Devnet trong Phantom. Chuẩn bị SOL Devnet trong mỗi ví.",
              "Enable Devnet in Phantom. Fund each wallet with Devnet SOL.",
            )}
          </li>
          <li>
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noreferrer"
            >
              {t(
                "Lấy USDC Devnet từ Circle Faucet",
                "Get Devnet USDC from Circle Faucet",
              )}{" "}
              ↗
            </a>{" "}
            ·{" "}
            <a
              href="https://faucet.solana.com/"
              target="_blank"
              rel="noreferrer"
            >
              SOL Faucet ↗
            </a>
          </li>
          <li>
            {t(
              "Trọng tài được duyệt nạp cọc và bật nhận một lần. Người bán chọn tổ chức rồi tạo link; buyer nạp ngay nếu đủ điều kiện.",
              "An approved arbitrator deposits bond and enables standing consent once. The seller selects it and creates a link; the buyer funds eligible deals directly.",
            )}
          </li>
          <li>
            {t(
              "Buyer mở link, đọc điều kiện và nạp. Seller đánh dấu bàn giao; buyer xác nhận hoặc tranh chấp.",
              "The buyer opens the link, reads terms and funds. The seller marks delivery; the buyer confirms or disputes.",
            )}
          </li>
        </ol>
        <div className="actions">
          <Link className="button primary" href="/deals/new">
            {t("Tạo deal mới", "Create a new deal")}
          </Link>
          <Link className="button" href="/admin">
            {t("Quỹ trọng tài", "Arbitrator bond pool")}
          </Link>
        </div>
        <p className="small">
          {t(
            "Không có ví demo tự ký thay bạn trên website. Các tài khoản thử nghiệm dưới đây chỉ là bằng chứng công khai, không phải tài khoản người dùng.",
            "The website has no demo wallet that signs for you. The test accounts below are public evidence, not user accounts.",
          )}
        </p>
      </section>
      <section className="panel">
        <h2>{t("Các kịch bản đã chạy", "Executed scenarios")}</h2>
        {samples.deals.length === 0 ? (
          <Notice>
            {t(
              "Chưa công bố receipt Devnet. Không xem giao diện là bằng chứng đã chạy on-chain.",
              "No Devnet receipts published yet. UI alone is not proof of on-chain execution.",
            )}
          </Notice>
        ) : (
          samples.deals.map((d) => (
            <Link
              key={d.address}
              className="demo-link"
              href={`/deals/${d.address}`}
            >
              {t(d.vi, d.en)} →<Address value={d.address} />
            </Link>
          ))
        )}
      </section>
      <details>
        <summary>
          {t(
            "Cấu hình chương trình và token",
            "Program and token configuration",
          )}
        </summary>
        <dl>
          <div>
            <dt>Program</dt>
            <dd>
              <Address value={deployment.programId} />
            </dd>
          </div>
          <div>
            <dt>USDC Devnet mint</dt>
            <dd>
              <Address value={deployment.mint} />
            </dd>
          </div>
          <div>
            <dt>{t("Trọng tài mẫu", "Sample arbitrator")}</dt>
            <dd>
              <Address value={arbitratorConfig.wallet} />
            </dd>
          </div>
        </dl>
      </details>
    </>
  );
}
