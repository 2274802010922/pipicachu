import type { Network } from "./types";
export interface Example {
  id: string;
  title: { vi: string; en: string };
  signature: string;
  network: Network;
  note: { vi: string; en: string };
  snapshot?: string;
}
export const examples: Example[] = [
  {
    id: "jupiter",
    title: { vi: "Tương tác Jupiter", en: "Jupiter activity" },
    signature: "",
    network: "mainnet",
    note: {
      vi: "Đang chuẩn bị nguồn giao dịch Mainnet đã kiểm chứng.",
      en: "A verified Mainnet example is being prepared.",
    },
  },
  {
    id: "sol",
    title: { vi: "Chuyển SOL Devnet", en: "SOL Devnet transfer" },
    signature:
      "XK8SS9c2nUhGYieAaCrXXfSZtnjNfMFq18aX6LJjnWZ9rFg5Sr7bodVMHFfmSnuuua9h9daxn6tgdLLog7sW6UD",
    network: "devnet",
    note: {
      vi: "Chuyển 0,001 SOL. Giao dịch Devnet thật đã kiểm từ ví thử nghiệm mới.",
      en: "A 0.001 SOL transfer verified from a fresh Devnet test wallet.",
    },
  },
  {
    id: "usdc",
    title: { vi: "Chuyển USDC đúng mint", en: "Canonical USDC transfer" },
    signature:
      "4QkpoZQbf6RgNChLj2pQoJckjHdwx6r82eAirJ9nkN2vuQFmVSjDGnZso6kzEGYGPoZPyMRFdv7L4wchZjEMhvx",
    network: "devnet",
    note: {
      vi: "Giao dịch công khai dùng mint USDC Devnet của Circle. Chuyển 0,001 USDC thử nghiệm.",
      en: "A public transfer of 0.001 test USDC using Circle's Devnet mint.",
    },
  },
  {
    id: "wrong-token",
    title: { vi: "Token khác mint USDC", en: "A different token mint" },
    signature:
      "5Do2CoKFS1Rj5ZL2nU2dEMGbjCUQ39nnfp59iUjvFRqMMH8GD8TeqGF74nEAzQbHc3WRahEtUHbRJP5CbSdQr39M",
    network: "devnet",
    note: {
      vi: "Chuyển 50 token thử nghiệm mới tạo. Đối chiếu USDC phải báo sai token.",
      en: "Transfers 50 freshly created test tokens. A USDC comparison must report a token mismatch.",
    },
  },
  {
    id: "failed",
    title: { vi: "Giao dịch chuyển thất bại", en: "Failed transfer" },
    signature:
      "2BkzJutrdSAd5gZVUMtQsLpMQBeMBCbpRXSmLzrgehSv4JAQ5uk8mP47jAUZEWezxBC15HicjJ8518BA3p9Y8vWz",
    network: "devnet",
    note: {
      vi: "Ví thử không đủ số tiền yêu cầu. Không được tính thao tác đã thử thành thanh toán.",
      en: "The test wallet lacked the requested amount. Attempted operations must not count as payment.",
    },
  },
];
