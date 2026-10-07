"use client";
import { useState } from "react";
import type { Deal } from "@/escrow/client";
import {
  parseEvidence,
  verifyEvidence,
  type EvidenceEnvelope,
} from "@/escrow/evidence";
import { useLanguage } from "../i18n/provider";
import { Notice } from "./feedback";
export function downloadEvidence(envelope: EvidenceEnvelope) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `pipicachu-${envelope.body.kind}-${envelope.body.deal.slice(0, 8)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function EvidenceVerifier({ deal }: { deal: Deal }) {
  const { t } = useLanguage();
  const [envelope, setEnvelope] = useState<EvidenceEnvelope | null>(null),
    [message, setMessage] = useState(""),
    [matched, setMatched] = useState(false);
  return (
    <details className="panel disclosure">
      <summary>
        {t("Đối chiếu gói bằng chứng", "Verify evidence package")}
      </summary>
      <p className="small">
        {t(
          "File chỉ được đọc trên máy để đối chiếu hash. Không upload; không chứng minh chất lượng hàng. Gói tải về là plaintext.",
          "Files are checked locally against the commitment. No upload; no proof of goods quality. Downloaded packages are plaintext.",
        )}
      </p>
      {deal.resolutionPolicyVersion !== 1 ? (
        <Notice>
          {t(
            "Deal cũ dùng hash ghi chú; chưa hỗ trợ verifier gói v1.",
            "This legacy deal uses note hashes; v1 package verification is unsupported.",
          )}
        </Notice>
      ) : (
        <label>
          {t("Chọn gói JSON đã được gửi", "Select the shared JSON package")}
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              setMatched(false);
              setEnvelope(null);
              setMessage("");
              try {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 65536) throw Error();
                const p = parseEvidence(await f.text()),
                  result = await verifyEvidence(p, deal);
                setEnvelope(p);
                setMatched(result.valid);
                setMessage(
                  result.valid
                    ? t(
                        "Khớp commitment và vai trò trên deal.",
                        "Matches the deal commitment and role.",
                      )
                    : t(
                        `Chưa khớp bằng chứng (${result.reason}). Không dùng để kết luận đã giao đúng hàng.`,
                        `Evidence does not match (${result.reason}). Do not treat it as proof of delivery.`,
                      ),
                );
              } catch {
                setMessage(
                  t(
                    "Gói không hợp lệ hoặc vượt 64 KiB.",
                    "Invalid package or larger than 64 KiB.",
                  ),
                );
              }
            }}
          />
        </label>
      )}
      {message && <Notice error={!matched}>{message}</Notice>}
      {envelope && (
        <>
          <p className="terms-text">{envelope.body.note}</p>
          <small>
            {t("Thời gian do tác giả khai:", "Author-declared time:")}{" "}
            {envelope.body.createdAt}
          </small>
          <ul>
            {envelope.body.files.map((f) => (
              <li key={f.name}>
                {f.name} · {f.size} bytes ·{" "}
                <code className="address">{f.sha256}</code>
              </li>
            ))}
          </ul>
        </>
      )}
    </details>
  );
}
