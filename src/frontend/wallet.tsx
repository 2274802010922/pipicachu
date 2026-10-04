"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { useLanguage } from "./i18n/provider";
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
  send: (tx: Transaction) => Promise<string>;
  connection: () => Connection;
}>({
  who: null,
  connect: async () => {},
  disconnect: async () => {},
  send: async () => "",
  connection: () => new Connection("http://localhost/api/rpc"),
});
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [who, setWho] = useState<PublicKey | null>(null);
  const connection = useCallback(
    () =>
      new Connection(`${location.origin}/api/rpc`, {
        commitment: "confirmed",
        disableRetryOnRateLimit: true,
        wsEndpoint: "wss://api.devnet.solana.com",
      }),
    [],
  );
  useEffect(() => {
    const p = window.phantom?.solana;
    if (!p) return;
    const change = (pub: PublicKey | null) =>
      setWho(pub ? new PublicKey(pub.toBase58()) : null);
    const reset = () => setWho(null);
    p.on("accountChanged", change);
    p.on("disconnect", reset);
    return () => {
      p.removeListener("accountChanged", change);
      p.removeListener("disconnect", reset);
    };
  }, []);
  async function connect() {
    const p = window.phantom?.solana;
    if (!p) throw new Error("WALLET_MISSING");
    setWho(new PublicKey((await p.connect()).publicKey.toBase58()));
  }
  async function disconnect() {
    await window.phantom?.solana?.disconnect();
    setWho(null);
  }
  async function send(tx: Transaction) {
    const p = window.phantom?.solana;
    if (!p || !who) throw new Error("WALLET_MISSING");
    const c = connection();
    if (
      (await c.getGenesisHash()) !==
      "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
    )
      throw new Error("RPC_NETWORK_MISMATCH");
    const latest = await c.getLatestBlockhash();
    tx.feePayer = who;
    tx.recentBlockhash = latest.blockhash;
    const simulation = await c.simulateTransaction(tx);
    if (simulation.value.err) throw new Error("SIMULATION_FAILED");
    const message = tx.serializeMessage();
    let signed: Transaction;
    try {
      signed = await p.signTransaction(tx);
    } catch {
      throw new Error("WALLET_REJECTED");
    }
    if (!p.publicKey?.equals(who) || !signed.serializeMessage().equals(message))
      throw new Error("WALLET_CHANGED");
    const signature = bs58.encode(signed.signature!);
    const bytes = signed.serialize();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await c.sendRawTransaction(bytes);
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    }
    // Poll over HTTP: avoid relying on browser websocket connectivity.
    for (let attempt = 0; attempt < 45; attempt++) {
      let status;
      try {
        status = (await c.getSignatureStatuses([signature])).value[0];
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        continue;
      }
      if (status?.err) throw new Error("TRANSACTION_FAILED");
      if (status?.confirmationStatus === "finalized") return signature;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error(`PENDING:${signature}`);
  }
  return (
    <Context.Provider value={{ who, connect, disconnect, send, connection }}>
      {children}
    </Context.Provider>
  );
}
export const useWallet = () => useContext(Context);
export function WalletButton() {
  const { t } = useLanguage();
  const { who, connect, disconnect } = useWallet();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="wallet-control">
      <button
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
      {error && (
        <span role="alert" className="small">
          {error}
        </span>
      )}
    </div>
  );
}
