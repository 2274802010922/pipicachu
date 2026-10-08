"use client";
import { Buffer } from "buffer";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { useLanguage } from "../i18n/provider";
import { useWallet } from "../wallet";
import { Notice } from "../components/feedback";
import { useFreshness } from "../hooks/use-freshness";
import { useOperation } from "../hooks/use-operation";
import { errorMessage } from "../errors";
import { organizationName } from "../shared-escrow";
import { readManager } from "@/escrow/governance";
import { bondReadiness } from "@/escrow/bond";
import {
  createOrganizationDealIx,
  listOrganizations,
  readArbitrator,
  readArbitrators,
  readOrganization,
  parseAmount,
  amount,
  dealAddress,
  type Organization,
  type Arbitrator,
} from "@/escrow/client";
export function CreateDeal() {
  const { t, locale } = useLanguage();
  const { who, connection } = useWallet();
  const router = useRouter();
  const op = useOperation({ action: "create" });
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
  const { fresh, markFresh, markStale } = useFreshness();
  const generation = useRef(0),
    draftOwner = useRef<string | null>(null);
  useEffect(() => {
    const owner = who?.toBase58() || null;
    const changed = draftOwner.current !== null && draftOwner.current !== owner;
    draftOwner.current = owner;
    if (!changed) return;
    const timer = setTimeout(
      () => setForm({ buyer: "", arbitrator: "", amount: "1", terms: "" }),
      0,
    );
    return () => clearTimeout(timer);
  }, [who]);
  const load = useCallback(
    async (foreground = true) => {
      const revision = ++generation.current;
      if (foreground) setReady(false);
      try {
        const c = connection();
        const orgs = await listOrganizations(c);
        const profiles = await readArbitrators(
          c,
          orgs.map((org) => new PublicKey(org.authority)),
        );
        const rows = orgs.map((org, index) => ({ org, arb: profiles[index] }));
        if (rows.length && !(await readManager(c)))
          throw Error("CLIENT_OUTDATED");
        if (revision !== generation.current) return;
        setCatalog(rows);
        setError("");
        setReady(true);
        markFresh();
      } catch (e) {
        if (revision !== generation.current) return;
        setReady(false);
        markStale();
        setError(errorMessage(e, locale === "vi"));
      }
    },
    [connection, locale, markFresh, markStale],
  );
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void load(false);
    }, 10000);
    return () => {
      invalidate();
      clearTimeout(timer);
      clearInterval(poll);
    };
  }, [load, invalidate]);
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
          if (
            org.minimumDeposit !== selected.org.minimumDeposit ||
            org.maximumDeal !== selected.org.maximumDeal ||
            org.times.some((value, i) => value !== selected.org.times[i])
          ) {
            await load();
            throw Error("ORGANIZATION_POLICY_CHANGED");
          }
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
        { action: "create", dealAddress: address },
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
            placeholder={t(
              "Giao: 3 file thiết kế. Kiểm tra: đủ file, mở được. Kênh: chat đã thống nhất.",
              "Deliver: 3 design files. Verify: complete and readable. Channel: agreed chat.",
            )}
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
                `Người mua nạp ${amount(preview)} · Người bán nhận ${amount(preview - (preview / 100n) * 2n)} · Phí ${amount((preview / 100n) * 2n)} USDC`,
                `Buyer pays ${amount(preview)} · Seller gets ${amount(preview - (preview / 100n) * 2n)} · Fee ${amount((preview / 100n) * 2n)} USDC`,
              )
            : t(
                "Phí trọng tài 1% + hệ thống 1%; hoàn tiền không phí.",
                "Arbitrator 1% + platform 1%; fee-free refunds.",
              )}
        </div>
        <p className="small">
          {t(
            "Tạo và ký là chấp thuận điều kiện. Trọng tài được xử sau hạn SLA. Cọc không phải bảo hiểm; bỏ xử và hai bên bất đồng có thể kẹt tiền.",
            "Signing accepts these terms. The arbitrator may rule after SLA expiry. Bond is not insurance; abandonment without mutual agreement may lock funds.",
          )}
        </p>
        <button
          className="primary action-current"
          disabled={
            !who ||
            !ready ||
            !fresh ||
            !selected ||
            !eligible(selected) ||
            op.busy
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
