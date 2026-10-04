"use client";
import { useState } from "react";
import Link from "next/link";
import { Transaction } from "@solana/web3.js";
import { examples } from "@/shared/examples";
import { useLanguage } from "./i18n/provider";
import { AddressDisplay, errorText, Notice } from "./components/ui";
type Phantom = {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  signTransaction(tx: Transaction): Promise<Transaction>;
};
function walletProvider(): Phantom | undefined {
  const w = window as unknown as {
    phantom?: { solana?: Phantom };
    solana?: Phantom;
  };
  return w.phantom?.solana || (w.solana?.isPhantom ? w.solana : undefined);
}
async function api<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "INTERNAL_ERROR");
  return data;
}
export function Demo() {
  const { locale, t } = useLanguage();
  const [wallet, setWallet] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<{
    requestId: string;
    transaction: string;
    receiver: string;
    expiresAt: number;
  } | null>(null);
  const [receipt, setReceipt] = useState<{
    signature: string;
    state: string;
    finality: string;
  } | null>(null);
  const [requestId, setRequestId] = useState("");
  async function connect() {
    setError("");
    try {
      const p = walletProvider();
      if (!p) throw new Error("WALLET_MISSING");
      const result = await p.connect();
      setWallet(result.publicKey.toBase58());
      setPrepared(null);
    } catch (e) {
      setError(
        e instanceof Error && e.message === "WALLET_MISSING"
          ? "WALLET_MISSING"
          : "WALLET_REJECTED",
      );
    }
  }
  async function prepare() {
    setError("");
    setBusy(true);
    setReceipt(null);
    try {
      const p = walletProvider();
      if (!p?.publicKey || p.publicKey.toBase58() !== wallet)
        throw new Error("WALLET_CHANGED");
      setPrepared(await api("/api/demo/prepare", { wallet }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }
  async function sign() {
    if (!prepared) return;
    setBusy(true);
    setError("");
    try {
      if (Date.now() >= prepared.expiresAt) throw new Error("DEMO_EXPIRED");
      const p = walletProvider();
      if (!p?.publicKey || p.publicKey.toBase58() !== wallet)
        throw new Error("WALLET_CHANGED");
      const tx = Transaction.from(
        Uint8Array.from(atob(prepared.transaction), (c) => c.charCodeAt(0)),
      );
      let signed: Transaction;
      try {
        signed = await p.signTransaction(tx);
      } catch {
        throw new Error("WALLET_REJECTED");
      }
      if (p.publicKey?.toBase58() !== wallet) throw new Error("WALLET_CHANGED");
      const transaction = btoa(String.fromCharCode(...signed.serialize()));
      setRequestId(prepared.requestId);
      setReceipt(
        await api("/api/demo/submit", {
          requestId: prepared.requestId,
          transaction,
        }),
      );
      setPrepared(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/demo/status?requestId=${requestId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReceipt(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page demo-page">
      <p className="eyebrow">
        DEMO · {t("CÓ NGUỒN VÀ BẰNG CHỨNG", "SOURCED EXAMPLES")}
      </p>
      <h1>{t("Thử một giao dịch cụ thể.", "Try a specific transaction.")}</h1>
      <p className="lead">
        {t(
          "Mẫu có nguồn rõ ràng. Phòng ký thử chỉ dùng Devnet, không gửi tiền Mainnet.",
          "Examples are clearly sourced. The signing lab uses Devnet only and never broadcasts Mainnet payments.",
        )}
      </p>
      <div className="example-grid">
        {examples.map((e) => (
          <article className="example" key={e.id}>
            <span className="tag">
              Solana {e.network === "mainnet" ? "Mainnet" : "Devnet"}
            </span>
            <h2>{e.title[locale]}</h2>
            <p>{e.note[locale]}</p>
            {e.signature ? (
              <Link
                className="button secondary"
                href={`/tx/${e.signature}?cluster=${e.network}`}
              >
                {t("Đọc giao dịch", "Read transaction")} →
              </Link>
            ) : (
              <span className="muted small">
                {t("Chưa có mẫu được nghiệm thu", "No accepted example yet")}
              </span>
            )}
          </article>
        ))}
      </div>
      <section className="lab">
        <p className="eyebrow">DEVNET LAB</p>
        <h2>
          {t("Tạo link thật để kiểm tra.", "Create a real link to inspect.")}
        </h2>
        <Notice>
          {t(
            "Token thử nghiệm không có giá trị tiền thật. Mỗi lần ký chuyển 0,001 SOL Devnet, cộng phí mạng.",
            "Test tokens have no monetary value. Each signing transfers 0.001 SOL Devnet plus network fees.",
          )}
        </Notice>
        <ol className="lab-steps">
          <li>{t("Kết nối ví thử nghiệm", "Connect a test wallet")}</li>
          <li>
            {t(
              "Xem trước người nhận và số tiền",
              "Review recipient and amount",
            )}
          </li>
          <li>
            {t(
              "Ký, kiểm tra trạng thái và đọc kết quả",
              "Sign, check status and read the result",
            )}
          </li>
        </ol>
        {!wallet ? (
          <button className="button secondary" onClick={() => void connect()}>
            {t("Kết nối ví", "Connect wallet")}
          </button>
        ) : (
          <>
            <p>
              {t("Ví gửi", "Sender")}: <AddressDisplay address={wallet} />
            </p>
            <button className="button secondary" onClick={() => void connect()}>
              {t("Chọn lại ví", "Reconnect wallet")}
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void prepare()}
            >
              {busy
                ? t("Đang xử lý…", "Working…")
                : t("Chuẩn bị giao dịch thử", "Prepare demo transfer")}
            </button>
          </>
        )}
        {prepared && (
          <div className="preview">
            <h3>{t("Xem trước trước khi ký", "Review before signing")}</h3>
            <p>
              <strong>0,001 SOL Devnet</strong>
            </p>
            <p>
              {t("Ví nhận demo", "Demo recipient")}:{" "}
              <AddressDisplay address={prepared.receiver} />
            </p>
            <p>
              {t(
                "Bạn trả phí mạng. Bản chuẩn bị hết hạn sau hai phút.",
                "You pay the network fee. This preparation expires in two minutes.",
              )}
            </p>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void sign()}
            >
              {t("Ký giao dịch Devnet", "Sign Devnet transaction")}
            </button>
          </div>
        )}
        {receipt && (
          <div className="receipt">
            <Notice
              kind={
                receipt.state === "success"
                  ? "success"
                  : receipt.state === "failed"
                    ? "error"
                    : "info"
              }
            >
              {receipt.state === "success"
                ? t(
                    "Giao dịch Devnet đã hoàn tất",
                    "Devnet transaction finalized",
                  )
                : receipt.state === "failed"
                  ? t("Giao dịch thất bại", "Transaction failed")
                  : t(
                      "Đã gửi yêu cầu; đang kiểm tra xác nhận",
                      "Submission recorded; checking confirmation",
                    )}
            </Notice>
            <AddressDisplay address={receipt.signature} />
            {receipt.state === "pending" && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void refresh()}
              >
                {t("Kiểm tra lại trạng thái", "Refresh status")}
              </button>
            )}
            <Link
              className="button primary"
              href={`/tx/${receipt.signature}?cluster=devnet`}
            >
              {t("Đọc giao dịch vừa tạo", "Read this transaction")} →
            </Link>
          </div>
        )}
        {error && (
          <Notice kind="error">{errorText(error, locale === "vi")}</Notice>
        )}
        <p className="muted small">
          {t(
            "Thiếu SOL Devnet? Dùng faucet Solana cho ví thử nghiệm.",
            "Need Devnet SOL? Use the Solana faucet for your test wallet.",
          )}{" "}
          <a href="https://faucet.solana.com/" target="_blank" rel="noreferrer">
            Faucet ↗
          </a>
        </p>
      </section>
    </section>
  );
}
