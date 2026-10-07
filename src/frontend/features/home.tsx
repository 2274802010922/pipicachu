"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useLanguage } from "../i18n/provider";
import { Notice } from "../components/feedback";
export function Home() {
  const router = useRouter();
  const { t } = useLanguage();
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <section className="hero">
        <span className="eyebrow">ESCROW · SOLANA DEVNET</span>
        <h1>
          {t(
            "Giao dịch có trung gian. Tiền giữ trong ký quỹ.",
            "An intermediary for your deal. Funds held in escrow.",
          )}
        </h1>
        <p className="lead">
          {t(
            "Tạo link, nạp USDC thử nghiệm, bàn giao và xác nhận. Khi có tranh chấp, trọng tài xử lý theo điều kiện hai bên đã đồng ý.",
            "Create a link, deposit test USDC, deliver and confirm. An arbitrator handles disputes under the terms both parties accepted.",
          )}
        </p>
        <div className="actions">
          <Link className="button primary" href="/deals/new">
            {t("Tạo giao dịch", "Create a deal")}
          </Link>
          <Link className="button" href="/demo">
            {t("Xem demo Devnet", "Explore Devnet demo")}
          </Link>
        </div>
      </section>
      <section className="panel">
        <h2>{t("Mở giao dịch của bạn", "Open your deal")}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            try {
              const value = link.trim();
              const id =
                value.startsWith("https://") || value.startsWith("http://")
                  ? new URL(value).pathname.split("/").filter(Boolean).at(-1)!
                  : value;
              const key = new PublicKey(id);
              router.push(`/deals/${key.toBase58()}`);
            } catch {
              setError(
                t(
                  "Nhập link deal hoặc địa chỉ deal hợp lệ.",
                  "Enter a valid deal link or deal address.",
                ),
              );
            }
          }}
        >
          <label>
            {t("Link hoặc địa chỉ deal", "Deal link or address")}
            <input
              required
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://pipicachu.vercel.app/deals/…"
            />
          </label>
          <div className="actions">
            <button type="submit">{t("Mở giao dịch", "Open deal")}</button>
          </div>
          {error && <Notice error>{error}</Notice>}
        </form>
      </section>
      <section className="grid three">
        {[
          [
            "01",
            t("Thống nhất điều kiện", "Agree on terms"),
            t(
              "Ví, số tiền, phí, trọng tài và thời hạn được cố định trước khi nạp.",
              "Wallets, amount, fee, arbitrators and deadlines are fixed before funding.",
            ),
          ],
          [
            "02",
            t("Ký quỹ và bàn giao", "Fund and deliver"),
            t(
              "Tiền nằm trong vault của chương trình. Seller bàn giao qua kênh đã thống nhất.",
              "Funds stay in the program vault. The seller delivers through the agreed channel.",
            ),
          ],
          [
            "03",
            t("Xác nhận hoặc tranh chấp", "Confirm or dispute"),
            t(
              "Buyer xác nhận nhận hàng hoặc mở tranh chấp trong thời hạn kiểm tra.",
              "The buyer confirms receipt or disputes within the review window.",
            ),
          ],
        ].map(([n, title, body]) => (
          <article key={n} className="panel">
            <span className="eyebrow">{n}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>
      <Notice>
        {t(
          "Bản thử nghiệm Devnet. Trọng tài không giữ tiền trong ví riêng nhưng vẫn có thể phán quyết sai. Cọc đang khóa không phải bảo hiểm.",
          "Devnet prototype. Arbitrators do not hold deal funds in personal wallets, but may still rule incorrectly. Locked bond is not insurance.",
        )}
      </Notice>
    </>
  );
}
