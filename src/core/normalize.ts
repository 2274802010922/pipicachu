import type {
  Analysis,
  Asset,
  BalanceChange,
  Finality,
  Movement,
  Network,
} from "../shared/types";
import {
  ATA,
  COMPUTE,
  DECODER_VERSION,
  JUPITER,
  MEMO,
  SAFE_PROGRAMS,
  SYSTEM,
  TOKEN,
  TOKEN2022,
  USDC,
  WSOL,
} from "../solana/constants";
import { AppError } from "../shared/errors";
type Obj = Record<string, unknown>;
const obj = (x: unknown): Obj =>
  x !== null && typeof x === "object" && !Array.isArray(x) ? (x as Obj) : {};
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const str = (x: unknown): string | null => (typeof x === "string" ? x : null);
function integer(x: unknown): bigint | null {
  if (typeof x === "bigint") return x;
  if (typeof x === "number" && Number.isSafeInteger(x)) return BigInt(x);
  if (typeof x === "string" && /^-?\d+$/.test(x)) return BigInt(x);
  return null;
}
const index = (x: unknown): number | null => {
  const n = integer(x);
  return n !== null && n >= 0n && n <= 10000n ? Number(n) : null;
};
interface TokenInfo {
  mint: string;
  owner: string | null;
  decimals: number;
  amount: bigint;
  conflict?: boolean;
}
export function normalizeTransaction(
  signature: string,
  network: Network,
  raw: unknown,
  status: unknown,
  source: "live" | "archive" = "live",
): Analysis {
  const state = obj(status),
    finality = (
      ["processed", "confirmed", "finalized"].includes(
        String(state.confirmationStatus),
      )
        ? String(state.confirmationStatus)
        : "unknown"
    ) as Finality;
  const base: Analysis = {
    signature,
    network,
    state: raw ? "unknown" : finality !== "unknown" ? "pending" : "unknown",
    finality,
    slot: null,
    blockTime: null,
    feeAtomic: null,
    feePayer: null,
    error: null,
    movements: [],
    balances: [],
    programs: [],
    category: "other",
    completeness: "partial",
    warnings: [],
    source,
    observedAt: new Date().toISOString(),
    decoderVersion: DECODER_VERSION,
  };
  if (!raw)
    return {
      ...base,
      error: state.err ? "TRANSACTION_FAILED" : null,
      state: state.err ? "failed" : base.state,
      warnings: ["transaction-data-unavailable"],
    };
  const tx = obj(raw),
    meta = obj(tx.meta),
    transaction = obj(tx.transaction),
    message = obj(transaction.message);
  if (
    arr(transaction.signatures)[0] !== signature ||
    !arr(message.accountKeys).length
  )
    throw new AppError("RPC_INVALID_DATA", 502);
  if (
    tx.version !== undefined &&
    tx.version !== "legacy" &&
    integer(tx.version) !== 0n
  )
    throw new AppError("UNSUPPORTED_VERSION", 422);
  if (tx.meta === null || tx.meta === undefined || !("err" in meta))
    return { ...base, warnings: ["transaction-metadata-unavailable"] };
  const keys = arr(message.accountKeys).map(
    (k) => str(k) ?? str(obj(k).pubkey),
  );
  if (keys.some((k) => !k)) throw new AppError("RPC_INVALID_DATA", 502);
  const fee = integer(meta.fee),
    time = integer(tx.blockTime);
  const a: Analysis = {
    ...base,
    state: meta.err === null ? "success" : "failed",
    slot: integer(tx.slot)?.toString() ?? null,
    blockTime: time === null ? null : Number(time),
    feeAtomic: fee?.toString() ?? null,
    feePayer: keys[0],
    error: meta.err === null ? null : errorLabel(meta.err),
    completeness: "full",
  };
  const warn = (code: string) => {
    if (!a.warnings.includes(code)) a.warnings.push(code);
    a.completeness = "partial";
  };
  if (fee === null || fee < 0n) warn("fee-unavailable");
  const tokenPre = new Map<string, TokenInfo>(),
    tokenPost = new Map<string, TokenInfo>(),
    tokens = new Map<string, TokenInfo>();
  const loadTokens = (rows: unknown, dest: Map<string, TokenInfo>) => {
    for (const row of arr(rows)) {
      const b = obj(row),
        i = index(b.accountIndex),
        t = obj(b.uiTokenAmount),
        decimals = index(t.decimals),
        amount = integer(t.amount),
        mint = str(b.mint);
      if (
        i === null ||
        !keys[i] ||
        decimals === null ||
        decimals > 255 ||
        amount === null ||
        amount < 0n ||
        !mint
      ) {
        warn("token-balance-unavailable");
        continue;
      }
      const info: TokenInfo = { owner: str(b.owner), mint, decimals, amount };
      dest.set(keys[i]!, info);
      const previous = tokens.get(keys[i]!);
      if (
        previous &&
        (previous.owner !== info.owner ||
          previous.mint !== mint ||
          previous.decimals !== decimals)
      ) {
        info.conflict = true;
        warn("token-owner-or-mint-changed");
      }
      tokens.set(keys[i]!, info);
    }
  };
  loadTokens(meta.preTokenBalances, tokenPre);
  loadTokens(meta.postTokenBalances, tokenPost);
  const instructions: { value: unknown; evidence: string }[] = [];
  arr(message.instructions).forEach((value, i) =>
    instructions.push({ value, evidence: `instruction:${i}` }),
  );
  for (const group of arr(meta.innerInstructions)) {
    const g = obj(group),
      parent = index(g.index);
    if (parent === null) {
      warn("invalid-inner-instruction");
      continue;
    }
    arr(g.instructions).forEach((value, i) =>
      instructions.push({
        value,
        evidence: `instruction:${parent}/inner:${i}`,
      }),
    );
  }
  // Owner of newly created ATAs is proven by the creation instruction, not today's account state.
  for (const { value } of instructions) {
    const ix = obj(value),
      p = obj(ix.parsed),
      info = obj(p.info);
    if (
      ix.programId === ATA &&
      ["create", "createIdempotent"].includes(String(p.type))
    ) {
      const account = str(info.account),
        mint = str(info.mint),
        owner = str(info.wallet);
      if (account && mint && owner) {
        const known = tokens.get(account);
        if (
          known &&
          (known.mint !== mint || (known.owner && known.owner !== owner))
        ) {
          known.conflict = true;
          warn("token-owner-or-mint-changed");
        } else if (known) known.owner = owner;
      }
    }
  }
  const asset = (mint: string, decimals: number): Asset =>
    mint === USDC[network] && decimals === 6
      ? "USDC"
      : mint === WSOL && decimals === 9
        ? "WSOL"
        : "TOKEN";
  const push = (m: Omit<Movement, "executed">) =>
    a.movements.push({ ...m, executed: a.state === "success" });
  for (const { value, evidence } of instructions) {
    const ix = obj(value),
      p = obj(ix.parsed),
      info = obj(p.info),
      type = str(p.type);
    const program =
      str(ix.programId) ??
      (index(ix.programIdIndex) !== null
        ? keys[index(ix.programIdIndex)!]
        : null);
    if (!program) {
      warn("program-unavailable");
      continue;
    }
    if (!a.programs.includes(program)) a.programs.push(program);
    const movement = (
      kind: Movement["kind"],
      atomic: string | null,
      from: string | null,
      to: string | null,
      mint: string | null = null,
      decimals: number | null = 9,
      tokenAsset: Asset = "SOL",
      fromAccount: string | null = from,
      toAccount: string | null = to,
    ) =>
      push({
        kind,
        atomic,
        from,
        to,
        mint,
        decimals,
        asset: tokenAsset,
        fromAccount,
        toAccount,
        evidence,
      });
    if (program === COMPUTE || program === MEMO) continue;
    if (program === SYSTEM) {
      if (type === "transfer" || type === "transferWithSeed") {
        const n = integer(info.lamports),
          from = str(info.source),
          to = str(info.destination);
        if (n === null || n < 0n || !from || !to) {
          warn("ambiguous-transfer");
          continue;
        }
        movement("transfer", n.toString(), from, to);
      } else if (type === "createAccount" || type === "createAccountWithSeed")
        movement(
          "create-account",
          integer(info.lamports)?.toString() ?? null,
          str(info.source),
          str(info.newAccount),
        );
      else warn("unsupported-system-instruction");
      continue;
    }
    if (program === ATA) {
      if (!["create", "createIdempotent"].includes(String(type)))
        warn("unsupported-ata-instruction");
      continue;
    }
    if (program === TOKEN || program === TOKEN2022) {
      if (program === TOKEN2022) warn("token-2022-extensions-unverified");
      if (type === "transfer" || type === "transferChecked") {
        const fromAccount = str(info.source),
          toAccount = str(info.destination),
          fromInfo = fromAccount ? tokens.get(fromAccount) : undefined,
          toInfo = toAccount ? tokens.get(toAccount) : undefined;
        const amountInfo = obj(info.tokenAmount),
          mint = str(info.mint) ?? fromInfo?.mint ?? toInfo?.mint ?? null;
        const decimals =
            index(amountInfo.decimals) ??
            fromInfo?.decimals ??
            toInfo?.decimals ??
            null,
          amount = integer(info.amount ?? amountInfo.amount);
        if (
          !mint ||
          decimals === null ||
          amount === null ||
          amount < 0n ||
          fromInfo?.conflict ||
          toInfo?.conflict ||
          (fromInfo && fromInfo.mint !== mint) ||
          (toInfo && toInfo.mint !== mint)
        ) {
          warn("ambiguous-token-transfer");
          continue;
        }
        if (!fromInfo?.owner || !toInfo?.owner) warn("token-owner-unavailable");
        movement(
          "transfer",
          amount.toString(),
          fromInfo?.owner ?? null,
          toInfo?.owner ?? null,
          mint,
          decimals,
          asset(mint, decimals),
          fromAccount,
          toAccount,
        );
      } else if (type === "closeAccount")
        movement(
          "close-account",
          null,
          str(info.owner),
          str(info.destination),
          tokens.get(String(info.account))?.mint ?? null,
          null,
          "SOL",
          str(info.account),
          str(info.destination),
        );
      else if (
        type === "mintTo" ||
        type === "mintToChecked" ||
        type === "burn" ||
        type === "burnChecked"
      )
        movement(
          type.startsWith("mint") ? "mint" : "burn",
          integer(info.amount ?? obj(info.tokenAmount).amount)?.toString() ??
            null,
          str(info.authority),
          tokens.get(String(info.account))?.owner ?? null,
          str(info.mint),
          index(obj(info.tokenAmount).decimals),
          "TOKEN",
        );
      else if (
        type === "approve" ||
        type === "approveChecked" ||
        type === "revoke" ||
        type === "setAuthority"
      ) {
        movement(
          "approval",
          integer(info.amount)?.toString() ?? null,
          str(info.owner ?? info.authority),
          str(info.delegate ?? info.newAuthority),
          tokens.get(String(info.source ?? info.account))?.mint ?? null,
          null,
          "TOKEN",
        );
        if (type === "setAuthority") warn("authority-changed");
      } else if (
        ![
          "initializeAccount",
          "initializeAccount2",
          "initializeAccount3",
          "initializeImmutableOwner",
          "syncNative",
          "getAccountDataSize",
        ].includes(String(type))
      )
        warn("unsupported-token-instruction");
      continue;
    }
    if (program === JUPITER) {
      warn("jupiter-intent-inferred-from-effects");
      continue;
    }
    warn("unknown-program");
  }
  if (a.programs.includes(JUPITER)) a.category = "swap";
  else if (
    a.movements.some((m) => m.kind === "transfer") &&
    a.programs.every((p) => SAFE_PROGRAMS.has(p))
  )
    a.category = "transfer";
  const pre = arr(meta.preBalances),
    post = arr(meta.postBalances);
  if (pre.length !== keys.length || post.length !== keys.length)
    warn("native-balances-unavailable");
  else
    keys.forEach((address, i) => {
      const before = integer(pre[i]),
        after = integer(post[i]);
      if (before === null || after === null || before < 0n || after < 0n) {
        warn("native-balances-unavailable");
        return;
      }
      if (before !== after)
        a.balances.push({
          address: address!,
          owner: null,
          asset: "SOL",
          mint: null,
          decimals: 9,
          pre: before.toString(),
          post: after.toString(),
          delta: (after - before).toString(),
        });
    });
  for (const account of new Set([...tokenPre.keys(), ...tokenPost.keys()])) {
    const before = tokenPre.get(account),
      after = tokenPost.get(account),
      t = after ?? before!;
    // Absence means zero only when creation/closure is independently proved.
    const created = instructions.some(({ value }) => {
      const ix = obj(value),
        p = obj(ix.parsed);
      return (
        ix.programId === ATA &&
        ["create", "createIdempotent"].includes(String(p.type)) &&
        obj(p.info).account === account
      );
    });
    const closed = a.movements.some(
      (m) => m.kind === "close-account" && m.fromAccount === account,
    );
    if (
      (!before && !created) ||
      (!after && !closed) ||
      tokens.get(account)?.conflict
    ) {
      warn("token-balance-history-incomplete");
      continue;
    }
    const b = before?.amount ?? 0n,
      c = after?.amount ?? 0n;
    if (b !== c) {
      const change: BalanceChange = {
        address: account,
        owner: t.owner,
        asset: asset(t.mint, t.decimals),
        mint: t.mint,
        decimals: t.decimals,
        pre: b.toString(),
        post: c.toString(),
        delta: (c - b).toString(),
      };
      a.balances.push(change);
    }
  }
  if (a.category === "swap" && meta.innerInstructions == null)
    warn("inner-instructions-unavailable");
  return a;
}
function errorLabel(raw: unknown): string {
  const r = obj(raw),
    failure = arr(r.InstructionError);
  if (failure.length === 2) {
    const custom = obj(failure[1]).Custom;
    return `Instruction ${String(failure[0])}: ${custom !== undefined ? "Custom " + String(custom) : typeof failure[1] === "string" ? failure[1] : "Program error"}`;
  }
  return typeof raw === "string" ? raw.slice(0, 120) : "TRANSACTION_FAILED";
}
