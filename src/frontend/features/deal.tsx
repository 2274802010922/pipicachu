"use client";
import { useLanguage } from "../i18n/provider";
import { useDealController } from "../hooks/use-deal-controller";
import { Notice, Receipt } from "../components/feedback";
import { STATE_LABELS, ACTION_LABELS } from "../shared-escrow";
import { DealProgress } from "../components/deal-progress";
import { BondStep } from "../components/bond-step";
import { DealDetails } from "../components/deal-details";
import { feeBreakdown } from "@/escrow/fees";
import { bondReadiness } from "@/escrow/bond";
import keeperConfig from "@/escrow/keeper-config.json";
import { amount } from "@/escrow/client";

export function DealView({ id }: { id: string }) {
  const { t } = useLanguage();
  const {
    deal,
    organizationReady,
    arbitratorProfile,
    error,
    loading,
    readAt,
    fresh,
    receipts,
    refresh,
    who,
    confirmation,
    op,
    bondOp,
    evidence,
    setEvidence,
    complaintOpen,
    copy,
    setCopy,
    vm,
    available,
    waitingForKeeper,
    prepareBond,
    execute,
  } = useDealController(id);
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
                        deal.state === "disputed"
                          ? "Lý do phán quyết"
                          : complaintOpen
                            ? "Lý do khiếu nại"
                            : "Ghi chú bàn giao",
                        deal.state === "disputed"
                          ? "Ruling reason"
                          : complaintOpen
                            ? "Dispute reason"
                            : "Delivery note",
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
                        "Gửi hàng và bằng chứng qua kênh đã thỏa thuận.",
                        "Share goods and evidence through the agreed channel.",
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
      <DealDetails deal={deal} deadline={deadline} receipts={receipts} />
    </>
  );
}
