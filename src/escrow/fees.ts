export function feeBreakdown(
  amount: bigint,
  arbitratorFee: bigint,
  platformFee: bigint,
  refund = false,
) {
  if (
    amount < 0n ||
    arbitratorFee < 0n ||
    platformFee < 0n ||
    arbitratorFee + platformFee > amount
  )
    throw new Error("INVALID_FEE_AMOUNTS");
  return refund
    ? {
        buyerRefund: amount,
        sellerNet: 0n,
        arbitratorFee: 0n,
        platformFee: 0n,
        totalFee: 0n,
      }
    : {
        buyerRefund: 0n,
        sellerNet: amount - arbitratorFee - platformFee,
        arbitratorFee,
        platformFee,
        totalFee: arbitratorFee + platformFee,
      };
}
