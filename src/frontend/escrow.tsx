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
  createOrganizationDealIx,
  listOrganizations,
  readOrganization,
  organizationAcceptingIx,
  type Organization,
  dealAddress,
  digest,
  fundIx,
  MINT,
  parseAmount,
  PROGRAM_ID,
  readArbitrator,
  readDeal,
  decodeDeal,
  settleIxs,
  type Arbitrator,
  type Deal,
} from "@/escrow/client";
import { actions } from "@/escrow/policy";
import deployment from "@/escrow/deployment.json";
import keeperConfig from "@/escrow/keeper-config.json";
import { eligibleForAutomaticRelease } from "@/escrow/keeper";
import { feeBreakdown } from "@/escrow/fees";
import { bondReadiness } from "@/escrow/bond";
import { useConfirmation } from "./components/confirmation";
import { BondStep } from "./components/bond-step";
import { DealProgress, currentDealStep } from "./components/deal-progress";
import arbitratorConfig from "@/escrow/arbitrator-config.json";
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
    ORGANIZATION_UNAVAILABLE: [
      "Trọng tài chưa được duyệt, tạm ngừng hoặc không đủ cọc. Tải lại để chọn trọng tài khác.",
      "Arbitrator unapproved, paused or underfunded. Refresh and select another arbitrator.",
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
export function CreateDeal() {
  const { t, locale } = useLanguage();
  const { who, connection } = useWallet();
  const router = useRouter();
  const op = useOperation();
  const [form, setForm] = useState({
    buyer: "",
    arbitrator: "",
    amount: "1",
    terms: "",
  });
  const [catalog, setCatalog] = useState<
    { org: Organization; arb: Arbitrator | null }[]
  >([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    setReady(false);
    try {
      const c = connection();
      const orgs = await listOrganizations(c);
      const rows = await Promise.all(
        orgs.map(async (org) => ({
          org,
          arb: await readArbitrator(c, new PublicKey(org.authority)),
        })),
      );
      setCatalog(rows);
      setError("");
      setReady(true);
    } catch (e) {
      setError(errorMessage(e, locale === "vi"));
    }
  }, [connection, locale]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const selected = catalog.find((row) => row.org.authority === form.arbitrator);
  const eligible = (row: { org: Organization; arb: Arbitrator | null }) =>
    row.org.approved &&
    row.org.accepting &&
    row.arb !== null &&
    row.arb.total >= row.org.minimumDeposit &&
    preview !== null &&
    preview >= 1_000_000n &&
    preview <= row.org.maximumDeal &&
    !!bondReadiness((preview + 9n) / 10n, row.arb)?.ready;
  let preview: bigint | null = null;
  try {
    preview = parseAmount(form.amount);
  } catch {}
  const field = (name: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!who || !selected) return;
    setError("");
    try {
      const buyer = new PublicKey(form.buyer),
        arbitrator = new PublicKey(form.arbitrator);
      const value = parseAmount(form.amount);
      if (
        value < 1_000_000n ||
        new Set([who, buyer, arbitrator].map((p) => p.toBase58())).size !== 3 ||
        !form.terms.trim() ||
        Buffer.byteLength(form.terms) > 512
      )
        throw Error("INVALID_TERMS");
      const nonce = Buffer.from(
        crypto.getRandomValues(new Uint8Array(8)),
      ).readBigUInt64LE();
      const address = dealAddress(who, nonce).toBase58();
      await op.run(
        async () => {
          const org = await readOrganization(connection(), arbitrator);
          const arb = await readArbitrator(connection(), arbitrator);
          if (
            !org?.approved ||
            !org.accepting ||
            !arb ||
            arb.total < org.minimumDeposit ||
            value > org.maximumDeal ||
            !bondReadiness((value + 9n) / 10n, arb)?.ready
          )
            throw Error("ORGANIZATION_UNAVAILABLE");
          return [
            await createOrganizationDealIx(
              who,
              buyer,
              arbitrator,
              nonce,
              value,
              org.times,
              form.terms,
            ),
          ];
        },
        async () => {
          router.push(`/deals/${address}`);
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
          "Ví đang dùng là người bán. Chọn trọng tài đã chuẩn bị cọc.",
          "Your wallet is the seller. Choose an arbitrator with prepaid bond.",
        )}
      </p>
      {!who && (
        <Notice>
          {t(
            "Kết nối ví người bán để tạo link.",
            "Connect the seller wallet to create a link.",
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
        <label>
          {t("Trọng tài", "Arbitrator")}
          <select
            aria-label={t("Trọng tài", "Arbitrator")}
            required
            value={form.arbitrator}
            onChange={(e) => field("arbitrator", e.target.value)}
          >
            <option value="">
              {t("Chọn trọng tài đã duyệt", "Choose an approved arbitrator")}
            </option>
            {catalog.map((row) => (
              <option
                key={row.org.authority}
                value={row.org.authority}
                disabled={!eligible(row)}
              >
                {organizationName(row.org.authority, locale)} ·{" "}
                {eligible(row)
                  ? t("Đang nhận giao dịch", "Accepting deals")
                  : t("Chưa thể nhận deal này", "Unavailable for this deal")}
              </option>
            ))}
          </select>
        </label>
        {!ready ? (
          <p>{t("Đang đọc registry Devnet…", "Reading Devnet registry…")}</p>
        ) : !catalog.length ? (
          <Notice>
            {t(
              "Chưa có trọng tài đã duyệt. Chủ dự án cần thiết lập registry Devnet.",
              "No approved arbitrator. The owner must configure the Devnet registry.",
            )}
          </Notice>
        ) : null}
        {selected && (
          <p className="small">
            {t("Tối đa", "Maximum")} {amount(selected.org.maximumDeal)} USDC ·{" "}
            {t("Giao trong", "Delivery within")}{" "}
            {Math.round(selected.org.times[1] / 60)} {t("phút", "minutes")} ·{" "}
            {t("Kiểm tra", "Review")} {Math.round(selected.org.times[2] / 60)}{" "}
            {t("phút", "minutes")}
          </p>
        )}
        <label>
          {t(
            "Bạn bán gì và điều kiện bàn giao?",
            "What are you selling and the delivery terms?",
          )}
          <textarea
            required
            rows={3}
            value={form.terms}
            onChange={(e) => field("terms", e.target.value)}
          />
          <small>
            {t(
              "Tối đa 512 byte. Không ghi dữ liệu riêng tư. Điều kiện cố định sau khi tạo.",
              "Up to 512 bytes. No private data. Terms are fixed after creation.",
            )}
          </small>
        </label>
        <div className="fee-preview">
          {preview
            ? t(
                `Buyer nạp ${amount(preview)} · Seller nhận ${amount(preview - (preview / 100n) * 2n)} · Phí ${amount((preview / 100n) * 2n)} USDC`,
                `Buyer pays ${amount(preview)} · Seller gets ${amount(preview - (preview / 100n) * 2n)} · Fee ${amount((preview / 100n) * 2n)} USDC`,
              )
            : t(
                "Phí trọng tài 1% + hệ thống 1%; hoàn tiền không phí.",
                "Arbitrator 1% + platform 1%; fee-free refunds.",
              )}
        </div>
        <p className="small">
          {t(
            "Tạo và ký nghĩa là chấp thuận điều kiện. Cọc không phải bảo hiểm; tranh chấp quá hạn mà không đồng thuận có thể kẹt tiền.",
            "Creating and signing accepts these terms. Bond is not insurance; expired disputes without agreement may lock funds.",
          )}
        </p>
        <button
          className="primary action-current"
          disabled={
            !who || !ready || !selected || !eligible(selected) || op.busy
          }
        >
          {t("Tạo giao dịch và ký bằng ví", "Create and sign")}
        </button>
        {error && <Notice error>{error}</Notice>}
        {op.feedback}
        {error && (
          <button type="button" onClick={() => void load()}>
            {t("Thử lại", "Retry")}
          </button>
        )}
      </form>
    </>
  );
}
function organizationName(address: string, locale: string) {
  const label =
    address === arbitratorConfig.wallet
      ? locale === "vi"
        ? "Trọng tài của dự án"
        : "Project arbitrator"
      : locale === "vi"
        ? "Trọng tài đã duyệt"
        : "Approved arbitrator";
  return `${label} · ${address.slice(0, 4)}…${address.slice(-4)}`;
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
  const confirmation = useConfirmation();
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
    [complaintOpen, setComplaintOpen] = useState(false),
    [organization, setOrganization] = useState<Organization | null>(null),
    [copy, setCopy] = useState(""),
    [receipts, setReceipts] = useState<{ signature: string; err: unknown }[]>(
      [],
    );
  useEffect(() => {
    const timer = setTimeout(() => {
      setEvidence("");
      setComplaintOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [who, id]);
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
      setOrganization(
        d.workflowVersion === 1
          ? await readOrganization(c, new PublicKey(d.arbitrator))
          : null,
      );
      const slot = await c.getSlot();
      const time = await c.getBlockTime(slot);
      if (time === null) throw new Error("RPC_UNAVAILABLE");
      setDeal(d);
      setNow(time);
      setReadAt(Date.now());
      setError("");
      setArbitratorProfile(profile);
      const history = await c
        .getSignaturesForAddress(new PublicKey(id), {
          limit: 10,
        })
        .catch(() => []);
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
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 10000);
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh, who]);
  const organizationReady =
    !!deal &&
    (deal.workflowVersion !== 1 ||
      (!!organization?.approved &&
        organization.accepting &&
        !!arbitratorProfile &&
        arbitratorProfile.total >= organization.minimumDeposit &&
        deal.amount <= organization.maximumDeal));
  const available =
    deal && readAt
      ? actions(deal, who?.toBase58() || null, now).filter(
          (name) =>
            name !== "finalize" &&
            name !== "accept_deal" &&
            !(
              name === "fund" &&
              (!bondReadiness(deal.bond, arbitratorProfile)?.ready ||
                !organizationReady)
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
    if (name === "dispute" && !complaintOpen) {
      setComplaintOpen(true);
      return;
    }
    if (
      deal &&
      [
        "confirm",
        "resolve_seller",
        "resolve_buyer",
        "accept_settlement",
        "cancel_deal",
      ].includes(name)
    ) {
      const refund =
        name === "resolve_buyer" ||
        (name === "accept_settlement" && deal.proposal === 2);
      const f = feeBreakdown(deal.amount, deal.fee, deal.platformFee, refund);
      const text =
        name === "cancel_deal"
          ? t("Hủy deal chưa nạp tiền?", "Cancel the unfunded deal?")
          : refund
            ? t(
                `Hoàn buyer ${amount(deal.amount)} USDC, không thu phí. Xác nhận?`,
                `Refund buyer ${amount(deal.amount)} USDC without fees. Confirm?`,
              )
            : t(
                `Trả seller ${amount(f.sellerNet)} USDC; trọng tài ${amount(f.arbitratorFee)}, hệ thống ${amount(f.platformFee)}. Không thể hoàn tác. Xác nhận?`,
                `Pay seller ${amount(f.sellerNet)} USDC; arbitrator ${amount(f.arbitratorFee)}, platform ${amount(f.platformFee)}. Irreversible. Confirm?`,
              );
      if (!(await confirmation.ask(text))) return;
    }
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
          connection(),
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
        return settleIxs(name, actor, deal, undefined, connection());
      return [await act(name, actor, d)];
    }, refresh);
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
  const fees = feeBreakdown(deal.amount, deal.fee, deal.platformFee);
  const readiness = readAt ? bondReadiness(deal.bond, arbitratorProfile) : null;
  const bondReady = organizationReady && !!readiness?.ready;
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
        ? deal.workflowVersion !== 1 && step === 1
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
        disabled={op.busy || bondOp.busy}
        onClick={() => void execute(name)}
      >
        {main ? primaryLabel : t(...ACTION_LABELS[name])}
      </button>
    );
  }
  return (
    <>
      {confirmation.dialog}
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
      <p className="role-banner">
        {t("Ví đang dùng:", "Current wallet:")}{" "}
        {who
          ? who.toBase58() === deal.buyer
            ? t("Người mua", "Buyer")
            : who.toBase58() === deal.seller
              ? t("Người bán", "Seller")
              : who.toBase58() === deal.arbitrator
                ? t("Trọng tài", "Arbitrator")
                : t(
                    "Người xem — đổi tài khoản Phantom để thao tác",
                    "Viewer — switch Phantom account to act",
                  )
          : t("Chưa kết nối", "Not connected")}
      </p>
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
      {deal.workflowVersion === 1 &&
        deal.state === "created" &&
        !organizationReady && (
          <Notice error>
            {t(
              "Trọng tài đang ngừng nhận hoặc không đủ điều kiện. Không thể nạp tiền; người bán cần tạo link mới với trọng tài khả dụng.",
              "Arbitrator paused or ineligible. Funding is blocked; the seller must create a new link with an available arbitrator.",
            )}
          </Notice>
        )}
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
                  `Người bán nhận ${amount(fees.sellerNet)} · Phí ${amount(fees.totalFee)}`,
                  `Seller gets ${amount(fees.sellerNet)} · Fee ${amount(fees.totalFee)}`,
                )}
        </span>
        {!terminal && deadline > 0 && readAt > 0 && (
          <span className="time-badge">
            {expired ? t("Đã hết hạn", "Deadline passed") : countdown}
          </span>
        )}
      </div>
      {deal.workflowVersion !== 1 &&
      deal.state === "created" &&
      step === 1 &&
      !expired ? (
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
              : t(
                  `BƯỚC ${step + 1}/${deal.workflowVersion === 1 ? 4 : 5}`,
                  `STEP ${step + 1}/${deal.workflowVersion === 1 ? 4 : 5}`,
                )}
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
                ? `${amount(fees.sellerNet)} USDC`
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
              {requiresEvidence &&
                (deal.state !== "delivered" || complaintOpen) && (
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
            <dt>{t("Tổng phí dịch vụ", "Total service fees")}</dt>
            <dd>
              {amount(
                ["refunded", "cancelled"].includes(deal.state)
                  ? 0n
                  : fees.totalFee,
              )}{" "}
              USDC
            </dd>
          </div>
          <div>
            <dt>{t("Phí trọng tài", "Arbitrator fee")}</dt>
            <dd>
              {amount(
                ["refunded", "cancelled"].includes(deal.state) ? 0n : deal.fee,
              )}{" "}
              USDC (1%)
            </dd>
          </div>
          <div>
            <dt>{t("Phí hệ thống pipicachu", "pipicachu platform fee")}</dt>
            <dd>
              {amount(
                ["refunded", "cancelled"].includes(deal.state)
                  ? 0n
                  : deal.platformFee,
              )}{" "}
              USDC ({deal.feeVersion === 0 ? "0" : "1"}%)
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
    [org, setOrg] = useState<Organization | null>(null),
    [balance, setBalance] = useState("—"),
    [value, setValue] = useState("1"),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [deals, setDeals] = useState<Deal[]>([]);
  const refresh = useCallback(async () => {
    if (!who) return;
    try {
      const c = connection();
      setArb(await readArbitrator(c, who));
      setOrg(await readOrganization(c, who));
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
            <section className="panel stack">
              <h2>{t("Quỹ cọc trọng tài", "Arbitrator bond pool")}</h2>
              {!arb ? (
                <Notice>
                  {t(
                    "Ví này chưa được thiết lập. Chỉ tổ chức do hệ thống duyệt được nhận deal mới.",
                    "Wallet not onboarded. Only approved organizations can receive new deals.",
                  )}
                </Notice>
              ) : (
                <>
                  <p className="role-banner">
                    {org?.approved
                      ? organizationName(who.toBase58(), locale)
                      : t(
                          "Chỉ quản lý cọc deal cũ — chưa được duyệt nhận deal mới",
                          "Legacy bond only — not approved for new deals",
                        )}
                  </p>
                  <div className="grid three">
                    {[
                      [t("Tổng cọc", "Total bond"), arb.total],
                      [t("Đã dành cho deal", "Reserved for deals"), arb.locked],
                      [
                        t("Còn khả dụng", "Available capacity"),
                        arb.total - arb.locked,
                      ],
                    ].map(([label, v]) => (
                      <div key={String(label)}>
                        <p>{String(label)}</p>
                        <strong className="amount">
                          {amount(v as bigint)} USDC
                        </strong>
                      </div>
                    ))}
                  </div>
                  {org && (
                    <p>
                      {org.accepting
                        ? t(
                            "Đang nhận giao dịch · cọc không được rút",
                            "Accepting deals · withdrawals locked",
                          )
                        : t(
                            "Ngừng nhận giao dịch mới",
                            "New deals paused",
                          )}{" "}
                      · {t("Cọc tối thiểu", "Minimum deposit")}{" "}
                      {amount(org.minimumDeposit)} USDC
                    </p>
                  )}
                  <p className="small">
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
                    {org?.approved && (
                      <button
                        className="primary"
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
                    )}
                    {org?.approved && (
                      <button
                        className={org.accepting ? "" : "primary"}
                        disabled={
                          op.busy ||
                          (!org.accepting && arb.total < org.minimumDeposit)
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              t(
                                "Chấp thuận phạm vi và thời hạn của tổ chức? Deal đủ điều kiện sẽ được nhận tự động. Cọc không thể rút khi đang nhận hoặc còn nghĩa vụ.",
                                "Accept the organization's scope and deadlines? Eligible deals are accepted automatically. Bond cannot be withdrawn while accepting or reserved.",
                              ),
                            )
                          )
                            void op.run(
                              async () => [
                                await organizationAcceptingIx(
                                  who,
                                  !org.accepting,
                                ),
                              ],
                              refresh,
                            );
                        }}
                      >
                        {org.accepting
                          ? t("Ngừng nhận giao dịch", "Pause new deals")
                          : t("Bật nhận giao dịch", "Enable new deals")}
                      </button>
                    )}
                    <button
                      disabled={
                        op.busy || (!!org && (org.accepting || arb.locked > 0n))
                      }
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
                      {t("Rút cọc", "Withdraw bond")}
                    </button>
                  </div>
                  {!!org && (org.accepting || arb.locked > 0n) && (
                    <p className="small">
                      {t(
                        "Ngừng nhận deal mới và hoàn tất mọi deal đã nạp trước khi rút cọc.",
                        "Pause new deals and settle all funded deals before withdrawing.",
                      )}
                    </p>
                  )}
                  {org && (
                    <details>
                      <summary>
                        {t(
                          "Phạm vi chấp thuận trước",
                          "Standing consent policy",
                        )}
                      </summary>
                      <p>
                        {t("Tối đa", "Maximum")} {amount(org.maximumDeal)} USDC
                        · {t("Bàn giao", "Delivery")} {org.times[1]}s ·{" "}
                        {t("Kiểm tra", "Review")} {org.times[2]}s ·{" "}
                        {t("Xử tranh chấp", "Arbitration")} {org.times[3]}s
                      </p>
                    </details>
                  )}
                </>
              )}
              {op.feedback}
              <p className="small">
                {t(
                  "Cọc không phải bảo hiểm. Chưa có phạt xử sai hoặc kháng nghị.",
                  "Bond is not insurance. No wrongful-ruling slashing or appeal.",
                )}
              </p>
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
                  "Trọng tài đã duyệt: nạp quỹ và bật nhận trước; xử tranh chấp trong thời hạn. Deal cũ giữ bước nhận riêng.",
                  "Approved arbitrators pre-fund and enable standing consent; rule disputes within their window. Legacy deals keep individual acceptance.",
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
