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
import keeperConfig from "@/escrow/keeper-config.json";
import { eligibleForAutomaticRelease } from "@/escrow/keeper";
import { bondReadiness } from "@/escrow/bond";
import { BondStep } from "./components/bond-step";
import { DealProgress, currentDealStep } from "./components/deal-progress";
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
      "Ví đang kết nối đã thay đổi trong lúc ký. Kết nối lại đúng ví rồi thử lại.",
      "The connected wallet changed while signing. Reconnect the correct wallet and retry.",
    ],
    TRANSACTION_CHANGED: [
      "Ví trả về nội dung giao dịch khác bản đã chuẩn bị. Ứng dụng đã chặn gửi; giữ phí mặc định trong ví, tải lại trang và thử lại.",
      "The wallet returned a different transaction message. Broadcast was blocked; keep the wallet’s default fee, reload and retry.",
    ],
    INVALID_WALLET_SIGNATURE: [
      "Chữ ký ví chưa hợp lệ. Giao dịch chưa được gửi; kết nối lại ví và thử lại.",
      "The wallet signature is invalid. Nothing was broadcast; reconnect and retry.",
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
    ARBITRATOR_NOT_REGISTERED: [
      "Ví trọng tài chưa đăng ký trên phiên bản hiện tại. Chủ ví cần vào trang Trọng tài và bấm Đăng ký trọng tài Devnet; sau đó quay lại ví người bán để tạo deal. Chưa cần nạp cọc ở bước tạo.",
      "This arbitrator wallet is not registered on the current version. Its owner must open Arbitrator and register on Devnet, then return to the seller wallet to create the deal. Bond is not required at creation.",
    ],
    PROGRAM_NOT_READY: [
      "Cấu hình chương trình chưa sẵn sàng. Chủ dự án cần kiểm tra triển khai Devnet.",
      "Program configuration is not ready. The project owner must check the Devnet deployment.",
    ],
    INSUFFICIENT_SOL: [
      "Ví đang ký chưa đủ SOL Devnet để trả phí mạng và tạo tài khoản on-chain. Bổ sung SOL Devnet rồi thử lại; USDC không thay cho SOL trả phí.",
      "The signing wallet needs more Devnet SOL for network fees and account rent. Add Devnet SOL and retry; USDC cannot pay SOL fees.",
    ],
    INSUFFICIENT_BOND: [
      "Cọc khả dụng của trọng tài chưa đủ. Chủ ví trọng tài cần nạp thêm cọc trước khi buyer nạp tiền vào deal.",
      "The arbitrator’s available bond is insufficient. The arbitrator must deposit more bond before the buyer funds the deal.",
    ],
    BOND_LOCKED: [
      "Khoản cọc này đang khóa cho deal chưa kết thúc; chỉ rút được phần cọc khả dụng.",
      "This bond is reserved for an active deal; only available bond can be withdrawn.",
    ],
    ACTION_UNAUTHORIZED: [
      "Ví đang kết nối không có quyền thực hiện thao tác này. Kiểm tra vai trò và kết nối đúng ví.",
      "The connected wallet cannot perform this action. Check the role and connect the correct wallet.",
    ],
    ACTION_EXPIRED_OR_CHANGED: [
      "Trạng thái hoặc thời hạn đã thay đổi. Tải lại deal và chọn thao tác hiện có.",
      "The state or deadline changed. Refresh the deal and choose an available action.",
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
        t("Đã xác nhận thao tác trên Devnet.", "Action confirmed on Devnet."),
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
  const { who, connection } = useWallet();
  const op = useOperation();
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  const [createdBond, setCreatedBond] = useState(0n);
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
  let preview: bigint | null = null;
  try {
    preview = parseAmount(form.amount);
  } catch {}
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
        async () => {
          if (!(await readArbitrator(connection(), arbitrator)))
            throw new Error("ARBITRATOR_NOT_REGISTERED");
          return [
            await createDealIx(
              who,
              buyer,
              arbitrator,
              nonce,
              value,
              times,
              form.terms,
            ),
          ];
        },
        async () => {
          setCreated(address);
          setCreatedBond((value + 9n) / 10n);
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
          "Ví đang kết nối là người bán.",
          "The connected wallet is the seller.",
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
            <span id="arbitrator-wallet-label">
              {t("Ví trọng tài", "Arbitrator wallet")}
            </span>
            <input
              aria-labelledby="arbitrator-wallet-label"
              aria-describedby="arbitrator-wallet-help"
              required
              value={form.arbitrator}
              onChange={(e) => field("arbitrator", e.target.value)}
            />
            <small id="arbitrator-wallet-help">
              {t(
                "Ví này phải đăng ký trong trang Trọng tài trước khi tạo deal. Cọc cần đủ trước khi người mua nạp tiền.",
                "This wallet must register on the Arbitrator page before creating a deal. Sufficient bond is required before the buyer funds.",
              )}{" "}
              <Link href="/admin" target="_blank" rel="noreferrer">
                {t("Mở trang Trọng tài", "Open Arbitrator")} ↗
              </Link>
            </small>
          </label>
        </div>
        <label>
          <span id="deal-terms-label">
            {t("Điều khoản công khai", "Public terms")}
          </span>
          <textarea
            aria-labelledby="deal-terms-label"
            aria-describedby="deal-terms-help"
            required
            rows={4}
            value={form.terms}
            onChange={(e) => field("terms", e.target.value)}
          />
          <small id="deal-terms-help">
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
                  t("Thời gian trọng tài xử lý", "Arbitration window"),
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
          {preview
            ? t(
                `Buyer nạp ${amount(preview)} USDC · Seller nhận ${amount(preview - preview / 100n)} · Phí ${amount(preview / 100n)}`,
                `Buyer pays ${amount(preview)} USDC · Seller gets ${amount(preview - preview / 100n)} · Fee ${amount(preview / 100n)}`,
              )
            : t(
                "Phí 1% khi trả seller; hoàn tiền không thu phí.",
                "1% fee on seller payout; refunds have no fee.",
              )}
        </Notice>
        <details>
          <summary>{t("Lưu ý trước khi ký", "Before signing")}</summary>
          <p className="small">
            {t(
              "Điều kiện cố định sau khi tạo. Cọc trọng tài 10%; không phải bảo hiểm. Nếu trọng tài quá hạn và hai bên không đồng thuận, tiền có thể tiếp tục bị khóa.",
              "Terms are fixed after creation. Arbitrator bond is 10%, not insurance. After arbitration timeout, funds may remain locked without mutual agreement.",
            )}
          </p>
        </details>
        <label className="check">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          <span>
            {t(
              "Tôi đồng ý số tiền và điều kiện giao dịch.",
              "I agree to the amount and deal terms.",
            )}
          </span>
        </label>
        <div>
          <button
            className="primary action-current"
            disabled={!who || !ack || op.busy}
          >
            {t("Tạo và ký bằng ví", "Create and sign")}
          </button>
        </div>
        {error && <Notice error>{error}</Notice>}
        {op.feedback}
        {created && (
          <Notice>
            <h2>
              {t(
                "Bước tiếp theo: Trọng tài nạp cọc",
                "Next step: Arbitrator deposits bond",
              )}
            </h2>
            <p>
              {t(
                `Đã tạo link. Gửi link cho trọng tài để chuẩn bị ${amount(createdBond)} USDC cọc và nhận deal; sau đó người mua nạp tiền.`,
                `Link created. Share it with the arbitrator to prepare ${amount(createdBond)} USDC bond and accept, then the buyer funds.`,
              )}
            </p>
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
  const bondOp = useOperation();
  const [arbitratorProfile, setArbitratorProfile] = useState<
    Arbitrator | null | undefined
  >(undefined);
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
      let profile: Arbitrator | null | undefined;
      if (d.state === "created") {
        try {
          profile = await readArbitrator(c, new PublicKey(d.arbitrator));
        } catch {
          profile = undefined;
        }
      }
      const slot = await c.getSlot();
      const time = await c.getBlockTime(slot);
      if (time === null) throw new Error("RPC_UNAVAILABLE");
      setDeal(d);
      setNow(time);
      setReadAt(Date.now());
      setError("");
      setArbitratorProfile(profile);
      const history = await c.getSignaturesForAddress(new PublicKey(id), {
        limit: 10,
      });
      setReceipts(history);
    } catch (e) {
      setError(errorMessage(e, locale === "vi"));
      setReadAt(0);
      setArbitratorProfile(undefined);
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
    deal && readAt
      ? actions(deal, who?.toBase58() || null, now).filter(
          (name) =>
            name !== "finalize" &&
            name !== "accept_deal" &&
            !(
              name === "fund" &&
              !bondReadiness(deal.bond, arbitratorProfile)?.ready
            ),
        )
      : [];
  const waitingForKeeper =
    deal && readAt && eligibleForAutomaticRelease(deal, now);
  async function prepareBond(maxMissing: bigint) {
    if (!deal || !who || who.toBase58() !== deal.arbitrator) return;
    await bondOp.run(async () => {
      const c = connection();
      const latest = await readDeal(c, id);
      if (latest.state !== "created")
        throw new Error("ACTION_EXPIRED_OR_CHANGED");
      const profile = await readArbitrator(c, who);
      const status = bondReadiness(latest.bond, profile);
      if (!status) throw new Error("ARBITRATOR_NOT_REGISTERED");
      if (status.missing > maxMissing)
        throw new Error("ACTION_EXPIRED_OR_CHANGED");
      const ixs = [];
      if (status.missing > 0n)
        ixs.push(await bondIx("deposit_bond", who, status.missing));
      if (latest.approvals !== 1)
        ixs.push(await act("accept_deal", who, new PublicKey(id)));
      if (!ixs.length) throw new Error("ACTION_EXPIRED_OR_CHANGED");
      return ixs;
    }, refresh);
  }
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
  const readiness = readAt ? bondReadiness(deal.bond, arbitratorProfile) : null;
  const bondReady = !!readiness?.ready;
  const step = currentDealStep(deal, bondReady);
  const terminal = ["completed", "refunded", "cancelled"].includes(deal.state);
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
  const expired = !!readAt && deadline > 0 && now >= deadline;
  const remaining = Math.max(0, deadline - now);
  const countdown =
    remaining >= 60
      ? t(
          `Còn khoảng ${Math.ceil(remaining / 60)} phút`,
          `About ${Math.ceil(remaining / 60)} min left`,
        )
      : t(`Còn khoảng ${remaining} giây`, `About ${remaining} sec left`);
  const title = terminal
    ? t(...STATE_LABELS[deal.state])
    : waitingForKeeper
      ? t("Đang chờ tự trả tiền", "Awaiting automatic payout")
      : deal.state === "created"
        ? step === 1
          ? t("Trọng tài chuẩn bị cọc", "Arbitrator prepares bond")
          : t("Người mua nạp tiền", "Buyer funds")
        : deal.state === "funded"
          ? expired
            ? t("Quá hạn giao hàng", "Delivery deadline missed")
            : t("Người bán giao hàng", "Seller delivers")
          : deal.state === "disputed"
            ? expired
              ? t("Hai bên thống nhất phương án", "Parties agree on settlement")
              : t("Trọng tài xử lý tranh chấp", "Arbitrator resolves dispute")
            : t("Người mua kiểm tra hàng", "Buyer reviews delivery");
  const primaryAction = available.find((n) =>
    [
      "fund",
      "deliver",
      "confirm",
      "refund_expired",
      "accept_settlement",
    ].includes(n),
  );
  const primaryLabel =
    primaryAction === "fund"
      ? t(
          `Nạp ${amount(deal.amount)} USDC`,
          `Deposit ${amount(deal.amount)} USDC`,
        )
      : primaryAction === "deliver"
        ? t("Đã giao hàng", "Mark delivered")
        : primaryAction === "confirm"
          ? t("Đã nhận hàng", "Confirm receipt")
          : primaryAction === "refund_expired"
            ? t("Hoàn tiền cho người mua", "Refund buyer")
            : primaryAction === "accept_settlement"
              ? t("Đồng ý và kết thúc", "Accept and settle")
              : "";
  const requiresEvidence = available.some((n) =>
    ["deliver", "dispute", "resolve_seller", "resolve_buyer"].includes(n),
  );
  const primaryOwner =
    deal.state === "created"
      ? step === 1
        ? t("trọng tài", "the arbitrator")
        : t("người mua", "the buyer")
      : deal.state === "funded"
        ? t("người bán", "the seller")
        : deal.state === "disputed"
          ? expired
            ? deal.proposal
              ? t("người bán", "the seller")
              : t("người mua", "the buyer")
            : t("trọng tài", "the arbitrator")
          : t("người mua", "the buyer");
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/deals/${id}`);
      setCopy(t("Đã sao chép link.", "Link copied."));
    } catch {
      setCopy(
        t("Sao chép link trên thanh địa chỉ.", "Copy the address-bar link."),
      );
    }
  }
  function actionButton(name: string, main = false) {
    return (
      <button
        key={name}
        className={
          main
            ? "primary action-current"
            : name === "dispute"
              ? "dispute-button"
              : name.startsWith("resolve_") || name.startsWith("propose_")
                ? "action-decision"
                : ""
        }
        disabled={!ack || op.busy || bondOp.busy}
        onClick={() => void execute(name)}
      >
        {main ? primaryLabel : t(...ACTION_LABELS[name])}
      </button>
    );
  }
  return (
    <>
      <div className="deal-heading">
        <div>
          <span className="eyebrow">DEAL · DEVNET</span>
          <h1>{title}</h1>
        </div>
        <button
          className="quiet"
          disabled={op.busy || bondOp.busy}
          onClick={() => void refresh()}
        >
          {t("Tải lại trạng thái", "Refresh state")}
        </button>
      </div>
      <DealProgress deal={deal} bondReady={bondReady} />
      {error && <Notice error>{error}</Notice>}
      {!readAt && (
        <Notice>
          {t(
            "Dữ liệu cũ. Tải lại trước khi thao tác.",
            "Stale data. Refresh before continuing.",
          )}
        </Notice>
      )}
      {copy && <Notice>{copy}</Notice>}
      <div className="deal-summary">
        <strong>{amount(deal.amount)} USDC</strong>
        <span>
          {deal.state === "refunded"
            ? t(
                `Hoàn người mua ${amount(deal.amount)} · Phí 0`,
                `Buyer refunded ${amount(deal.amount)} · Fee 0`,
              )
            : deal.state === "cancelled"
              ? t("Chưa nạp tiền", "No funds deposited")
              : t(
                  `Người bán nhận ${amount(deal.amount - deal.fee)} · Phí ${amount(deal.fee)}`,
                  `Seller gets ${amount(deal.amount - deal.fee)} · Fee ${amount(deal.fee)}`,
                )}
        </span>
        {!terminal && deadline > 0 && readAt > 0 && (
          <span className="time-badge">
            {expired ? t("Đã hết hạn", "Deadline passed") : countdown}
          </span>
        )}
      </div>
      {deal.state === "created" && step === 1 && !expired ? (
        <BondStep
          deal={deal}
          profile={arbitratorProfile}
          wallet={who?.toBase58() || null}
          busy={op.busy || bondOp.busy}
          fresh={!!readAt}
          onPrepare={prepareBond}
          feedback={bondOp.feedback}
        />
      ) : (
        <section
          className={`panel action-card ${deal.state === "disputed" ? "action-dispute" : ""}`}
          aria-labelledby="action-title"
        >
          <span className="eyebrow">
            {terminal
              ? t("KẾT QUẢ", "RESULT")
              : t(`BƯỚC ${step + 1}/5`, `STEP ${step + 1}/5`)}
          </span>
          <h2 id="action-title">
            {terminal
              ? deal.state === "completed"
                ? t("Đã trả người bán", "Paid to seller")
                : deal.state === "refunded"
                  ? t("Đã hoàn người mua", "Refunded to buyer")
                  : t("Đã hủy deal", "Deal cancelled")
              : waitingForKeeper
                ? t("Không cần ký thêm", "No more signatures needed")
                : primaryAction
                  ? primaryAction === "fund"
                    ? t("Nạp tiền vào ký quỹ", "Fund escrow")
                    : primaryAction === "deliver"
                      ? t("Xác nhận đã giao", "Mark delivery")
                      : primaryAction === "confirm"
                        ? t("Xác nhận hoặc khiếu nại", "Confirm or dispute")
                        : t("Hoàn tất giao dịch", "Complete the deal")
                  : available.some((n) => n.startsWith("resolve_"))
                    ? t("Chọn kết quả xử lý", "Choose the ruling")
                    : available.some((n) => n.startsWith("propose_"))
                      ? t("Đề nghị phương án", "Propose a settlement")
                      : t(`Chờ ${primaryOwner}`, `Waiting for ${primaryOwner}`)}
          </h2>
          {terminal ? (
            <p className="result-amount">
              {deal.state === "completed"
                ? `${amount(deal.amount - deal.fee)} USDC`
                : deal.state === "refunded"
                  ? `${amount(deal.amount)} USDC`
                  : t("Chưa nạp tiền", "No funds deposited")}{" "}
              <span>✓</span>
            </p>
          ) : waitingForKeeper ? (
            <>
              <p>
                {t(
                  "Hết hạn, không khiếu nại. Keeper sẽ trả tiền.",
                  "Review ended without dispute. The keeper will release funds.",
                )}
              </p>
              <p className="small">
                {t(
                  "Kiểm tra khoảng 5 phút/lượt; có thể trễ.",
                  "Checks about every 5 minutes; delays are possible.",
                )}{" "}
                <a
                  href={keeperConfig.workflowUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Trạng thái dịch vụ", "Service status")} ↗
                </a>
              </p>
            </>
          ) : (
            <>
              {expired && deal.state === "created" ? (
                <p>
                  {t(
                    "Hạn nạp đã hết. Người bán cần tạo link mới.",
                    "Funding expired. The seller needs to create a new link.",
                  )}
                </p>
              ) : deal.state === "disputed" ? (
                <p>
                  {t(
                    "Tiền giữ trong quỹ đến khi có quyết định.",
                    "Funds stay in escrow until a decision.",
                  )}
                </p>
              ) : !primaryAction ? (
                <p>
                  {t(
                    "Mở link bằng đúng ví để thực hiện bước này.",
                    "Open this link with the correct wallet to continue.",
                  )}
                </p>
              ) : null}
              {deal.state === "disputed" && deal.proposal > 0 && (
                <p>
                  <strong>
                    {t("Đề nghị:", "Proposal:")}{" "}
                    {deal.proposal === 1
                      ? t("Trả người bán", "Pay seller")
                      : t("Hoàn người mua", "Refund buyer")}
                  </strong>
                </p>
              )}
              {requiresEvidence && (
                <label>
                  <span id="evidence-label">
                    {t(
                      "Ghi chú bàn giao / khiếu nại",
                      "Delivery / dispute note",
                    )}
                  </span>
                  <textarea
                    aria-labelledby="evidence-label"
                    rows={2}
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                  />
                  <small>
                    {t(
                      "Chia sẻ bằng chứng qua kênh đã thỏa thuận.",
                      "Share evidence through the agreed channel.",
                    )}
                  </small>
                </label>
              )}
              {available.some((n) => n !== "cancel_deal") && (
                <label className="check compact-consent">
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                  />
                  <span>
                    {t(
                      "Tôi đồng ý điều kiện và thao tác này.",
                      "I agree to the terms and this action.",
                    )}
                  </span>
                </label>
              )}
              <div className="actions main-actions">
                {primaryAction && actionButton(primaryAction, true)}
                {available.includes("dispute") && actionButton("dispute")}
                {available
                  .filter(
                    (n) => n.startsWith("resolve_") || n.startsWith("propose_"),
                  )
                  .map((n) => actionButton(n))}
              </div>
              {!primaryAction &&
                !available.some(
                  (n) => n.startsWith("resolve_") || n.startsWith("propose_"),
                ) &&
                !expired && (
                  <button
                    className="primary action-current"
                    onClick={() => void copyLink()}
                  >
                    {t("Sao chép link gửi đúng người", "Copy link to share")}
                  </button>
                )}
              {available.includes("cancel_deal") && (
                <details className="secondary-actions">
                  <summary>{t("Thao tác khác", "Other actions")}</summary>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={ack}
                      onChange={(e) => setAck(e.target.checked)}
                    />
                    <span>
                      {t(
                        "Tôi muốn hủy deal chưa nạp tiền.",
                        "I want to cancel this unfunded deal.",
                      )}
                    </span>
                  </label>
                  {actionButton("cancel_deal")}
                </details>
              )}
            </>
          )}
          {op.feedback}
        </section>
      )}
      <div className="deal-tools">
        <button onClick={() => void copyLink()}>
          {t("Sao chép link deal", "Copy deal link")}
        </button>
        {receipts[0] && <Receipt signature={receipts[0].signature} />}
      </div>
      <details className="panel disclosure">
        <summary>{t("Điều kiện giao dịch", "Deal terms")}</summary>
        <p className="terms-text">{deal.terms}</p>
        <dl>
          <div>
            <dt>{t("Tiền giao dịch", "Deal amount")}</dt>
            <dd>{amount(deal.amount)} USDC</dd>
          </div>
          <div>
            <dt>{t("Phí trung gian", "Intermediary fee")}</dt>
            <dd>
              {amount(
                ["refunded", "cancelled"].includes(deal.state) ? 0n : deal.fee,
              )}{" "}
              USDC
            </dd>
          </div>
          <div>
            <dt>{t("Cọc trọng tài", "Arbitrator bond")}</dt>
            <dd>
              {amount(deal.bond)} USDC ·{" "}
              {["completed", "refunded"].includes(deal.state)
                ? t("đã mở khóa", "released")
                : deal.state === "created" || deal.state === "cancelled"
                  ? t("chưa khóa cho deal", "not reserved yet")
                  : t("đang khóa", "reserved")}
            </dd>
          </div>
          {deadline > 0 && (
            <div>
              <dt>{t("Thời hạn", "Deadline")}</dt>
              <dd>
                {new Date(deadline * 1000).toLocaleString(
                  locale === "vi" ? "vi-VN" : "en-US",
                )}
              </dd>
            </div>
          )}
        </dl>
      </details>
      <details className="panel disclosure">
        <summary>{t("Ví và bằng chứng", "Wallets and evidence")}</summary>
        <dl>
          {[
            [t("Người mua", "Buyer"), deal.buyer],
            [t("Người bán", "Seller"), deal.seller],
            [t("Trọng tài", "Arbitrator"), deal.arbitrator],
            ["Mint", deal.mint],
            ["Deal", id],
            ["Vault", vaultAddressFor(id)],
            [t("Hash bàn giao", "Delivery hash"), deal.deliveryHash],
            [t("Hash khiếu nại", "Dispute hash"), deal.disputeHash],
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
        <h3>{t("Giao dịch liên quan", "Related transactions")}</h3>
        {receipts.length ? (
          <ul>
            {receipts.map((r) => (
              <li key={r.signature}>
                <Receipt signature={r.signature} />
                {r.err ? ` · ${t("Thất bại", "Failed")}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("Chưa tải được lịch sử.", "History unavailable.")}</p>
        )}
      </details>
      <details className="panel disclosure">
        <summary>{t("Cách hoạt động", "How it works")}</summary>
        <p>
          {t(
            "Sau khi giao hàng, người mua xác nhận hoặc khiếu nại trước hạn. Hết hạn không khiếu nại, keeper tự gửi lệnh trả tiền. Cọc không phải bảo hiểm; quá hạn trọng tài cần hai bên đồng thuận.",
            "After delivery, the buyer confirms or disputes before the deadline. Without a timely dispute, the keeper submits payout. Bond is not insurance; after arbitration timeout both parties must agree.",
          )}
        </p>
      </details>
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
                      className="primary action-current"
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
