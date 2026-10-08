use super::*;
pub(crate) fn settle(ctx: Context<Settle>, pay_seller: bool) -> Result<()> {
    let d = &ctx.accounts.deal;
    let seller = d.seller;
    let nonce = d.nonce.to_le_bytes();
    let bump = [d.bump];
    let seeds: &[&[u8]] = &[b"deal", seller.as_ref(), &nonce, &bump];
    let destination = if pay_seller {
        &ctx.accounts.seller_token
    } else {
        &ctx.accounts.buyer_token
    };

    require!(
        d.workflow_version <= 1
            && d.resolution_policy_version <= 1
            && d.fee_version <= 1
            && (d.fee_version != 0 || d.platform_fee == 0),
        EscrowError::InvalidTerms
    );
    let amounts = crate::math::payment_amounts(d.amount, d.fee, d.platform_fee, pay_seller)?;
    let (net, fee, platform_fee) = (amounts.net, amounts.arbitrator_fee, amounts.platform_fee);
    // Only the fee recipient may intentionally alias a participant token account.
    // Aggregate the logical legs before CPI so each actual recipient is paid once.
    let legs = [
        (destination.as_ref(), net),
        (ctx.accounts.arbitrator_token.as_ref(), fee),
        (ctx.accounts.platform_token.as_ref(), platform_fee),
    ];
    let mut payments: Vec<(&Account<TokenAccount>, u64)> = Vec::new();
    for (recipient, value) in legs {
        require_keys_neq!(
            recipient.key(),
            ctx.accounts.vault.key(),
            EscrowError::Unauthorized
        );
        if value == 0 {
            continue;
        }
        if let Some(existing) = payments
            .iter_mut()
            .find(|(account, _)| account.key() == recipient.key())
        {
            existing.1 = existing.1.checked_add(value).ok_or(EscrowError::Overflow)?;
        } else {
            payments.push((recipient, value));
        }
    }
    let total = payments
        .iter()
        .try_fold(0u64, |sum, (_, value)| sum.checked_add(*value))
        .ok_or(EscrowError::Overflow)?;
    require_eq!(total, d.amount, EscrowError::InvalidTerms);
    for (recipient, value) in payments {
        transfer(
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            recipient,
            d.to_account_info(),
            &ctx.accounts.mint,
            value,
            &[seeds],
        )?;
    }
    ctx.accounts.arbitrator.locked = ctx
        .accounts
        .arbitrator
        .locked
        .checked_sub(d.bond)
        .ok_or(EscrowError::Overflow)?;
    ctx.accounts.deal.state = if pay_seller {
        State::Completed
    } else {
        State::Refunded
    };
    Ok(())
}
pub(crate) fn transfer<'info>(
    program: &Program<'info, Token>,
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    authority: AccountInfo<'info>,
    mint: &Account<'info, Mint>,
    amount: u64,
    seeds: &[&[&[u8]]],
) -> Result<()> {
    token::transfer_checked(
        CpiContext::new(
            program.key(),
            TransferChecked {
                from: from.to_account_info(),
                to: to.to_account_info(),
                authority,
                mint: mint.to_account_info(),
            },
        )
        .with_signer(seeds),
        amount,
        mint.decimals,
    )
}
