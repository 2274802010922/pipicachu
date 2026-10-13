use super::*;
use solana_sha256_hasher::hashv;

/// Domain-separated, length-delimited commitment to all immutable payment terms.
pub(crate) fn terms_hash(address: Pubkey, d: &Deal, treasury: Pubkey) -> [u8; 32] {
    hashv(&[
        b"pipicachu:fund-review:v1",
        crate::ID.as_ref(),
        address.as_ref(),
        d.seller.as_ref(),
        d.buyer.as_ref(),
        d.arbitrator.as_ref(),
        d.mint.as_ref(),
        treasury.as_ref(),
        &d.amount.to_le_bytes(),
        &d.fee.to_le_bytes(),
        &d.platform_fee.to_le_bytes(),
        &d.bond.to_le_bytes(),
        &[
            d.fee_version,
            d.workflow_version,
            d.resolution_policy_version,
        ],
        &d.fund_by.to_le_bytes(),
        &d.delivery_seconds.to_le_bytes(),
        &d.review_seconds.to_le_bytes(),
        &d.arbitration_seconds.to_le_bytes(),
        &(d.terms.len() as u32).to_le_bytes(),
        d.terms.as_bytes(),
    ])
    .to_bytes()
}

#[allow(clippy::too_many_arguments)]
pub(crate) fn fund_payment<'info>(
    buyer: &Signer<'info>,
    d: &mut Account<'info, Deal>,
    mint: &Account<'info, Mint>,
    arbitrator: &mut Account<'info, Arbitrator>,
    source: &Account<'info, TokenAccount>,
    vault: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
    organization: &UncheckedAccount<'info>,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require_keys_eq!(buyer.key(), d.buyer, EscrowError::Unauthorized);
    require!(
        d.state == State::Created && now < d.fund_by && d.approvals == 1,
        EscrowError::WrongState
    );
    if d.workflow_version == 1 {
        let org = load_organization(&organization.to_account_info())?
            .ok_or(EscrowError::OrganizationUnavailable)?;
        require!(
            org.approved && org.accepting,
            EscrowError::OrganizationUnavailable
        );
        require!(
            arbitrator.total >= org.minimum_deposit && d.amount <= org.maximum_deal,
            EscrowError::InsufficientBond
        );
    }
    for a in [arbitrator] {
        require!(
            a.total.checked_sub(a.locked).ok_or(EscrowError::Overflow)? >= d.bond,
            EscrowError::InsufficientBond
        );
        a.locked = a.locked.checked_add(d.bond).ok_or(EscrowError::Overflow)?;
    }
    transfer(
        &token_program,
        &source,
        &vault,
        buyer.to_account_info(),
        &mint,
        d.amount,
        &[],
    )?;
    d.state = State::Funded;
    d.deliver_by = now + d.delivery_seconds;
    Ok(())
}
