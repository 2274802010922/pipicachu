"use client";
import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";
import { useLanguage } from "../i18n/provider";
import { useWallet } from "../wallet";
import { useConfirmation } from "../components/confirmation";
import { useFreshness } from "../hooks/use-freshness";
import { useOperation } from "../hooks/use-operation";
import { Notice, Address } from "../components/feedback";
import { STATE_LABELS } from "../shared-escrow";
import { errorMessage } from "../errors";
import { getAssociatedTokenAddressSync } from "@/escrow/token";
import {
  amount,
  bondIx,
  registerIx,
  readArbitrator,
  readOrganization,
  decodeDeal,
  organizationAcceptingIx,
  parseAmount,
  MINT,
  PROGRAM_ID,
  type Deal,
  type Arbitrator,
  type Organization,
} from "@/escrow/client";
import {
  readManager,
  readApplication,
  submitApplicationIx,
  type Manager,
  type Application,
} from "@/escrow/governance";
type Snapshot = {
  wallet: string;
  arb: Arbitrator | null;
  org: Organization | null;
  application: Application | null;
  manager: Manager | null;
  balance: string;
  deals: Deal[];
};
export function Admin() {
  const { t, locale } = useLanguage(),
    { who, connection } = useWallet();
  const confirmation = useConfirmation(who?.toBase58());
  const op = useOperation({
    actions: [
      "submit_application",
      "deposit_bond",
      "withdraw_bond",
      "accepting",
    ],
  });
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [error, setError] = useState<unknown>(null),
    [value, setValue] = useState("1"),
    [loaded, setLoaded] = useState(false);
  const { fresh, markFresh, markStale } = useFreshness();
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!who) return;
    const revision = ++generation.current;
    try {
      const c = connection();
      const [arb, org, application, manager] = await Promise.all([
        readArbitrator(c, who),
        readOrganization(c, who),
        readApplication(c, who),
        readManager(c),
      ]);
      const b = await c
        .getTokenAccountBalance(getAssociatedTokenAddressSync(MINT, who))
        .catch(() => null);
      if (revision !== generation.current) return;
      setSnapshot({
        wallet: who.toBase58(),
        arb,
        org,
        application,
        manager,
        balance: b ? amount(BigInt(b.value.amount)) : "—",
        deals: [],
      });
      setLoaded(true);
      setError(null);
      markFresh();
      const rows = await c
        .getProgramAccounts(PROGRAM_ID, {
          filters: [
            { dataSize: 876 },
            { memcmp: { offset: 72, bytes: who.toBase58() } },
          ],
        })
        .catch(() => []);
      const deals: Deal[] = [];
      for (const row of rows)
        try {
          deals.push(await decodeDeal(row.pubkey.toBase58(), row.account.data));
        } catch {}
      if (revision === generation.current)
        setSnapshot((old) =>
          old?.wallet === who.toBase58() ? { ...old, deals } : old,
        );
    } catch (e) {
      if (revision === generation.current) {
        setError(e);
        setLoaded(false);
        markStale();
      }
    }
  }, [who, connection, markFresh, markStale]);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    const first = setTimeout(() => {
      setLoaded(false);
      setValue("1");
      setSnapshot(null);
      void refresh();
    }, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 10000);
    return () => {
      invalidate();
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh, invalidate]);
  const data = snapshot?.wallet === who?.toBase58() ? snapshot : null;
  let input: bigint | null = null;
  try {
    input = parseAmount(value);
  } catch {}
  const register = () =>
    void op.run(
      async () => {
        if (!who) throw Error("WALLET_MISSING");
        const profile = await readArbitrator(connection(), who);
        return [
          ...(!profile ? [await registerIx(who)] : []),
          await submitApplicationIx(who),
        ];
      },
      refresh,
      { action: "submit_application" },
    );
  const bond = async (name: "deposit_bond" | "withdraw_bond") => {
    if (!fresh || !who) return;
    const n = parseAmount(value);
    if (
      !(await confirmation.ask(
        t(
          `${name === "deposit_bond" ? "Nạp vào quỹ cọc" : "Rút về ví của bạn"} ${amount(n)} USDC Devnet?`,
          `${name === "deposit_bond" ? "Deposit into your bond vault" : "Withdraw to your wallet"} ${amount(n)} Devnet USDC?`,
        ),
      ))
    )
      return;
    await op.run(async () => [await bondIx(name, who, n)], refresh, {
      action: name,
    });
  };
  return (
    <>
      {confirmation.dialog}
      <span className="eyebrow">ARBITRATOR · DEVNET</span>
      <h1>{t("Không gian trọng tài", "Arbitrator workspace")}</h1>
      <p className="lead">
        {t(
          "Đăng ký, nạp cọc và xử lý tranh chấp. Tiền mua hàng nằm trong vault của chương trình.",
          "Register, deposit bond and resolve disputes. Deal funds remain in the program vault.",
        )}
      </p>
      {!who && (
        <Notice>
          {t(
            "Kết nối ví trọng tài để bắt đầu.",
            "Connect your arbitrator wallet to begin.",
          )}
        </Notice>
      )}
      {error && <Notice error>{errorMessage(error, locale === "vi")}</Notice>}
      {who && (
        <button disabled={op.busy || !fresh} onClick={() => void refresh()}>
          {t("Tải lại", "Refresh")}
        </button>
      )}
      {who && !loaded && !error && (
        <p>{t("Đang đọc trạng thái ví…", "Reading wallet state…")}</p>
      )}
      {data && (
        <>
          {!data.manager && (
            <Notice>
              {t(
                "Chương trình đang được cập nhật. Chưa thể gửi yêu cầu mới.",
                "The program is being upgraded. New applications are unavailable.",
              )}
            </Notice>
          )}
          {data.manager && (
            <p className="small">
              {t("Ví duyệt registry:", "Registry manager:")}{" "}
              <code>
                {data.manager.authority.slice(0, 4)}…
                {data.manager.authority.slice(-4)}
              </code>
              {data.manager.authority === who?.toBase58() && (
                <>
                  {" "}
                  ·{" "}
                  <Link href="/manage">
                    {t("Mở quản trị", "Open management")}
                  </Link>
                </>
              )}
            </p>
          )}
          {!data.org?.approved ? (
            <section className="panel stack">
              <h2>{t("Đăng ký và chờ duyệt", "Registration and review")}</h2>
              <ol>
                <li>
                  {t(
                    "Bạn ký đăng ký bằng ví.",
                    "Sign registration with your wallet.",
                  )}
                </li>
                <li>
                  {t(
                    "Quản trị duyệt yêu cầu.",
                    "The manager reviews the application.",
                  )}
                </li>
                <li>
                  {t(
                    "Bạn nạp cọc và bật nhận deal.",
                    "Deposit bond and enable new deals.",
                  )}
                </li>
              </ol>
              {data.application?.status === "pending" ? (
                <Notice>
                  {t(
                    "Đã gửi yêu cầu. Chờ quản trị duyệt; chưa cần nạp cọc.",
                    "Application submitted. Await manager review; no deposit needed yet.",
                  )}
                </Notice>
              ) : (
                <>
                  {data.application?.status === "rejected" && (
                    <Notice error>
                      {t(
                        `Yêu cầu chưa được duyệt (mã ${data.application.reasonCode}). Trao đổi với quản trị rồi gửi lại.`,
                        `Application rejected (code ${data.application.reasonCode}). Contact the manager before reapplying.`,
                      )}
                    </Notice>
                  )}
                  <button
                    className="primary"
                    disabled={!data.manager || op.busy}
                    onClick={register}
                  >
                    {data.arb
                      ? t("Gửi yêu cầu duyệt", "Submit approval request")
                      : t("Đăng ký và gửi duyệt", "Register and apply")}
                  </button>
                </>
              )}
              <small>
                {t(
                  "Duyệt là allowlist, không phải xác thực danh tính hoặc KYC.",
                  "Approval is an allowlist, not identity verification or KYC.",
                )}
              </small>
            </section>
          ) : null}
          {data.arb && (
            <section className="panel stack">
              <h2>{t("Quỹ cọc trọng tài", "Arbitrator bond pool")}</h2>
              <div className="grid three">
                {[
                  [t("Tổng cọc", "Total bond"), data.arb.total],
                  [t("Đã dành cho deal", "Reserved"), data.arb.locked],
                  [
                    t("Còn khả dụng", "Available"),
                    data.arb.total - data.arb.locked,
                  ],
                ].map(([label, n]) => (
                  <div key={String(label)}>
                    <p>{String(label)}</p>
                    <strong className="amount">
                      {amount(n as bigint)} USDC
                    </strong>
                  </div>
                ))}
              </div>
              {data.org && (
                <Notice>
                  {data.org.accepting
                    ? t(
                        "Đang nhận deal mới. Không rút cọc khi đang nhận hoặc còn nghĩa vụ.",
                        "Accepting new deals. Withdrawals are locked while accepting or reserved.",
                      )
                    : data.org.approved
                      ? t(
                          "Đã duyệt. Nạp đủ cọc và ký bật nhận để xuất hiện trong form tạo deal.",
                          "Approved. Deposit enough bond and enable service to become available for deals.",
                        )
                      : t(
                          "Chưa được duyệt nhận deal mới.",
                          "Not approved for new deals.",
                        )}
                </Notice>
              )}
              <p className="small">
                {t("USDC trong ví:", "Wallet USDC:")} {data.balance}
                {data.org && (
                  <>
                    {" "}
                    · {t("Cọc tối thiểu:", "Minimum deposit:")}{" "}
                    {amount(data.org.minimumDeposit)} USDC
                  </>
                )}
              </p>
              <label>
                {t("Số tiền nạp/rút USDC", "Deposit/withdraw USDC amount")}
                <input
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </label>
              <div className="actions">
                {data.org?.approved && (
                  <button
                    className="primary"
                    disabled={op.busy || !fresh || !input}
                    onClick={() => bond("deposit_bond")}
                  >
                    {t("Nạp cọc", "Deposit bond")}
                  </button>
                )}
                {data.org?.approved && (
                  <button
                    className={data.org.accepting ? "" : "primary"}
                    disabled={
                      op.busy ||
                      !fresh ||
                      (!data.org.accepting &&
                        data.arb.total < data.org.minimumDeposit)
                    }
                    onClick={async () => {
                      if (
                        !data.org!.accepting &&
                        !(await confirmation.ask(
                          t(
                            `Bật nhận deal tối đa ${amount(data.org!.maximumDeal)} USDC? Hạn nạp/giao/kiểm/SLA: ${data.org!.times.join("/")} giây. Cọc không rút khi đang nhận hoặc còn nghĩa vụ.`,
                            `Enable deals up to ${amount(data.org!.maximumDeal)} USDC? Funding/delivery/review/SLA: ${data.org!.times.join("/")} seconds. Withdrawals remain locked while accepting or reserved.`,
                          ),
                        ))
                      )
                        return;
                      if (who)
                        void op.run(
                          async () => [
                            await organizationAcceptingIx(
                              who,
                              !data.org!.accepting,
                              data.org!,
                            ),
                          ],
                          refresh,
                          { action: "accepting" },
                        );
                    }}
                  >
                    {data.org.accepting
                      ? t("Ngừng nhận deal", "Pause new deals")
                      : t("Bật nhận deal", "Enable new deals")}
                  </button>
                )}
                <button
                  disabled={
                    op.busy ||
                    !fresh ||
                    !input ||
                    input > data.arb.total - data.arb.locked ||
                    (!!data.org && (data.org.accepting || data.arb.locked > 0n))
                  }
                  onClick={() => bond("withdraw_bond")}
                >
                  {t("Rút cọc", "Withdraw bond")}
                </button>
              </div>
              {data.org && (
                <details>
                  <summary>
                    {t("Điều kiện nhận trước", "Standing consent policy")}
                  </summary>
                  <p>
                    {t("Deal tối đa", "Maximum deal")}{" "}
                    {amount(data.org.maximumDeal)} USDC ·{" "}
                    {t(
                      "Giao hàng / kiểm tra / SLA trọng tài",
                      "Delivery / review / arbitration SLA",
                    )}
                    : {data.org.times.slice(1).join(" / ")}{" "}
                    {t("giây", "seconds")}
                  </p>
                  <p>
                    {t(
                      "Bật nhận là chấp thuận deal phù hợp policy mà không ký từng deal. Cọc chỉ bảo lưu capacity, không phải bảo hiểm hoặc phạt xử sai.",
                      "Enabling accepts eligible deals without per-deal signatures. Bond reserves capacity; it is not insurance or slashing.",
                    )}
                  </p>
                </details>
              )}
            </section>
          )}
          {op.feedback}
          <section className="panel">
            <h2>{t("Deal cần theo dõi", "Deals to follow")}</h2>
            {data.deals.length ? (
              data.deals
                .sort(
                  (a, b) =>
                    Number(b.state === "disputed") -
                    Number(a.state === "disputed"),
                )
                .map((d) => (
                  <Link
                    className="demo-link"
                    key={d.address}
                    href={`/deals/${d.address}`}
                  >
                    {amount(d.amount)} USDC · {t(...STATE_LABELS[d.state])}
                    <Address value={d.address} />
                  </Link>
                ))
            ) : (
              <p>
                {t(
                  "Chưa có deal hoặc chưa tải được danh sách. Bạn vẫn có thể mở link trực tiếp.",
                  "No deals or history unavailable. You can still open a deal link directly.",
                )}
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
