"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { useLanguage } from "./i18n/provider";
import {
  submitWalletOperation,
  trackOperation,
  isUnresolved,
  type Operation,
  type OperationMeta,
} from "@/escrow/operation";
import { RECOVERY_KEY, loadRecovery } from "@/escrow/recovery";
type Phantom = {
  publicKey: PublicKey | null;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (t: Transaction) => Promise<Transaction>;
  on: (e: string, cb: (p: PublicKey | null) => void) => void;
  removeListener: (e: string, cb: (p: PublicKey | null) => void) => void;
};
declare global {
  interface Window {
    phantom?: { solana?: Phantom };
  }
}
const Context = createContext<{
  who: PublicKey | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  send: (tx: Transaction, meta?: OperationMeta) => Promise<string>;
  operation: Operation | null;
  otherPending: Operation[];
  resume: () => Promise<void>;
  connection: () => Connection;
}>({
  who: null,
  connect: async () => {},
  disconnect: async () => {},
  send: async () => "",
  operation: null,
  otherPending: [],
  resume: async () => {},
  connection: () => new Connection("http://localhost/api/rpc"),
});
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [who, setWho] = useState<PublicKey | null>(null);
  const [operations, setOperations] = useState<Record<string, Operation>>({});
  const operationsRef = useRef<Record<string, Operation>>({}),
    whoRef = useRef<PublicKey | null>(null),
    tracking = useRef(new Set<string>()),
    rpc = useRef<Connection | null>(null);
  const updateOperation = useCallback((next: Operation) => {
    const active = operationsRef.current[next.owner];
    if (active && active.id !== next.id && next.phase !== "checking") return;
    operationsRef.current[next.owner] = next;
    setOperations((current) => ({ ...current, [next.owner]: next }));
    try {
      if (next.owner === whoRef.current?.toBase58()) {
        if (isUnresolved(next) && next.signature)
          sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(next));
        else sessionStorage.removeItem(RECOVERY_KEY);
      }
    } catch {}
  }, []);
  const changeWallet = useCallback((pub: PublicKey | null) => {
    if (
      whoRef.current?.toBase58() !== pub?.toBase58() &&
      !isUnresolved(
        operationsRef.current[pub?.toBase58() || ""] ||
          ({ phase: "finalized" } as Operation),
      )
    )
      try {
        sessionStorage.removeItem(RECOVERY_KEY);
      } catch {}
    whoRef.current = pub;
    setWho(pub);
  }, []);

  const connection = useCallback(() => {
    if (!rpc.current)
      rpc.current = new Connection(location.origin + "/api/rpc", {
        commitment: "confirmed",
        disableRetryOnRateLimit: true,
        wsEndpoint: "wss://api.devnet.solana.com",
      });
    return rpc.current;
  }, []);
  useEffect(() => {
    const p = window.phantom?.solana;
    if (!p) return;
    const change = (pub: PublicKey | null) =>
      changeWallet(pub ? new PublicKey(pub.toBase58()) : null);
    const reset = () => changeWallet(null);
    p.on("accountChanged", change);
    p.on("disconnect", reset);
    return () => {
      p.removeListener("accountChanged", change);
      p.removeListener("disconnect", reset);
    };
  }, [changeWallet]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const pending = loadRecovery(sessionStorage.getItem(RECOVERY_KEY));
        if (pending) {
          operationsRef.current[pending.owner] = pending;
          setOperations((current) => ({
            ...current,
            [pending.owner]: pending,
          }));
        } else sessionStorage.removeItem(RECOVERY_KEY);
      } catch {
        sessionStorage.removeItem(RECOVERY_KEY);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  async function connect() {
    const p = window.phantom?.solana;
    if (!p) throw new Error("WALLET_MISSING");
    changeWallet(new PublicKey((await p.connect()).publicKey.toBase58()));
  }
  async function disconnect() {
    await window.phantom?.solana?.disconnect();
    changeWallet(null);
  }
  const resume = useCallback(async () => {
    const pending = operationsRef.current[whoRef.current?.toBase58() || ""];
    if (
      !pending?.signature ||
      !isUnresolved(pending) ||
      tracking.current.has(pending.id)
    )
      return;
    tracking.current.add(pending.id);
    try {
      await trackOperation(connection(), pending, updateOperation);
    } catch {
    } finally {
      tracking.current.delete(pending.id);
    }
  }, [connection, updateOperation]);
  async function send(tx: Transaction, meta?: OperationMeta) {
    const p = window.phantom?.solana;
    if (!p || !who) throw Error("WALLET_MISSING");
    const pending = operationsRef.current[whoRef.current?.toBase58() || ""];
    if (pending?.owner === who.toBase58() && isUnresolved(pending))
      throw Error(`PENDING:${pending.signature || ""}`);
    return submitWalletOperation({
      connection: connection(),
      wallet: who,
      tx,
      sign: (t) => p.signTransaction(t),
      currentWallet: () => p.publicKey,
      onUpdate: updateOperation,
      meta,
    });
  }
  useEffect(() => {
    const pending = operationsRef.current[whoRef.current?.toBase58() || ""];
    if (
      !pending?.signature ||
      !isUnresolved(pending) ||
      pending.owner !== who?.toBase58()
    )
      return;
    void resume();
  }, [who, connection, updateOperation, resume]);
  return (
    <Context.Provider
      value={{
        who,
        connect,
        disconnect,
        send,
        connection,
        operation: who ? operations[who.toBase58()] || null : null,
        otherPending: Object.values(operations).filter(
          (item) =>
            item.owner !== who?.toBase58() &&
            !!item.signature &&
            isUnresolved(item),
        ),
        resume,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useWallet = () => useContext(Context);
export function WalletButton() {
  const { t } = useLanguage();
  const { who, connect, disconnect, otherPending } = useWallet();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="wallet-control">
      <button
        className={who ? "wallet-connected" : "primary wallet-connect"}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            if (who) await disconnect();
            else await connect();
          } catch {
            setError(
              t(
                "Mở bằng trình duyệt có Phantom và cho phép kết nối.",
                "Open in a browser with Phantom and approve connection.",
              ),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? t("Đang kết nối…", "Connecting…")
          : who
            ? `${who.toBase58().slice(0, 4)}…${who.toBase58().slice(-4)} · ${t("Ngắt", "Disconnect")}`
            : t("Kết nối ví", "Connect wallet")}
      </button>
      {otherPending.map((item) => (
        <span key={item.id} className="small" role="status">
          {t(
            "Thao tác chưa chốt của ví trước:",
            "Unresolved action for previous wallet:",
          )}{" "}
          {item.owner.slice(0, 4)}…{item.owner.slice(-4)}
        </span>
      ))}
      {error && (
        <span role="alert" className="small">
          {error}
        </span>
      )}
    </div>
  );
}
