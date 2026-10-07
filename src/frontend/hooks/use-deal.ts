"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PublicKey, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import {
  readDeal,
  readArbitrator,
  readOrganization,
  type Deal,
  type Organization,
  type Arbitrator,
} from "@/escrow/client";
import { useWallet } from "../wallet";
import { useLanguage } from "../i18n/provider";
import { errorMessage } from "../errors";
export function useDeal(id: string) {
  const { connection, who } = useWallet(),
    { locale } = useLanguage();
  const [deal, setDeal] = useState<Deal | null>(null),
    [organization, setOrganization] = useState<Organization | null>(null),
    [profile, setProfile] = useState<Arbitrator | null | undefined>(undefined);
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [chainTime, setChainTime] = useState(0),
    [readAt, setReadAt] = useState(0),
    [elapsed, setElapsed] = useState(0),
    [receipts, setReceipts] = useState<
      { signature: string; err: unknown; confirmationStatus?: string }[]
    >([]);
  const generation = useRef(0),
    monotonic = useRef(0);
  const refresh = useCallback(async () => {
    const revision = ++generation.current;
    try {
      const c = connection(),
        d = await readDeal(c, id, "finalized");
      const [arb, org, clock] = await Promise.all([
        d.state === "created"
          ? readArbitrator(c, new PublicKey(d.arbitrator)).catch(
              () => undefined,
            )
          : undefined,
        d.workflowVersion === 1
          ? readOrganization(c, new PublicKey(d.arbitrator))
          : null,
        c.getAccountInfo(SYSVAR_CLOCK_PUBKEY),
      ]);
      const time =
        clock?.data.length === 40
          ? Number(clock.data.readBigInt64LE(32))
          : await c.getBlockTime(await c.getSlot());
      if (time === null || !Number.isSafeInteger(time))
        throw Error("RPC_UNAVAILABLE");
      if (revision !== generation.current) return;
      setDeal(d);
      setProfile(arb);
      setOrganization(org);
      setChainTime(time);
      monotonic.current = performance.now();
      setElapsed(0);
      setReadAt(Date.now());
      setError("");
      setLoading(false);
      const history = await c
        .getSignaturesForAddress(new PublicKey(id), { limit: 10 })
        .catch(() => []);
      if (revision === generation.current) setReceipts(history);
    } catch (e) {
      if (revision !== generation.current) return;
      setError(errorMessage(e, locale === "vi"));
      setReadAt(0);
      setProfile(undefined);
      setDeal((old) => (old?.address === id ? old : null));
      setLoading(false);
    }
  }, [id, connection, locale]);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0),
      poll = setInterval(() => {
        if (document.visibilityState === "visible") void refresh();
      }, 10000);
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      invalidate();
      clearTimeout(first);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh, who, invalidate]);
  useEffect(() => {
    const timer = setInterval(
      () =>
        setElapsed(
          monotonic.current ? performance.now() - monotonic.current : 0,
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  return {
    deal,
    organization,
    arbitratorProfile: profile,
    error,
    loading,
    readAt,
    fresh: readAt > 0 && elapsed < 20000,
    now: chainTime + Math.min(20, Math.max(0, Math.floor(elapsed / 1000))),
    receipts,
    refresh,
  };
}
