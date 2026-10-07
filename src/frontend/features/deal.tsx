"use client";
import {
  createEvidence,
  type EvidenceEnvelope,
  type EvidenceKind,
} from "@/escrow/evidence";
import { EvidenceVerifier, downloadEvidence } from "../components/evidence";
import { Buffer } from "buffer";
import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useLanguage } from "../i18n/provider";
import { useWallet } from "../wallet";
import { useOperation } from "../hooks/use-operation";
import { useDeal } from "../hooks/use-deal";
import { Notice, Address, Receipt } from "../components/feedback";
import { STATE_LABELS, ACTION_LABELS } from "../shared-escrow";
import { useConfirmation } from "../components/confirmation";
import { DealProgress } from "../components/deal-progress";
import { BondStep } from "../components/bond-step";
import { dealViewModel } from "@/escrow/view-model";
import { feeBreakdown } from "@/escrow/fees";
import { bondReadiness } from "@/escrow/bond";
import keeperConfig from "@/escrow/keeper-config.json";
import {
  amount,
  act,
  bondIx,
  readDeal,
  readArbitrator,
  fundIx,
  digest,
  settleIxs,
  vaultAddress,
} from "@/escrow/client";
function vaultAddressFor(id: string) {
  return vaultAddress(new PublicKey(id)).toBase58();
}
export function DealView({ id }: { id: string }) {
  const { t, locale } = useLanguage();
  const { who, connection } = useWallet();
  const confirmation = useConfirmation(`${id}:${who?.toBase58()}`);
  const op = useOperation({
    dealAddress: id,
    excludeActions: ["prepare_bond"],
  });
  const bondOp = useOperation({ action: "prepare_bond", dealAddress: id });
  const {
    deal,
    organization,
    arbitratorProfile,
    error,
    loading,
    readAt,
    fresh,
    now: networkNow,
    receipts,
    refresh,
  } = useDeal(id);
  const [files, setFiles] = useState<File[]>([]),
    [prepared, setPrepared] = useState<EvidenceEnvelope | null>(null);
  const [evidence, setEvidence] = useState(""),
    [complaintOpen, setComplaintOpen] = useState(false),
    [copy, setCopy] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setEvidence("");
      setFiles([]);
      setPrepared(null);
      setComplaintOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [who, id]);
  const organizationReady =
    !!deal &&
    (deal.workflowVersion !== 1 ||
      (!!organization?.approved &&
        organization.accepting &&
        !!arbitratorProfile &&
        arbitratorProfile.total >= organization.minimumDeposit &&
        deal.amount <= organization.maximumDeal));
  const vm = deal
    ? dealViewModel(deal, who?.toBase58() || null, networkNow, {
        fresh,
        bondReady: !!bondReadiness(deal.bond, arbitratorProfile)?.ready,
        organizationReady,
        busy: false,
      })
    : null;
  const available =
    vm?.available.filter((n) => n !== "finalize" && n !== "accept_deal") || [];
  const waitingForKeeper = vm?.waitingForKeeper || false;
  async function prepareBond(maxMissing: bigint) {
    if (!deal || !who || who.toBase58() !== deal.arbitrator) return;
    await bondOp.run(
      async () => {
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
      },
      refresh,
      { action: "prepare_bond", dealAddress: id },
    );
  }
  async function commitment(kind: EvidenceKind) {
    if (!deal || !who || !evidence.trim()) throw Error("INVALID_TERMS");
    if (deal.resolutionPolicyVersion !== 1) return digest(evidence);
    const pkg = await createEvidence({
      deal: id,
      kind,
      author: who.toBase58(),
      note: evidence,
      files,
    });
    setPrepared(pkg);
    downloadEvidence(pkg);
    return Buffer.from(pkg.commitment, "hex");
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
        "finalize",
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
                `Hoàn người mua ${amount(deal.amount)} USDC, không thu phí. Xác nhận?`,
                `Refund buyer ${amount(deal.amount)} USDC without fees. Confirm?`,
              )
            : t(
                `Trả người bán ${amount(f.sellerNet)} USDC; trọng tài ${amount(f.arbitratorFee)}, hệ thống ${amount(f.platformFee)}. Không thể hoàn tác. Xác nhận?`,
                `Pay seller ${amount(f.sellerNet)} USDC; arbitrator ${amount(f.arbitratorFee)}, platform ${amount(f.platformFee)}. Irreversible. Confirm?`,
              );
      if (!(await confirmation.ask(text))) return;
    }
    if (!deal || !who || !fresh) return;
    await op.run(
      async () => {
        const actor = who,
          d = new PublicKey(id);
        if (name === "fund") {
          if (
            !(await confirmation.ask(
              deal.resolutionPolicyVersion === 1
                ? t(
                    `Nạp ${amount(deal.amount)} USDC vào quỹ? Trọng tài được xử sau hạn SLA. Cọc không phải bảo hiểm; bỏ xử và hai bên bất đồng có thể khóa tiền.`,
                    `Deposit ${amount(deal.amount)} USDC into escrow? The arbitrator may rule past the SLA. Bond is not insurance; abandonment without mutual agreement may lock funds.`,
                  )
                : t(
                    `Nạp ${amount(deal.amount)} USDC theo điều kiện deal cũ?`,
                    `Deposit ${amount(deal.amount)} USDC under the legacy terms?`,
                  ),
            ))
          )
            throw Object.assign(Error("WALLET_REJECTED"), { code: 4001 });
          return [await fundIx(actor, deal)];
        }
        if (name === "deliver" || name === "dispute") {
          if (!evidence.trim()) throw new Error("INVALID_TERMS");
          return [
            await act(
              name,
              actor,
              d,
              await commitment(name === "deliver" ? "delivery" : "dispute"),
            ),
          ];
        }
        if (name === "resolve_seller" || name === "resolve_buyer") {
          if (!evidence.trim()) throw new Error("INVALID_TERMS");
          return settleIxs(
            "resolve",
            actor,
            deal,
            Buffer.concat([
              Buffer.from([name === "resolve_seller" ? 1 : 0]),
              await commitment("resolution"),
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
          [
            "confirm",
            "finalize",
            "refund_expired",
            "accept_settlement",
          ].includes(name)
        )
          return settleIxs(name, actor, deal, undefined, connection());
        return [await act(name, actor, d)];
      },
      refresh,
      { action: name, dealAddress: id },
    );
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
  const readiness = fresh ? bondReadiness(deal.bond, arbitratorProfile) : null;
  const bondReady = organizationReady && !!readiness?.ready;
  const step = vm!.step;
  const terminal = ["completed", "refunded", "cancelled"].includes(deal.state);
  const deadline = vm!.deadline;
  const expired = vm!.expired;
  const remaining = vm!.remaining;
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
              ? vm!.lateArbitration
                ? t("Trọng tài xử quá hạn SLA", "Arbitration past SLA")
                : t(
                    "Hai bên thống nhất phương án",
                    "Parties agree on settlement",
                  )
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
  const actorLabels = {
    buyer: t("người mua", "the buyer"),
    seller: t("người bán", "the seller"),
    arbitrator: t("trọng tài", "the arbitrator"),
    keeper: t("dịch vụ giải ngân", "release service"),
    anyone: t("người tham gia", "a participant"),
  };
  const primaryOwner = vm!.nextActor
    ? actorLabels[vm!.nextActor]
    : t("cập nhật trạng thái", "state refresh");
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
      {!fresh && (
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
          fresh={fresh}
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
                      : deal.state === "created" && deal.workflowVersion === 1
                        ? t(
                            "Chờ người mua nạp tiền vào quỹ",
                            "Waiting for the buyer to fund escrow",
                          )
                        : t(
                            `Chờ ${primaryOwner}`,
                            `Waiting for ${primaryOwner}`,
                          )}
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
              {requiresEvidence &&
                (deal.state !== "delivered" || complaintOpen) &&
                deal.resolutionPolicyVersion === 1 && (
                  <details>
                    <summary>
                      {t(
                        "File đính kèm trong bằng chứng (tùy chọn)",
                        "Evidence file manifest (optional)",
                      )}
                    </summary>
                    <label>
                      {t(
                        "Chọn file để tính hash, không upload",
                        "Select files to hash, no upload",
                      )}
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setFiles([...(e.target.files || [])])}
                      />
                    </label>
                    <small>
                      {t(
                        "Tối đa20 file/tổng50 MiB. Nội dung trao qua chat; gói tải về là plaintext.",
                        "Up to20 files/50 MiB total. Share content separately; downloaded packages are plaintext.",
                      )}
                    </small>
                  </details>
                )}
              {prepared && (
                <Notice>
                  {t(
                    "Gói bằng chứng đã được tạo trên máy. Tải lại nếu trình duyệt chưa lưu; gói chưa có nghĩa giao dịch đã hoàn tất.",
                    "Evidence package generated locally. Download again if needed; this alone does not mean the transaction completed.",
                  )}{" "}
                  <button
                    type="button"
                    onClick={() => downloadEvidence(prepared)}
                  >
                    {t("Tải gói JSON", "Download JSON")}
                  </button>
                </Notice>
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
      {vm!.manualFinalize && (
        <details className="panel disclosure">
          <summary>{t("Khôi phục giải ngân", "Release recovery")}</summary>
          <p>
            {t(
              "Bạn có thể tự gửi lệnh khi hết hạn mà không có khiếu nại. Chỉ trả phí SOL mạng; người nhận và phí dịch vụ giữ nguyên.",
              "You may submit release after the undisputed review deadline. Network SOL fees apply; recipients and service fees remain unchanged.",
            )}
          </p>
          <button disabled={op.busy} onClick={() => void execute("finalize")}>
            {t("Tự gửi lệnh giải ngân", "Submit release now")}
          </button>
        </details>
      )}
      <div className="deal-tools">
        <button onClick={() => void copyLink()}>
          {t("Sao chép link deal", "Copy deal link")}
        </button>
        {receipts.find(
          (r) => !r.err && r.confirmationStatus === "finalized",
        ) && (
          <Receipt
            signature={
              receipts.find(
                (r) => !r.err && r.confirmationStatus === "finalized",
              )!.signature
            }
          />
        )}
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
      <EvidenceVerifier
        key={`${deal.address}:${who?.toBase58() || "viewer"}`}
        deal={deal}
      />
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
