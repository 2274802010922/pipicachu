"use client";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n/provider";
export function useConfirmation() {
  const { t } = useLanguage();
  const [message, setMessage] = useState<string | null>(null);
  const element = useRef<HTMLDialogElement>(null);
  const resolve = useRef<((accepted: boolean) => void) | null>(null);
  useEffect(() => {
    if (message && !element.current?.open) element.current?.showModal();
  }, [message]);
  useEffect(() => () => resolve.current?.(false), []);
  function finish(accepted: boolean) {
    const done = resolve.current;
    resolve.current = null;
    element.current?.close();
    setMessage(null);
    done?.(accepted);
  }
  return {
    ask: (text: string) =>
      new Promise<boolean>((done) => {
        resolve.current?.(false);
        resolve.current = done;
        setMessage(text);
      }),
    dialog: (
      <dialog
        ref={element}
        className="confirmation-dialog"
        aria-labelledby="confirmation-title"
        onCancel={(event) => {
          event.preventDefault();
          finish(false);
        }}
      >
        <h2 id="confirmation-title">
          {t("Kiểm tra trước khi ký", "Review before signing")}
        </h2>
        <p>{message}</p>
        <div className="actions">
          <button onClick={() => finish(false)}>
            {t("Quay lại", "Go back")}
          </button>
          <button className="primary" onClick={() => finish(true)}>
            {t("Xác nhận và ký", "Confirm and sign")}
          </button>
        </div>
      </dialog>
    ),
  };
}
