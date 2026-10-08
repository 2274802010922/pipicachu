"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { useLanguage } from "../i18n/provider";
import { useWallet } from "../wallet";
import { useFreshness } from "../hooks/use-freshness";
import { useOperation } from "../hooks/use-operation";
import { Notice, Address } from "../components/feedback";
import { useConfirmation } from "../components/confirmation";
import { errorMessage } from "../errors";
import {
  amount,
  parseAmount,
  listOrganizations,
  organizationApprovalIx,
  type Organization,
} from "@/escrow/client";
import {
  readManager,
  listApplications,
  approveApplicationIx,
  rejectApplicationIx,
  updatePolicyIx,
  policyBytes,
  managerActionIx,
  type Manager,
  type Application,
  type OrganizationPolicy,
} from "@/escrow/governance";
export function Manage() {
  const { who, connection } = useWallet(),
    { t, locale } = useLanguage(),
    confirmation = useConfirmation(who?.toBase58());
  const op = useOperation({
    actions: [
      "approve_application",
      "reject_application",
      "revoke",
      "update_policy",
      "propose_manager",
      "accept_manager",
    ],
  });
  const [manager, setManager] = useState<Manager | null>(null),
    [applications, setApplications] = useState<Application[]>([]),
    [organizations, setOrganizations] = useState<Organization[]>([]),
    [error, setError] = useState<unknown>(null),
    [loading, setLoading] = useState(true),
    [target, setTarget] = useState("");
  const [fields, setFields] = useState({
    minimum: "1",
    maximum: "10",
    funding: "1800",
    delivery: "1800",
    review: "300",
    sla: "1800",
  });
  const { fresh, markFresh, markStale } = useFreshness();
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++revision.current;
    try {
      const c = connection(),
        m = await readManager(c);
      const [apps, orgs] =
        m?.authority === who?.toBase58()
          ? await Promise.all([listApplications(c), listOrganizations(c)])
          : [[], []];
      if (version !== revision.current) return;
      setManager(m);
      setApplications(apps);
      setOrganizations(orgs);
      setError(null);
      markFresh();
    } catch (e) {
      if (version === revision.current) {
        setError(e);
        markStale();
      }
    } finally {
      if (version === revision.current) setLoading(false);
    }
  }, [who, connection, markFresh, markStale]);
  const invalidate = useCallback(() => {
    revision.current++;
  }, []);
  useEffect(() => {
    const first = setTimeout(() => {
        setLoading(true);
        setApplications([]);
        setOrganizations([]);
        setTarget("");
        void refresh();
      }, 0),
      timer = setInterval(() => {
        if (document.visibilityState === "visible") void refresh();
      }, 10000);
    return () => {
      invalidate();
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh, invalidate]);
  const authorized = !!who && manager?.authority === who.toBase58();
  const policy = (): OrganizationPolicy => ({
    minimum: parseAmount(fields.minimum),
    maximum: parseAmount(fields.maximum),
    times: [fields.funding, fields.delivery, fields.review, fields.sla].map(
      Number,
    ) as [number, number, number, number],
  });
  async function review(application: Application, approve: boolean) {
    if (!who || !authorized) return;
    if (
      !(await confirmation.ask(
        approve
          ? t(
              `Duyệt ví ${application.authority.slice(0, 4)}…${application.authority.slice(-4)}? Trọng tài vẫn phải tự nạp cọc và bật nhận.`,
              `Approve ${application.authority.slice(0, 4)}…${application.authority.slice(-4)}? The arbitrator must deposit bond and enable service.`,
            )
          : t(
              "Từ chối yêu cầu này? Chủ ví có thể gửi lại sau.",
              "Reject this application? Its owner may reapply later.",
            ),
      ))
    )
      return;
    await op.run(
      async () => [
        approve
          ? await approveApplicationIx(
              who,
              new PublicKey(application.authority),
              policy(),
            )
          : await rejectApplicationIx(
              who,
              new PublicKey(application.authority),
              1,
            ),
      ],
      refresh,
      { action: approve ? "approve_application" : "reject_application" },
    );
  }
  async function changeOrganization(
    org: Organization,
    action: "revoke" | "update_policy",
  ) {
    if (!who || !authorized) return;
    let nextPolicy: OrganizationPolicy | undefined;
    if (action === "update_policy") {
      try {
        nextPolicy = policy();
        policyBytes(nextPolicy);
      } catch (error) {
        setError(error);
        return;
      }
    }
    if (
      !(await confirmation.ask(
        action === "revoke"
          ? t(
              "Ngừng duyệt nhận deal mới? Deal đã nạp vẫn có thể kết thúc.",
              "Revoke new-deal approval? Funded deals can still settle.",
            )
          : t(
              `Cập nhật ${org.authority.slice(0, 4)}…${org.authority.slice(-4)}: cọc ${amount(nextPolicy!.minimum)}, deal tối đa ${amount(nextPolicy!.maximum)} USDC; hạn nạp/giao/kiểm tra/SLA ${nextPolicy!.times.join(" / ")} giây? Trọng tài phải tự bật nhận lại.`,
              `Update ${org.authority.slice(0, 4)}…${org.authority.slice(-4)}: bond ${amount(nextPolicy!.minimum)}, maximum ${amount(nextPolicy!.maximum)} USDC; funding/delivery/review/SLA ${nextPolicy!.times.join(" / ")} seconds? The arbitrator must enable service again.`,
            ),
      ))
    )
      return;
    await op.run(
      async () => [
        action === "revoke"
          ? await organizationApprovalIx(
              who,
              new PublicKey(org.authority),
              false,
            )
          : await updatePolicyIx(
              who,
              new PublicKey(org.authority),
              nextPolicy!,
            ),
      ],
      refresh,
      { action },
    );
  }
  return (
    <>
      {confirmation.dialog}
      <span className="eyebrow">REGISTRY MANAGER · DEVNET</span>
      <h1>{t("Quản trị trọng tài", "Arbitrator management")}</h1>
      <p className="lead">
        {t(
          "Duyệt danh sách và policy. Quyền này không cho rút tiền ký quỹ hoặc phán quyết thay trọng tài.",
          "Manage approvals and policy. This role cannot withdraw deal funds or replace the arbitrator’s ruling.",
        )}
      </p>
      {error && <Notice error>{errorMessage(error, locale === "vi")}</Notice>}
      {loading ? (
        <p>{t("Đang đọc quyền quản trị…", "Reading manager authority…")}</p>
      ) : !manager ? (
        <Notice>
          {t(
            "ManagerConfig chưa khởi tạo. Initializer cần hoàn tất triển khai Devnet.",
            "ManagerConfig is not initialized. The initializer must complete the Devnet rollout.",
          )}
        </Notice>
      ) : (
        <>
          <section className="panel">
            <h2>{t("Ví có quyền duyệt", "Approval authority")}</h2>
            <Address value={manager.authority} />
            {!authorized && (
              <Notice>
                {t(
                  "Kết nối đúng ví quản trị để duyệt yêu cầu.",
                  "Connect the manager wallet to review applications.",
                )}
              </Notice>
            )}
            {manager.pendingAuthority && (
              <>
                <p>{t("Chờ ví mới nhận quyền:", "Pending acceptance:")}</p>
                <Address value={manager.pendingAuthority} />
                {who?.toBase58() === manager.pendingAuthority && (
                  <button
                    className="primary"
                    disabled={op.busy || !fresh}
                    onClick={() =>
                      void op.run(
                        async () => [
                          await managerActionIx("accept_manager", who),
                        ],
                        refresh,
                        { action: "accept_manager" },
                      )
                    }
                  >
                    {t("Ký nhận quyền quản trị", "Accept manager authority")}
                  </button>
                )}
              </>
            )}
          </section>
          {authorized && (
            <>
              <details className="panel">
                <summary>
                  {t(
                    "Policy dùng khi duyệt và cập nhật",
                    "Approval and update policy",
                  )}
                </summary>
                <div className="grid">
                  {(
                    [
                      ["minimum", t("Cọc tối thiểu USDC", "Minimum bond USDC")],
                      ["maximum", t("Deal tối đa USDC", "Maximum deal USDC")],
                      [
                        "funding",
                        t("Hạn nạp (giây)", "Funding window (seconds)"),
                      ],
                      [
                        "delivery",
                        t("Hạn giao (giây)", "Delivery window (seconds)"),
                      ],
                      [
                        "review",
                        t("Hạn kiểm tra (giây)", "Review window (seconds)"),
                      ],
                      [
                        "sla",
                        t("SLA trọng tài (giây)", "Arbitration SLA (seconds)"),
                      ],
                    ] as const
                  ).map(([name, label]) => (
                    <label key={name}>
                      {label}
                      <input
                        inputMode={
                          name === "minimum" || name === "maximum"
                            ? "decimal"
                            : "numeric"
                        }
                        value={fields[name]}
                        onChange={(e) =>
                          setFields((old) => ({
                            ...old,
                            [name]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <small>
                  {t(
                    "Mặc định: cọc1, deal10 USDC; 30 phút /30 phút /5 phút /30 phút. Duyệt là allowlist, không phải KYC.",
                    "Defaults: bond1, deal10 USDC;30/30/5/30 minutes. Approval is an allowlist, not KYC.",
                  )}
                </small>
              </details>
              <section className="panel">
                <h2>{t("Yêu cầu chờ duyệt", "Pending applications")}</h2>
                {applications.some((a) => a.status === "pending") ? (
                  applications
                    .filter((a) => a.status === "pending")
                    .sort((a, b) => a.submittedAt - b.submittedAt)
                    .map((a) => (
                      <article className="application-row" key={a.address}>
                        <Address value={a.authority} />
                        <small>
                          {new Date(a.submittedAt * 1000).toLocaleString(
                            locale === "vi" ? "vi-VN" : "en-US",
                          )}
                        </small>
                        <div className="actions">
                          <button
                            className="primary"
                            disabled={op.busy || !fresh}
                            onClick={() => void review(a, true)}
                          >
                            {t("Duyệt", "Approve")}
                          </button>
                          <button
                            disabled={op.busy || !fresh}
                            onClick={() => void review(a, false)}
                          >
                            {t("Từ chối", "Reject")}
                          </button>
                        </div>
                      </article>
                    ))
                ) : (
                  <p>
                    {t("Chưa có yêu cầu đang chờ.", "No pending applications.")}
                  </p>
                )}
              </section>
              <section className="panel">
                <h2>{t("Trọng tài đã duyệt", "Approved arbitrators")}</h2>
                {organizations.map((org) => (
                  <article className="application-row" key={org.authority}>
                    <Address value={org.authority} />
                    <p>
                      {t("Deal tối đa", "Maximum deal")}{" "}
                      {amount(org.maximumDeal)} USDC ·{" "}
                      {org.accepting
                        ? t("Đang nhận", "Accepting")
                        : t("Ngừng nhận", "Paused")}
                    </p>
                    <p className="small">
                      {t(
                        `Policy trên chain: cọc ${amount(org.minimumDeposit)} USDC · Nạp/Giao/Kiểm tra/SLA ${org.times.join(" / ")} giây`,
                        `On-chain policy: bond ${amount(org.minimumDeposit)} USDC · Fund/Deliver/Review/SLA ${org.times.join(" / ")} seconds`,
                      )}
                    </p>
                    <div className="actions">
                      <button
                        disabled={op.busy || !fresh}
                        onClick={() => void changeOrganization(org, "revoke")}
                      >
                        {t("Ngừng duyệt deal mới", "Revoke new deals")}
                      </button>
                      <button
                        disabled={op.busy || !fresh || org.accepting}
                        onClick={() =>
                          void changeOrganization(org, "update_policy")
                        }
                      >
                        {t("Áp dụng policy ở trên", "Apply policy above")}
                      </button>
                    </div>
                  </article>
                ))}
              </section>
              <details className="panel">
                <summary>
                  {t("Chuyển quyền quản trị", "Transfer manager authority")}
                </summary>
                <p>
                  {t(
                    "Ví mới phải tự ký nhận quyền. Treasury và quyền nâng cấp chương trình không đổi.",
                    "The new wallet must sign acceptance. Treasury and program upgrade authority do not change.",
                  )}
                </p>
                <label>
                  {t("Ví quản trị mới", "New manager wallet")}
                  <input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                </label>
                <button
                  disabled={op.busy || !fresh || !target}
                  onClick={async () => {
                    if (
                      who &&
                      (await confirmation.ask(
                        t(
                          "Đề nghị chuyển quyền quản trị sang địa chỉ đã nhập?",
                          "Propose manager transfer to the entered address?",
                        ),
                      ))
                    )
                      void op.run(
                        async () => [
                          await managerActionIx(
                            "propose_manager",
                            who,
                            new PublicKey(target),
                          ),
                        ],
                        refresh,
                        { action: "propose_manager" },
                      );
                  }}
                >
                  {t("Đề nghị chuyển quyền", "Propose transfer")}
                </button>
              </details>
            </>
          )}
          {op.feedback}
        </>
      )}
    </>
  );
}
