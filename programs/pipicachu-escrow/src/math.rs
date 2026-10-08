use super::*;

/// Logical payment amounts, before intentionally aliased token accounts are combined.
pub(crate) struct PaymentAmounts {
    pub net: u64,
    pub arbitrator_fee: u64,
    pub platform_fee: u64,
}
pub(crate) fn payment_amounts(
    principal: u64,
    arbitrator_fee: u64,
    platform_fee: u64,
    payout: bool,
) -> Result<PaymentAmounts> {
    let (arbitrator_fee, platform_fee) = if payout {
        (arbitrator_fee, platform_fee)
    } else {
        (0, 0)
    };
    let net = principal
        .checked_sub(arbitrator_fee)
        .and_then(|n| n.checked_sub(platform_fee))
        .ok_or(EscrowError::Overflow)?;
    Ok(PaymentAmounts {
        net,
        arbitrator_fee,
        platform_fee,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn conservation_and_refunds_for_4096_independent_amounts() {
        let mut seed = 7u64;
        for _ in 0..4096 {
            seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
            let principal = 1_000_000 + seed % 999_999_000_001;
            let fee = principal / 100;
            let paid = payment_amounts(principal, fee, fee, true).unwrap();
            assert_eq!(
                paid.net + paid.arbitrator_fee + paid.platform_fee,
                principal
            );
            assert_eq!(paid.arbitrator_fee, fee);
            assert_eq!(paid.platform_fee, fee);
            // Each 1% fee rounds down; the remaining fraction stays with the seller.
            assert_eq!(paid.net, principal - 2 * fee);
            let refund = payment_amounts(principal, fee, fee, false).unwrap();
            assert_eq!(
                (refund.net, refund.arbitrator_fee, refund.platform_fee),
                (principal, 0, 0)
            );
        }
    }
    #[test]
    fn invalid_totals_reject_and_u64_edges_remain_exact() {
        for (principal, arb_fee, platform_fee) in [(1, 2, 0), (u64::MAX, u64::MAX, 1)] {
            let error = payment_amounts(principal, arb_fee, platform_fee, true)
                .err()
                .unwrap();
            match error {
                anchor_lang::error::Error::AnchorError(error) => {
                    assert_eq!(error.error_code_number, 6005)
                }
                _ => panic!("expected Overflow (6005)"),
            }
        }
        let p = payment_amounts(u64::MAX, 0, 0, true).unwrap();
        assert_eq!(p.net, u64::MAX);
        assert_eq!(payment_amounts(1, 0, 0, true).unwrap().net, 1);
    }
}
