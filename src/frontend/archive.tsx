"use client";
import { useEffect, useState } from "react";
import type { Analysis } from "@/shared/types";
import { Analyzer } from "./analyzer";
import { Notice } from "./components/ui";
import { useLanguage } from "./i18n/provider";
export function ArchiveViewer({ id }: { id: string }) {
  const { t } = useLanguage();
  const [a, setA] = useState<Analysis | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/demo/example?id=${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setA(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [id]);
  return (
    <section className="page">
      <h1>{t("Ví dụ từ bản lưu trước", "Archived example")}</h1>
      <Notice>
        {t(
          "Đây là snapshot của giao dịch thật đã đọc trước. Không phải lần đọc live hiện tại; đối chiếu thanh toán ở chế độ này bị tắt.",
          "This is a previously captured real transaction, not a current live read. Payment comparison is disabled in this mode.",
        )}
      </Notice>
      {a ? (
        <Analyzer
          initial={a.signature}
          initialNetwork={a.network}
          initialArchive={a}
        />
      ) : error ? (
        <Notice kind="error">
          {t(
            "Không có bản lưu mẫu này.",
            "This archived example is unavailable.",
          )}
        </Notice>
      ) : (
        <p role="status">{t("Đang mở bản lưu…", "Loading snapshot…")}</p>
      )}
    </section>
  );
}
