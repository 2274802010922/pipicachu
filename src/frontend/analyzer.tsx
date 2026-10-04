"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { transactionInput, explorerUrl } from "@/core/input";
import { formatAmount } from "@/core/amount";
import type {
  Analysis,
  Comparison,
  Explanation,
  Network,
} from "@/shared/types";
import { useLanguage } from "./i18n/provider";
import {
  AddressDisplay,
  ComparisonResult,
  errorText,
  Notice,
  StatusBadge,
} from "./components/ui";
import { templateExplanation } from "@/core/narrative";
async function post<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const value = await res.json();
  if (!res.ok) throw new Error(value.error || "INTERNAL_ERROR");
  return value as T;
}
export function Analyzer({
  initial = "",
  initialNetwork = "mainnet",
}: {
  initial?: string;
  initialNetwork?: Network;
}) {
  const { locale, t } = useLanguage();
  const [input, setInput] = useState(initial),
    [network, setNetwork] = useState<Network>(initialNetwork),
    [focus, setFocus] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null),
    [explanation, setExplanation] = useState<Explanation | null>(null),
    [busy, setBusy] = useState(false),
    [aiBusy, setAiBusy] = useState(false),
    [error, setError] = useState("");
  const [recipient, setRecipient] = useState(""),
    [expectedNetwork, setExpectedNetwork] = useState<Network>(initialNetwork),
    [asset, setAsset] = useState<"SOL" | "USDC">("USDC"),
    [amount, setAmount] = useState("");
  const [comparison, setComparison] = useState<Comparison | null>(null),
    [compareBusy, setCompareBusy] = useState(false),
    [compareError, setCompareError] = useState(""),
    [copied, setCopied] = useState(false);
  const results = useRef<HTMLDivElement>(null),
    requestVersion = useRef(0);
  const initialLoaded = useRef(false);
  async function inspect(value = input, chosen = network) {
    const version = ++requestVersion.current;
    setBusy(true);
    setError("");
    setAnalysis(null);
    setComparison(null);
    setExplanation(null);
    try {
      const parsed = transactionInput(value, chosen);
      setNetwork(parsed.network);
      setExpectedNetwork(parsed.network);
      const a = await post<Analysis>("/api/analysis", {
        input: value,
        network: chosen,
        ...(focus ? { focus } : {}),
      });
      if (version !== requestVersion.current) return;
      setAnalysis(a);
      setExplanation(templateExplanation(a, locale));

      setTimeout(() => results.current?.focus(), 0);
    } catch (e) {
      if (version === requestVersion.current)
        setError(e instanceof Error ? e.message : "INTERNAL_ERROR");
    } finally {
      if (version === requestVersion.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (initial && !initialLoaded.current) {
      initialLoaded.current = true;
      void inspect(initial, initialNetwork);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!analysis) return;
    const controller = new AbortController();
    // Async completion only: facts remain available even if the provider fails.
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        setAiBusy(true);
        setExplanation(templateExplanation(analysis, locale));
      }
    });
    post<Explanation>(
      "/api/explain",
      { input: analysis.signature, network: analysis.network, locale },
      controller.signal,
    )
      .then(setExplanation)
      .catch(() => {
        if (!controller.signal.aborted)
          setExplanation(templateExplanation(analysis, locale));
      })
      .finally(() => {
        if (!controller.signal.aborted) setAiBusy(false);
      });
    return () => controller.abort();
  }, [analysis, locale]);
  async function compare() {
    if (!analysis) return;
    setCompareBusy(true);
    setCompareError("");
    setComparison(null);
    try {
      setComparison(
        await post<Comparison>("/api/compare", {
          input: analysis.signature,
          network: analysis.network,
          expected: { network: expectedNetwork, recipient, asset, amount },
        }),
      );
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : "INTERNAL_ERROR");
    } finally {
      setCompareBusy(false);
    }
  }
  const completed =
    analysis?.movements.filter((m) => m.kind === "transfer" && m.executed) ||
    [];
  const primary = completed
    .filter((m) => !focus || m.from === focus || m.to === focus)
    .slice(0, 3);
  return (
    <div className="analyzer">
      <form
        className="input-panel"
        onSubmit={(e) => {
          e.preventDefault();
          void inspect();
        }}
      >
        <label htmlFor="transaction">
          {t("Link hoặc mã giao dịch", "Transaction link or signature")}
        </label>
        <div className="lookup-row">
          <input
            id="transaction"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="https://explorer.solana.com/tx/…"
            aria-describedby="input-help"
          />
          <button className="button primary" disabled={busy}>
            {busy
              ? t("Đang kiểm tra…", "Checking…")
              : t("Kiểm tra giao dịch", "Check transaction")}
          </button>
        </div>
        <p id="input-help" className="muted small">
          {t(
            "Dán link giao dịch từ Solana Explorer hoặc Solscan. Không cần kết nối ví.",
            "Paste a Solana Explorer or Solscan transaction link. No wallet connection needed.",
          )}
        </p>
        <div className="optional-row">
          <label htmlFor="network">
            {t("Mạng cho mã giao dịch trần", "Network for a bare signature")}
            <select
              id="network"
              value={network}
              onChange={(e) => setNetwork(e.target.value as Network)}
            >
              <option value="mainnet">Solana Mainnet</option>
              <option value="devnet">Solana Devnet</option>
            </select>
          </label>
          <label htmlFor="focus">
            {t("Địa chỉ ví của tôi (tùy chọn)", "My wallet address (optional)")}
            <input
              id="focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={t(
                "Để đọc theo góc nhìn ví của bạn",
                "To read from your wallet's perspective",
              )}
            />
          </label>
        </div>
        {error && (
          <Notice kind="error">{errorText(error, locale === "vi")}</Notice>
        )}
      </form>
      {busy && (
        <div className="skeleton" role="status">
          {t(
            "Đang đọc dữ liệu và kiểm tra mạng…",
            "Reading data and verifying the network…",
          )}
        </div>
      )}
      {analysis && (
        <div className="results" ref={results} tabIndex={-1}>
          <div className="result-heading">
            <div>
              <p className="eyebrow">
                {analysis.network === "devnet"
                  ? "SOLANA DEVNET"
                  : "SOLANA MAINNET"}{" "}
                ·{" "}
                {analysis.source === "live"
                  ? t("Đọc từ mạng", "Network data")
                  : t("Bản lưu trước", "Archived snapshot")}
              </p>
              <h2>
                {t("Giao dịch này đã làm gì?", "What did this transaction do?")}
              </h2>
            </div>
            <StatusBadge analysis={analysis} />
          </div>
          {analysis.network === "devnet" && (
            <Notice>
              {t(
                "Đây là môi trường thử nghiệm. Token không có giá trị tiền thật.",
                "This is a test network. Tokens have no real monetary value.",
              )}
            </Notice>
          )}
          <section
            className="summary-panel"
            aria-label={t("Tóm tắt giao dịch", "Transaction summary")}
          >
            {analysis.state === "failed" ? (
              <h3>
                {t(
                  "Các thao tác chưa được thực hiện thành công.",
                  "The operations did not complete successfully.",
                )}
              </h3>
            ) : analysis.state === "unknown" ? (
              <h3>
                {t(
                  "Chưa tìm thấy đủ dữ liệu trên mạng đã chọn.",
                  "Not enough data was found on the selected network.",
                )}
              </h3>
            ) : analysis.category === "swap" ? (
              <h3>
                {t(
                  "Giao dịch tương tác với Jupiter.",
                  "This transaction interacts with Jupiter.",
                )}
              </h3>
            ) : primary.length ? (
              primary.map((m, i) => (
                <p className="fact-line" key={i}>
                  <strong>
                    {formatAmount(m.atomic, m.decimals, locale)}{" "}
                    {m.asset === "TOKEN" ? t("token", "tokens") : m.asset}
                  </strong>{" "}
                  ·{" "}
                  {focus && m.to === focus
                    ? t("Ví của bạn nhận", "Your wallet receives")
                    : focus && m.from === focus
                      ? t("Ví của bạn gửi", "Your wallet sends")
                      : t(
                          "Chuyển từ ví gửi tới ví nhận",
                          "Transferred from sender to recipient",
                        )}
                </p>
              ))
            ) : (
              <h3>
                {t(
                  "Xem các dữ kiện đã xác định được bên dưới.",
                  "See the evidenced facts below.",
                )}
              </h3>
            )}
            <p>
              {t("Phí mạng", "Network fee")}:{" "}
              <strong>{formatAmount(analysis.feeAtomic, 9, locale)} SOL</strong>
            </p>
            <p className="muted">
              {t("Thời gian giao dịch", "Transaction time")}:{" "}
              {analysis.blockTime === null
                ? "—"
                : new Date(analysis.blockTime * 1000).toLocaleString(
                    locale === "vi" ? "vi-VN" : "en-US",
                    { timeZone: "Asia/Ho_Chi_Minh" },
                  )}{" "}
              (UTC+7)
            </p>
          </section>
          <section className="explanation">
            <div className="section-label">
              <h3>{t("Giải thích dễ hiểu", "Plain-language explanation")}</h3>
              <span className="tag">
                {aiBusy
                  ? t("Đang thêm chú giải…", "Adding explanation…")
                  : explanation?.source === "ai"
                    ? "AI"
                    : t("Diễn giải từ dữ kiện", "Fact-based template")}
              </span>
            </div>
            {explanation?.lines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </section>
          {analysis.completeness === "partial" && (
            <Notice>
              {t(
                "Một phần thao tác chưa được giải mã đầy đủ. Không dùng bản tóm tắt để kết luận toàn bộ mục đích giao dịch.",
                "Some operations are partially decoded. The summary does not establish the full transaction intent.",
              )}
            </Notice>
          )}
          <details className="evidence" open={analysis.category === "swap"}>
            <summary>
              {t(
                "Thay đổi tài sản và ví liên quan",
                "Asset changes and involved wallets",
              )}
            </summary>
            <p className="muted small">
              {t(
                "Thay đổi số dư SOL có thể gồm cả phí mạng và tiền tạo/đóng tài khoản. Không tự coi tất cả là số tiền chuyển hoặc swap.",
                "SOL balance changes can include fees and account creation or closure; they are not automatically transfer or swap amounts.",
              )}
            </p>
            <div className="movements">
              {completed.map((m, i) => (
                <article className="movement" key={i}>
                  <strong>
                    {formatAmount(m.atomic, m.decimals, locale)} {m.asset}
                  </strong>
                  <span>
                    {t("Từ", "From")}: <AddressDisplay address={m.from} />
                  </span>
                  <span>
                    {t("Đến", "To")}: <AddressDisplay address={m.to} />
                  </span>
                  {m.mint && (
                    <span>
                      Mint: <AddressDisplay address={m.mint} />
                    </span>
                  )}
                  <code className="small">{m.evidence}</code>
                </article>
              ))}
            </div>
            <div className="balance-list">
              {analysis.balances.map((b, i) => (
                <div key={i}>
                  <strong>
                    {formatAmount(b.delta, b.decimals, locale)} {b.asset}
                  </strong>
                  <AddressDisplay address={b.owner || b.address} />
                  {b.mint && (
                    <code className="muted small">Mint: {b.mint}</code>
                  )}
                </div>
              ))}
            </div>
          </details>
          <details
            className="comparison"
            onToggle={(e) => {
              if (e.currentTarget.open && !recipient && focus)
                setRecipient(focus);
            }}
          >
            <summary>
              {t(
                "Đối chiếu khoản tiền tôi đang chờ nhận",
                "Compare a payment I expect to receive",
              )}
            </summary>
            <p className="muted">
              {t(
                "Nhập thông tin bạn mong đợi. Tool không tự biết thỏa thuận giữa hai người.",
                "Enter the details you expect. The tool does not know your agreement.",
              )}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void compare();
              }}
            >
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="expected-network">
                    {t("Mạng mong đợi", "Expected network")}
                  </label>
                  <select
                    id="expected-network"
                    value={expectedNetwork}
                    onChange={(e) => {
                      setExpectedNetwork(e.target.value as Network);
                      setComparison(null);
                    }}
                  >
                    <option value="mainnet">Solana Mainnet</option>
                    <option value="devnet">Solana Devnet</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="asset">Token</label>
                  <select
                    id="asset"
                    value={asset}
                    onChange={(e) => {
                      setAsset(e.target.value as "SOL" | "USDC");
                      setComparison(null);
                    }}
                  >
                    <option>SOL</option>
                    <option>USDC</option>
                  </select>
                </div>
                <div className="field full">
                  <label htmlFor="recipient">
                    {t("Địa chỉ ví nhận mong đợi", "Expected recipient wallet")}
                  </label>
                  <input
                    id="recipient"
                    value={recipient}
                    onChange={(e) => {
                      setRecipient(e.target.value);
                      setComparison(null);
                    }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="field full">
                  <label htmlFor="amount">
                    {t("Số tiền mong đợi", "Expected amount")}
                  </label>
                  <input
                    id="amount"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setComparison(null);
                    }}
                    inputMode="decimal"
                    autoComplete="off"
                    aria-describedby="amount-help"
                  />
                  <span id="amount-help" className="muted small">
                    {t(
                      "Ví dụ 50 hoặc 50,5. Không nhập dấu phân cách hàng nghìn.",
                      "For example 50 or 50.5. Do not enter thousands separators.",
                    )}
                  </span>
                </div>
              </div>
              <button className="button primary" disabled={compareBusy}>
                {compareBusy
                  ? t("Đang đối chiếu…", "Comparing…")
                  : t("Đối chiếu", "Compare")}
              </button>
              {compareError && (
                <Notice kind="error">
                  {errorText(compareError, locale === "vi")}
                </Notice>
              )}
            </form>
            {comparison && (
              <ComparisonResult
                result={comparison}
                decimals={asset === "SOL" ? 9 : 6}
              />
            )}
          </details>
          <details className="evidence">
            <summary>
              {t("Xem bằng chứng kỹ thuật", "View technical evidence")}
            </summary>
            <dl className="evidence-list">
              <dt>{t("Mã giao dịch", "Signature")}</dt>
              <dd>
                <AddressDisplay address={analysis.signature} />
              </dd>
              <dt>{t("Ví trả phí", "Fee payer")}</dt>
              <dd>
                <AddressDisplay address={analysis.feePayer} />
              </dd>
              <dt>Slot / finality</dt>
              <dd>
                {analysis.slot || "—"} / {analysis.finality}
              </dd>
              <dt>{t("Phiên bản bộ giải mã", "Decoder version")}</dt>
              <dd>{analysis.decoderVersion}</dd>
              <dt>{t("Đọc lúc", "Read at")}</dt>
              <dd>{analysis.observedAt}</dd>
              {analysis.error && (
                <>
                  <dt>{t("Lỗi", "Error")}</dt>
                  <dd>
                    <code>{analysis.error}</code>
                  </dd>
                </>
              )}
            </dl>
            <p>{t("Chương trình tương tác", "Programs involved")}</p>
            {analysis.programs.map((p) => (
              <p key={p}>
                <AddressDisplay address={p} />
              </p>
            ))}
            {analysis.warnings.length > 0 && (
              <p className="muted small">{analysis.warnings.join(" · ")}</p>
            )}
            <a
              className="text-link"
              href={explorerUrl(analysis.signature, analysis.network)}
              target="_blank"
              rel="noreferrer"
            >
              Solana Explorer ↗
            </a>
          </details>
          <div className="result-actions">
            <button
              className="button secondary"
              onClick={() => {
                void navigator.clipboard
                  .writeText(
                    `${window.location.origin}/tx/${analysis.signature}?cluster=${analysis.network}`,
                  )
                  .then(() => setCopied(true));
              }}
            >
              {copied
                ? t("Đã sao chép link", "Link copied")
                : t("Chia sẻ giao dịch", "Share transaction")}
            </button>
            <Link href="/demo">
              {t("Xem giao dịch mẫu", "View examples")} →
            </Link>
          </div>
          <p className="muted small">
            {t(
              "Không lưu lịch sử. Link chia sẻ chỉ chứa giao dịch công khai và mạng.",
              "No history is stored. Shared links contain only the public transaction and network.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
