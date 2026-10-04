"use client";
import { Buffer } from "buffer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useLanguage } from "./i18n/provider";
import { useWallet } from "./wallet";
import {
  act,
  amount,
  bondIx,
  createDealIx,
  dealAddress,
  digest,
  fundIx,
  MINT,
  parseAmount,
  PROGRAM_ID,
  readArbitrator,
  readDeal,
  decodeDeal,
  registerIx,
  settleIxs,
  type Arbitrator,
  type Deal,
} from "@/escrow/client";
import { actions } from "@/escrow/policy";
import deployment from "@/escrow/deployment.json";
import rawSamples from "@/escrow/samples.json";
const samples = rawSamples as {
  arbitrator: string;
  deals: { address: string; vi: string; en: string }[];
};

function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
function Address({ value }: { value: string }) {
  return <code className="address">{value}</code>;
}
function Receipt({ signature }: { signature: string }) {
  const { t } = useLanguage();
  return (
    <a
      href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
      target="_blank"
      rel="noreferrer"
    >
      {t("Xem giao dịch trên Explorer", "View transaction on Explorer")} ↗
    </a>
  );
}
function errorMessage(error: unknown, vi: boolean) {
  const text = error instanceof Error ? error.message : String(error);
  const labels: Record<string, [string, string]> = {
    WALLET_MISSING: [
      "Kết nối ví Phantom trước khi thực hiện.",
      "Connect Phantom before continuing.",
    ],
    WALLET_REJECTED: [
      "Bạn đã hủy ký. Chưa gửi giao dịch.",
      "Signing cancelled. No transaction was sent.",
    ],
    WALLET_CHANGED: [
      "Ví hoặc nội dung giao dịch đã thay đổi. Thử lại.",
      "The wallet or transaction changed. Retry.",
    ],
    INVALID_AMOUNT: [
      "Nhập số tiền dương, tối đa 6 chữ số thập phân.",
      "Enter a positive amount with up to 6 decimal places.",
    ],
    DEAL_NOT_FOUND: [
      "Chưa tìm thấy deal trên Devnet. Kiểm tra link hoặc thử tải lại.",
      "Deal not found on Devnet. Check the link or reload.",
    ],
    INVALID_ACCOUNT: [
      "Tài khoản này không phải deal pipicachu hợp lệ.",
      "This is not a valid pipicachu deal.",
    ],
    SIMULATION_FAILED: [
      "Chưa thể thực hiện. Kiểm tra số dư SOL/USDC, quyền thao tác, cọc khả dụng và thời hạn; tải lại trạng thái trước khi thử lại.",
      "Cannot execute. Check SOL/USDC balances, permissions, available bond and deadlines; refresh before retrying.",
    ],
    RPC_NETWORK_MISMATCH: [
      "RPC không phải Devnet. Đã chặn thao tác.",
      "RPC is not Devnet. Action blocked.",
    ],
    TRANSACTION_FAILED: [
      "Giao dịch thất bại trên mạng. Tải lại trạng thái.",
      "Transaction failed on-chain. Refresh state.",
    ],
    INVALID_TERMS: [
      "Kiểm tra địa chỉ, người tham gia khác nhau và điều khoản tối đa 512 byte.",
      "Check addresses, distinct participants and terms up to 512 bytes.",
    ],
  };
  return (
    labels[text]?.[vi ? 0 : 1] ||
    (vi
      ? "Chưa đọc hoặc gửi được giao dịch. Kiểm tra mạng, cấu hình Devnet và thử lại."
      : "Unable to read or submit. Check the network and Devnet configuration, then retry.")
  );
}
function useOperation() {
  const { locale, t } = useLanguage();
  const { send } = useWallet();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [signature, setSignature] = useState("");
  async function run(
    build: () => Promise<TransactionInstruction[]>,
    after?: () => Promise<void>,
  ) {
    setBusy(true);
    setError("");
    setSignature("");
    setMessage(
      t(
        "Đang kiểm tra và chờ bạn ký trong ví…",
        "Checking and waiting for your wallet signature…",
      ),
    );
    try {
      const result = await send(new Transaction().add(...(await build())));
      setSignature(result);
      setMessage(
        t(
          "Giao dịch đã hoàn tất trên Devnet.",
          "Transaction finalized on Devnet.",
        ),
      );
      await after?.();
    } catch (e) {
      const value = e instanceof Error ? e.message : "";
      if (value.startsWith("PENDING:")) {
        setSignature(value.slice(8));
        setMessage(
          t(
            "Đã gửi, chưa xác nhận hoàn tất. Tải lại trạng thái; không ký lại ngay.",
            "Submitted, not finalized yet. Refresh state; do not sign again immediately.",
          ),
        );
      } else {
        setError(errorMessage(e, locale === "vi"));
        setMessage("");
      }
    } finally {
      setBusy(false);
    }
  }
  const feedback = (
    <>
      {message && (
        <Notice>
          {message} {signature && <Receipt signature={signature} />}
        </Notice>
      )}
      {error && <Notice error>{error}</Notice>}
    </>
  );
  return { busy, run, feedback };
}
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
          <Link className="button arbitrator" href="/deals/new">
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
export function CreateDeal() {
  const { t, locale } = useLanguage();
  const { who } = useWallet();
  const op = useOperation();
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  const [form, setForm] = useState({
    buyer: "",
    arbitrator: "",
    amount: "10",
    terms: "",
    funding: "600",
    delivery: "300",
    review: "120",
    arbitration: "120",
  });
  const [ack, setAck] = useState(false);
  const field = (name: keyof typeof form, value: string) =>
    setForm({ ...form, [name]: value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!who) return;
    try {
      const buyer = new PublicKey(form.buyer),
        arbitrator = new PublicKey(form.arbitrator);
      if (
        new Set([who, buyer, arbitrator].map((p) => p.toBase58())).size !== 3 ||
        Buffer.byteLength(form.terms) > 512
      )
        throw new Error("INVALID_TERMS");
      const value = parseAmount(form.amount);
      const times = [
        form.funding,
        form.delivery,
        form.review,
        form.arbitration,
      ].map(Number);
      if (times.some((n) => !Number.isInteger(n) || n < 10 || n > 2592000))
        throw new Error("INVALID_TERMS");
      const random = crypto.getRandomValues(new Uint8Array(8));
      const nonce = Buffer.from(random).readBigUInt64LE();
      const address = dealAddress(who, nonce).toBase58();
      await op.run(
        async () => [
          await createDealIx(
            who,
            buyer,
            arbitrator,
            nonce,
            value,
            times,
            form.terms,
          ),
        ],
        async () => {
          setCreated(address);
        },
      );
    } catch (e) {
      setError(errorMessage(e, locale === "vi"));
    }
  }
  return (
    <>
      <span className="eyebrow">01 / DEAL</span>
      <h1>{t("Tạo giao dịch", "Create a deal")}</h1>
      <p className="lead">
        {t(
          "Ví đang kết nối là người bán. Trọng tài cần chấp thuận trước khi người mua nạp tiền.",
          "The connected wallet is the seller. The arbitrator must accept before the buyer can fund.",
        )}
      </p>
      {!who && (
        <Notice>
          {t(
            "Kết nối ví người bán để tạo giao dịch.",
            "Connect the seller wallet to create a deal.",
          )}
        </Notice>
      )}
      <form onSubmit={submit} className="panel stack">
        <div className="grid">
          <label>
            {t("Ví người mua", "Buyer wallet")}
            <input
              required
              value={form.buyer}
              onChange={(e) => field("buyer", e.target.value)}
            />
          </label>
          <label>
            {t("Số tiền USDC Devnet", "Devnet USDC amount")}
            <input
              required
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => field("amount", e.target.value)}
            />
          </label>
        </div>
        <div className="grid">
          <label>
            {t("Ví trọng tài", "Arbitrator wallet")}
            <input
              required
              value={form.arbitrator}
              onChange={(e) => field("arbitrator", e.target.value)}
            />
          </label>
        </div>
        <label>
          {t("Điều khoản công khai", "Public terms")}
          <textarea
            required
            rows={4}
            value={form.terms}
            onChange={(e) => field("terms", e.target.value)}
          />
          <small>
            {t(
              "Tối đa 512 byte. Mô tả hàng, tiêu chí bàn giao và kênh trao đổi. Không ghi mật khẩu hoặc dữ liệu riêng tư.",
              "Up to 512 bytes. Describe goods, delivery criteria and communication channel. Do not include passwords or private data.",
            )}
          </small>
        </label>
        <details>
          <summary>
            {t("Thời hạn demo (giây)", "Demo time windows (seconds)")}
          </summary>
          <div className="grid stack">
            {(
              [
                ["funding", t("Hạn nạp sau khi tạo", "Funding after creation")],
                [
                  "delivery",
                  t("Bàn giao sau khi nạp", "Delivery after funding"),
                ],
                [
                  "review",
                  t("Kiểm tra sau khi bàn giao", "Review after delivery"),
                ],
                [
                  "arbitration",
                  t("Mỗi vòng trọng tài", "Each arbitration window"),
                ],
              ] as [keyof typeof form, string][]
            ).map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  type="number"
                  required
                  min={10}
                  max={2592000}
                  value={form[name]}
                  onChange={(e) => field(name, e.target.value)}
                />
              </label>
            ))}
          </div>
        </details>
        <Notice>
          {t(
            "Phí trung gian 1% trừ từ khoản seller nhận nếu trả seller; hoàn buyer không thu phí. Trọng tài khóa cọc bằng 10% giá trị deal khi buyer nạp.",
            "A 1% intermediary fee is deducted from seller payouts; refunds have no fee. The arbitrator reserves 10% of the deal value when the buyer funds.",
          )}
        </Notice>
        <label className="check">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          <span>
            {t(
              "Tôi hiểu điều kiện không thể đơn phương sửa sau khi tạo. Nếu trọng tài không xử lý và hai bên không đồng ý, tiền có thể bị khóa.",
              "I understand these terms cannot be changed unilaterally. If the arbitrator does not rule and the parties disagree, funds may remain locked.",
            )}
          </span>
        </label>
        <div>
          <button className="arbitrator" disabled={!who || !ack || op.busy}>
            {t("Tạo và ký bằng ví", "Create and sign")}
          </button>
        </div>
        {error && <Notice error>{error}</Notice>}
        {op.feedback}
        {created && (
          <Notice>
            <Link href={`/deals/${created}`}>
              {t(
                "Mở deal vừa tạo để sao chép link",
                "Open the new deal to copy its link",
              )}{" "}
              →
            </Link>
          </Notice>
        )}
      </form>
    </>
  );
}
const STATE_LABELS: Record<Deal["state"], [string, string]> = {
  created: ["Chờ chấp thuận / nạp tiền", "Awaiting acceptance / funding"],
  funded: ["Đã ký quỹ · chờ bàn giao", "Funded · awaiting delivery"],
  delivered: ["Đã báo bàn giao · chờ kiểm tra", "Delivered · awaiting review"],
  disputed: ["Đang tranh chấp", "Disputed"],
  completed: ["Đã trả người bán", "Paid to seller"],
  refunded: ["Đã hoàn người mua", "Refunded to buyer"],
  cancelled: ["Đã hủy trước khi nạp", "Cancelled before funding"],
};
const ACTION_LABELS: Record<string, [string, string]> = {
  accept_deal: ["Chấp thuận làm trọng tài", "Accept arbitration role"],
  fund: ["Nạp tiền vào ký quỹ", "Fund escrow"],
  cancel_deal: ["Hủy deal chưa nạp", "Cancel unfunded deal"],
  deliver: ["Đánh dấu đã bàn giao", "Mark delivered"],
  confirm: [
    "Xác nhận nhận hàng và trả seller",
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
export function DealView({ id }: { id: string }) {
  const { t, locale } = useLanguage();
  const { who, connection } = useWallet();
  const op = useOperation();
  const [deal, setDeal] = useState<Deal | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [now, setNow] = useState(0),
    [readAt, setReadAt] = useState(0),
    [evidence, setEvidence] = useState(""),
    [ack, setAck] = useState(false),
    [copy, setCopy] = useState(""),
    [receipts, setReceipts] = useState<{ signature: string; err: unknown }[]>(
      [],
    );
  const refresh = useCallback(async () => {
    try {
      const c = connection();
      const d = await readDeal(c, id);
      const slot = await c.getSlot();
      const time = await c.getBlockTime(slot);
      if (time === null) throw new Error("RPC_UNAVAILABLE");
      setDeal(d);
      setNow(time);
      setReadAt(Date.now());
      setError("");
      const history = await c.getSignaturesForAddress(new PublicKey(id), {
        limit: 10,
      });
      setReceipts(history);
    } catch (e) {
      setError(errorMessage(e, locale === "vi"));
      setReadAt(0);
      setDeal((current) => (current?.address === id ? current : null));
    } finally {
      setLoading(false);
    }
  }, [connection, id, locale]);
  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 15000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);
  const available =
    deal && readAt ? actions(deal, who?.toBase58() || null, now) : [];
  async function execute(name: string) {
    if (!deal || !who) return;
    await op.run(async () => {
      const actor = who,
        d = new PublicKey(id);
      if (name === "fund") return [await fundIx(actor, deal)];
      if (name === "deliver" || name === "dispute") {
        if (!evidence.trim()) throw new Error("INVALID_TERMS");
        return [await act(name, actor, d, await digest(evidence))];
      }
      if (name === "resolve_seller" || name === "resolve_buyer") {
        if (!evidence.trim()) throw new Error("INVALID_TERMS");
        return settleIxs(
          "resolve",
          actor,
          deal,
          Buffer.concat([
            Buffer.from([name === "resolve_seller" ? 1 : 0]),
            await digest(evidence),
          ]),
        );
      }
      if (name.startsWith("propose_"))
        return [
          await act(
            "propose_settlement",
            actor,
            d,
            Buffer.from([name === "propose_seller" ? 1 : 0]),
          ),
        ];
      if (
        ["confirm", "finalize", "refund_expired", "accept_settlement"].includes(
          name,
        )
      )
        return settleIxs(name, actor, deal);
      return [await act(name, actor, d)];
    }, refresh);
    setAck(false);
  }
  if (loading || (deal && deal.address !== id))
    return (
      <>
        <h1>{t("Đang đọc giao dịch…", "Reading deal…")}</h1>
        <Notice>
          {t(
            "Đọc trạng thái trực tiếp từ Devnet.",
            "Reading state directly from Devnet.",
          )}
        </Notice>
      </>
    );
  if (!deal)
    return (
      <>
        <h1>{t("Chưa mở được deal", "Unable to open deal")}</h1>
        <Notice error>{error}</Notice>
        <button onClick={() => void refresh()}>{t("Thử lại", "Retry")}</button>
      </>
    );
  const deadline =
    deal.state === "created"
      ? deal.fundBy
      : deal.state === "funded"
        ? deal.deliverBy
        : deal.state === "delivered"
          ? deal.reviewBy
          : deal.state === "disputed"
            ? deal.arbitrateBy
            : 0;
  return (
    <>
      <span className="eyebrow">DEAL / DEVNET</span>
      <h1>{t(...STATE_LABELS[deal.state])}</h1>
      <div className="actions">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                `${location.origin}/deals/${id}`,
              );
              setCopy(t("Đã sao chép link.", "Link copied."));
            } catch {
              setCopy(
                t(
                  "Sao chép link trên thanh địa chỉ.",
                  "Copy the link from the address bar.",
                ),
              );
            }
          }}
        >
          {t("Sao chép link deal", "Copy deal link")}
        </button>
        <button disabled={op.busy} onClick={() => void refresh()}>
          {t("Tải lại trạng thái", "Refresh state")}
        </button>
      </div>
      {copy && <Notice>{copy}</Notice>}
      {error && <Notice error>{error}</Notice>}
      {!readAt && (
        <Notice>
          {t(
            "Dữ liệu bên dưới là lần đọc trước. Chưa xác nhận được trạng thái hiện tại; các thao tác đang bị khóa.",
            "The data below is from the previous read. Current state is unverified; actions are disabled.",
          )}
        </Notice>
      )}
      <div className="grid">
        <section className="panel">
          <span className="badge">USDC · Devnet</span>
          <p className="amount">{amount(deal.amount)} USDC</p>
          <dl>
            <div>
              <dt>
                {deal.state === "refunded"
                  ? t("Đã hoàn người mua", "Refunded to buyer")
                  : deal.state === "completed"
                    ? t("Đã trả người bán", "Paid to seller")
                    : deal.state === "cancelled"
                      ? t("Chưa nạp tiền", "No funds deposited")
                      : t(
                          "Người bán sẽ nhận khi giải ngân",
                          "Seller receives on payout",
                        )}
              </dt>
              <dd>
                {amount(
                  deal.state === "refunded"
                    ? deal.amount
                    : deal.state === "cancelled"
                      ? 0n
                      : deal.amount - deal.fee,
                )}{" "}
                USDC
              </dd>
            </div>
            <div>
              <dt>
                {t(
                  "Phí trung gian khi trả seller",
                  "Intermediary fee on seller payout",
                )}
              </dt>
              <dd>
                {amount(
                  deal.state === "refunded" || deal.state === "cancelled"
                    ? 0n
                    : deal.fee,
                )}{" "}
                USDC
                {deal.state !== "refunded" && deal.state !== "cancelled"
                  ? " (1%)"
                  : ""}
              </dd>
            </div>
            <div>
              <dt>
                {["completed", "refunded"].includes(deal.state)
                  ? t(
                      "Cọc deal này đã mở khóa cho mỗi trọng tài",
                      "This deal’s bond released per arbitrator",
                    )
                  : deal.state === "created" || deal.state === "cancelled"
                    ? t(
                        "Cọc yêu cầu khi nạp (chưa khóa)",
                        "Required bond on funding (not reserved)",
                      )
                    : t(
                        "Cọc đang khóa của mỗi trọng tài",
                        "Reserved bond per arbitrator",
                      )}
              </dt>
              <dd>{amount(deal.bond)} USDC</dd>
            </div>
            {deadline > 0 && (
              <div>
                <dt>{t("Thời hạn hiện tại", "Current deadline")}</dt>
                <dd>
                  {new Date(deadline * 1000).toLocaleString(
                    locale === "vi" ? "vi-VN" : "en-US",
                  )}
                </dd>
              </div>
            )}
          </dl>
          <p className="small">
            {t(
              "Trạng thái thời hạn dùng thời gian mạng ở lần đọc gần nhất. Tải lại để kiểm tra; chương trình kiểm lại khi thực thi.",
              "Deadlines use network time at the last read. Refresh to check; the program validates again at execution.",
            )}
          </p>
        </section>
        <section className="panel">
          <h2>{t("Bước tiếp theo", "Next step")}</h2>
          {deal.state === "created" && (
            <p>
              {t(
                "Trọng tài chấp thuận trước khi người mua nạp.",
                "The arbitrator accepts before the buyer funds.",
              )}{" "}
              {deal.approvals === 1 ? "✓" : "—"} {t("Trọng tài", "Arbitrator")}
            </p>
          )}
          {deal.state === "funded" && (
            <p>
              {t(
                "Seller bàn giao qua kênh đã thỏa thuận rồi đánh dấu tại đây. Quá hạn có thể hoàn buyer.",
                "The seller delivers through the agreed channel and marks it here. Missed deadlines allow a buyer refund.",
              )}
            </p>
          )}
          {deal.state === "delivered" && (
            <p>
              {t(
                "Buyer kiểm tra hàng, xác nhận hoặc mở tranh chấp trước hạn. Sau hạn, cần gửi giao dịch giải ngân; không có keeper tự chạy.",
                "The buyer checks delivery, confirms or disputes before the deadline. Afterward, someone must submit a release transaction; there is no automatic keeper.",
              )}
            </p>
          )}
          {deal.state === "disputed" && (
            <Notice>
              {t(
                "Tiền đang khóa. Trọng tài xử trước hạn; sau hạn, người mua đề nghị trả người bán hoặc hoàn tiền và người bán phải đồng ý.",
                "Funds are locked. The arbitrator rules before the deadline; afterward, the buyer proposes payout/refund and the seller must accept.",
              )}
            </Notice>
          )}
          {deal.proposal > 0 && deal.state === "disputed" && (
            <p>
              <strong>
                {t("Đề nghị hiện tại:", "Current proposal:")}{" "}
                {deal.proposal === 1
                  ? t("Trả seller", "Pay seller")
                  : t("Hoàn buyer", "Refund buyer")}
              </strong>
            </p>
          )}
          {["completed", "refunded", "cancelled"].includes(deal.state) && (
            <Notice>
              {t(
                "Deal đã kết thúc. Không thể chi khoản tiền này lần nữa.",
                "Deal is terminal. Its principal cannot be paid a second time.",
              )}
            </Notice>
          )}
          {!who && (
            <p>
              {t(
                "Kết nối đúng ví để xem hành động của bạn.",
                "Connect the appropriate wallet to see your actions.",
              )}
            </p>
          )}
          {who &&
            available.length === 0 &&
            !["completed", "refunded", "cancelled"].includes(deal.state) && (
              <p>
                {t(
                  "Ví này chưa có thao tác ở trạng thái/thời hạn hiện tại. Xem vai trò và tải lại trạng thái.",
                  "This wallet has no action in the current state/time window. Check your role and refresh.",
                )}
              </p>
            )}
          {available.some((n) =>
            ["deliver", "dispute", "resolve_seller", "resolve_buyer"].includes(
              n,
            ),
          ) && (
            <label>
              {t(
                "Ghi chú/bằng chứng đã trao đổi ngoài ứng dụng",
                "Note/evidence exchanged outside the app",
              )}
              <textarea
                rows={3}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
              />
              <small>
                {t(
                  "Chỉ hash được ghi on-chain. Gửi nội dung thực cho bên kia/trọng tài qua kênh đã thỏa thuận; hash không chứng minh hàng đã được giao.",
                  "Only a hash is recorded on-chain. Share actual evidence through the agreed channel; a hash does not prove delivery.",
                )}
              </small>
            </label>
          )}
          {available.length > 0 && (
            <>
              <label className="check">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                />
                <span>
                  {t(
                    "Tôi đã đọc điều khoản, số tiền, phí và hiểu hành động sẽ ký. Xác nhận/phán quyết có thể giải ngân không thể đảo ngược.",
                    "I have read the terms, amount and fee, and understand what I will sign. Confirmation/ruling may cause irreversible payout.",
                  )}
                </span>
              </label>
              <div className="actions">
                {available.map((name) => (
                  <button
                    className={
                      name === "fund" || name === "confirm" ? "arbitrator" : ""
                    }
                    key={name}
                    disabled={!ack || op.busy}
                    onClick={() => void execute(name)}
                  >
                    {t(...ACTION_LABELS[name])}
                  </button>
                ))}
              </div>
            </>
          )}
          {op.feedback}
        </section>
      </div>
      <section className="panel">
        <h2>{t("Điều khoản đã cố định", "Fixed terms")}</h2>
        <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {deal.terms}
        </p>
        <details>
          <summary>
            {t(
              "Ví, mint và bằng chứng on-chain",
              "Wallets, mint and on-chain evidence",
            )}
          </summary>
          <dl>
            {[
              [t("Người mua", "Buyer"), deal.buyer],
              [t("Người bán", "Seller"), deal.seller],
              [t("Trọng tài", "Arbitrator"), deal.arbitrator],
              ["Mint", deal.mint],
              ["Deal", id],
              ["Vault", vaultAddressFor(id)],
              [t("Hash bàn giao", "Delivery hash"), deal.deliveryHash],
              [t("Hash tranh chấp", "Dispute hash"), deal.disputeHash],
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
        </details>
        <h3>{t("Giao dịch liên quan", "Related transactions")}</h3>
        {receipts.length === 0 ? (
          <p>
            {t("Chưa tải được lịch sử chữ ký.", "No signature history loaded.")}
          </p>
        ) : (
          <ul>
            {receipts.map((r) => (
              <li key={r.signature}>
                <Receipt signature={r.signature} />
                {r.err ? ` · ${t("Thất bại", "Failed")}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
import { vaultAddress } from "@/escrow/client";
function vaultAddressFor(id: string) {
  return vaultAddress(new PublicKey(id)).toBase58();
}
export function Admin() {
  const { t, locale } = useLanguage();
  const { who, connection } = useWallet();
  const op = useOperation();
  const [arb, setArb] = useState<Arbitrator | null>(null),
    [balance, setBalance] = useState("—"),
    [value, setValue] = useState("10"),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [deals, setDeals] = useState<Deal[]>([]);
  const refresh = useCallback(async () => {
    if (!who) return;
    try {
      const c = connection();
      setArb(await readArbitrator(c, who));
      try {
        const b = await c.getTokenAccountBalance(
          getAssociatedTokenAddressSync(MINT, who),
        );
        setBalance(amount(BigInt(b.value.amount)));
      } catch {
        setBalance("—");
      }
      const infos = await c.getProgramAccounts(PROGRAM_ID, {
        filters: [{ dataSize: 876 }],
      });
      const result: Deal[] = [];
      for (const info of infos) {
        try {
          const d = await decodeDeal(info.pubkey.toBase58(), info.account.data);
          if (d.arbitrator === who.toBase58()) result.push(d);
        } catch {}
      }
      setDeals(result);
      setError("");
      setLoaded(true);
    } catch (e) {
      setError(errorMessage(e, locale === "vi"));
      setLoaded(false);
    }
  }, [who, connection, locale]);
  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(first);
  }, [refresh]);
  return (
    <>
      <span className="eyebrow">ARBITRATOR / DEVNET</span>
      <h1>{t("Không gian trọng tài", "Arbitrator workspace")}</h1>
      <p className="lead">
        {t(
          "Nạp cọc, chấp thuận deal và xử lý tranh chấp. Bạn không được rút tiền ký quỹ của buyer về ví mình.",
          "Deposit bond, accept deals and resolve disputes. You cannot withdraw the buyer’s principal to your own wallet.",
        )}
      </p>
      {!who && (
        <Notice>
          {t(
            "Kết nối ví trọng tài để bắt đầu.",
            "Connect the arbitrator wallet to begin.",
          )}
        </Notice>
      )}
      {error && <Notice error>{error}</Notice>}
      {who && (
        <>
          <button onClick={() => void refresh()} disabled={op.busy}>
            {t("Tải lại", "Refresh")}
          </button>
          {loaded && (
            <section className="panel">
              <h2>{t("Tiền cọc của bạn", "Your bond")}</h2>
              {!arb ? (
                <>
                  <p>
                    {t(
                      "Ví này chưa đăng ký làm trọng tài.",
                      "This wallet is not registered as an arbitrator.",
                    )}
                  </p>
                  <button
                    disabled={op.busy}
                    onClick={() =>
                      void op.run(async () => [await registerIx(who)], refresh)
                    }
                  >
                    {t(
                      "Đăng ký trọng tài Devnet",
                      "Register Devnet arbitrator",
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="grid three">
                    {[
                      [t("Tổng cọc", "Total bond"), amount(arb.total)],
                      [t("Đang khóa", "Reserved"), amount(arb.locked)],
                      [
                        t("Có thể rút", "Withdrawable"),
                        amount(arb.total - arb.locked),
                      ],
                    ].map(([label, v]) => (
                      <div key={label}>
                        <p className="muted">{label}</p>
                        <p className="amount">{v}</p>
                        <p>USDC</p>
                      </div>
                    ))}
                  </div>
                  <p>
                    {t("USDC trong ví:", "Wallet USDC:")} {balance}
                  </p>
                  <label>
                    {t(
                      "Số tiền nạp/rút (USDC)",
                      "Deposit/withdraw amount (USDC)",
                    )}
                    <input
                      inputMode="decimal"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                    />
                  </label>
                  <div className="actions">
                    <button
                      className="arbitrator"
                      disabled={op.busy}
                      onClick={() =>
                        void op.run(
                          async () => [
                            await bondIx(
                              "deposit_bond",
                              who,
                              parseAmount(value),
                            ),
                          ],
                          refresh,
                        )
                      }
                    >
                      {t("Nạp cọc", "Deposit bond")}
                    </button>
                    <button
                      disabled={op.busy}
                      onClick={() =>
                        void op.run(
                          async () => [
                            await bondIx(
                              "withdraw_bond",
                              who,
                              parseAmount(value),
                            ),
                          ],
                          refresh,
                        )
                      }
                    >
                      {t("Rút cọc khả dụng", "Withdraw available bond")}
                    </button>
                  </div>
                </>
              )}
              {op.feedback}
              <Notice>
                {t(
                  "Cọc bị khóa khi deal được nạp và mở khóa khi kết thúc. MVP chưa có phạt xử sai, bảo hiểm hoặc kháng nghị.",
                  "Bond is reserved on funding and released on settlement. This MVP has no wrongful-ruling slashing, insurance or appeal.",
                )}
              </Notice>
            </section>
          )}
          <section className="panel">
            <h2>{t("Deal có vai trò của bạn", "Deals involving you")}</h2>
            {deals.length === 0 ? (
              <p>
                {t(
                  "Chưa có deal hoặc chưa đọc được danh sách. Bạn luôn có thể mở link deal trực tiếp.",
                  "No deals or list unavailable. You can always open a deal link directly.",
                )}
              </p>
            ) : (
              deals.map((d) => (
                <Link
                  className="demo-link"
                  key={d.address}
                  href={`/deals/${d.address}`}
                >
                  {amount(d.amount)} USDC · {t(...STATE_LABELS[d.state])}
                  <Address value={d.address} />
                </Link>
              ))
            )}
          </section>
        </>
      )}
    </>
  );
}
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
              "Trọng tài đăng ký, nạp cọc. Người bán tạo deal, trọng tài mở link và chấp thuận.",
              "The arbitrator registers and deposits bond. The seller creates a deal; the arbitrator opens its link and accepts.",
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
          <Link className="button arbitrator" href="/deals/new">
            {t("Tạo deal mới", "Create a new deal")}
          </Link>
          <Link className="button" href="/admin">
            {t("Chuẩn bị trọng tài", "Prepare arbitrators")}
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
              <Address value={samples.arbitrator || "—"} />
            </dd>
          </div>
        </dl>
      </details>
    </>
  );
}
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
              "Nội dung bằng chứng chỉ dùng trong trình duyệt để tạo hash; không được gửi tới AI hoặc lưu trong database của ứng dụng. Bạn phải gửi nội dung bằng chứng cho bên kia/trọng tài qua kênh đã thỏa thuận.",
              "Evidence content is hashed in your browser, not sent to AI or stored in an app database. Share actual evidence with the other party/arbitrator through the agreed channel.",
            )}
          </p>
          <p>
            {t(
              "RPC xử lý yêu cầu đọc/gửi giao dịch. Nhà cung cấp hosting/RPC có thể có log vận hành. Cookie chỉ ghi ngôn ngữ; ứng dụng không lưu lịch sử deal trong localStorage.",
              "RPC providers process transaction reads/submissions. Hosting/RPC providers may retain operational logs. The cookie stores only language; the app does not store deal history in localStorage.",
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
                  "Seller: tạo deal, bàn giao; không tự rút tiền trước điều kiện giải ngân.",
                  "Seller: creates and delivers; cannot withdraw before payout conditions.",
                )}
              </li>
              <li>
                {t(
                  "Buyer: nạp, xác nhận, mở tranh chấp trước hạn kiểm tra.",
                  "Buyer: funds, confirms and disputes before the review deadline.",
                )}
              </li>
              <li>
                {t(
                  "Trọng tài: chấp thuận vai trò, nạp cọc, phán quyết trả seller hoặc hoàn buyer trong thời hạn của mình.",
                  "Arbitrators: accept roles, deposit bond and rule seller payout or buyer refund during their window.",
                )}
              </li>
            </ul>
          </section>
          <section className="panel">
            <h2>{t("Thời hạn và tranh chấp", "Deadlines and disputes")}</h2>
            <p>
              {t(
                "Không bàn giao đúng hạn: hoàn buyer. Đã báo bàn giao: buyer có khoảng kiểm tra để xác nhận/tranh chấp. Hết hạn mà không tranh chấp: có thể gửi giao dịch giải ngân.",
                "Missed delivery: refund buyer. After delivery, the buyer has a review window to confirm/dispute. Without a timely dispute, a release transaction can be submitted.",
              )}
            </p>
            <p>
              {t(
                "Khi có tranh chấp, trọng tài xử trong thời hạn. Sau hạn, người mua đề nghị trả người bán hoặc hoàn tiền, người bán phải ký đồng ý. Không đồng ý thì tiền còn khóa.",
                "In a dispute, the arbitrator rules within the deadline. Afterward, the buyer proposes payout/refund and the seller must accept. Without agreement, funds remain locked.",
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
                  "Không có keeper tự trả tiền theo giờ. Cần người gửi giao dịch khi đủ điều kiện.",
                  "There is no automatic keeper. Someone must submit the transaction when eligible.",
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
