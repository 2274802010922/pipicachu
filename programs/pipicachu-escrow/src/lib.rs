use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

declare_id!("HwsHDnbuZbXZtVFvgGkZpzAVEAQN3SYJCfZzUa18Ho5V"); // replaced by scripts/devnet/bootstrap.ts
const INITIALIZER: Pubkey = pubkey!("DwTKmg68k39b8jZWt1CHypfoPs5JuJsuP88SfKcbW3uj");
const MAX_SECONDS: i64 = 30 * 86400;

#[program]
pub mod pipicachu_escrow {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            INITIALIZER,
            EscrowError::Unauthorized
        );
        require!(ctx.accounts.mint.decimals == 6, EscrowError::InvalidTerms);
        ctx.accounts.config.mint = ctx.accounts.mint.key();
        ctx.accounts.config.bump = ctx.bumps.config;
        Ok(())
    }
    pub fn register(ctx: Context<Register>) -> Result<()> {
        let a = &mut ctx.accounts.arbitrator;
        a.authority = ctx.accounts.authority.key();
        a.mint = ctx.accounts.mint.key();
        a.bump = ctx.bumps.arbitrator;
        a.total = 0;
        a.locked = 0;
        Ok(())
    }
    pub fn deposit_bond(ctx: Context<Bond>, amount: u64) -> Result<()> {
        require!(amount > 0, EscrowError::InvalidTerms);
        transfer(
            &ctx.accounts.token_program,
            &ctx.accounts.source,
            &ctx.accounts.vault,
            ctx.accounts.authority.to_account_info(),
            &ctx.accounts.mint,
            amount,
            &[],
        )?;
        let a = &mut ctx.accounts.arbitrator;
        a.total = a.total.checked_add(amount).ok_or(EscrowError::Overflow)?;
        Ok(())
    }
    pub fn withdraw_bond(ctx: Context<Bond>, amount: u64) -> Result<()> {
        let a = &ctx.accounts.arbitrator;
        require!(
            amount > 0 && amount <= a.total - a.locked,
            EscrowError::BondLocked
        );
        let authority = a.authority;
        let bump = [a.bump];
        let seeds: &[&[u8]] = &[b"arb", authority.as_ref(), &bump];
        transfer(
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            &ctx.accounts.source,
            a.to_account_info(),
            &ctx.accounts.mint,
            amount,
            &[seeds],
        )?;
        ctx.accounts.arbitrator.total -= amount;
        Ok(())
    }
    pub fn create_deal(
        ctx: Context<CreateDeal>,
        nonce: u64,
        buyer: Pubkey,
        amount: u64,
        funding_seconds: i64,
        delivery_seconds: i64,
        review_seconds: i64,
        arbitration_seconds: i64,
        terms: String,
    ) -> Result<()> {
        let seller = ctx.accounts.seller.key();
        let primary = ctx.accounts.primary.authority;
        let backup = ctx.accounts.backup.authority;
        require!(
            buyer != seller
                && buyer != primary
                && buyer != backup
                && seller != primary
                && seller != backup
                && primary != backup,
            EscrowError::InvalidTerms
        );
        require!(
            amount >= 1_000_000 && amount <= 1_000_000_000_000,
            EscrowError::InvalidTerms
        );
        require!(
            !terms.trim().is_empty() && terms.len() <= 512,
            EscrowError::InvalidTerms
        );
        for seconds in [
            funding_seconds,
            delivery_seconds,
            review_seconds,
            arbitration_seconds,
        ] {
            require!(
                (10..=MAX_SECONDS).contains(&seconds),
                EscrowError::InvalidTerms
            );
        }
        let d = &mut ctx.accounts.deal;
        d.seller = seller;
        d.buyer = buyer;
        d.primary = primary;
        d.backup = backup;
        d.mint = ctx.accounts.mint.key();
        d.nonce = nonce;
        d.amount = amount;
        d.bond = amount.div_ceil(10);
        d.fee = amount / 100;
        d.created_at = Clock::get()?.unix_timestamp;
        d.fund_by = d.created_at + funding_seconds;
        d.delivery_seconds = delivery_seconds;
        d.review_seconds = review_seconds;
        d.arbitration_seconds = arbitration_seconds;
        d.state = State::Created;
        d.approvals = 0;
        d.bump = ctx.bumps.deal;
        d.terms = terms;
        Ok(())
    }
    pub fn accept_deal(ctx: Context<Act>) -> Result<()> {
        let d = &mut ctx.accounts.deal;
        let who = ctx.accounts.actor.key();
        require!(
            d.state == State::Created && Clock::get()?.unix_timestamp < d.fund_by,
            EscrowError::WrongState
        );
        if who == d.primary {
            d.approvals |= 1;
        } else if who == d.backup {
            d.approvals |= 2;
        } else {
            return err!(EscrowError::Unauthorized);
        }
        Ok(())
    }
    pub fn cancel_deal(ctx: Context<Act>) -> Result<()> {
        let d = &mut ctx.accounts.deal;
        require!(d.state == State::Created, EscrowError::WrongState);
        require!(
            ctx.accounts.actor.key() == d.seller || Clock::get()?.unix_timestamp >= d.fund_by,
            EscrowError::Unauthorized
        );
        d.state = State::Cancelled;
        Ok(())
    }
    pub fn fund(ctx: Context<Fund>) -> Result<()> {
        let d = &mut ctx.accounts.deal;
        let now = Clock::get()?.unix_timestamp;
        require_keys_eq!(ctx.accounts.buyer.key(), d.buyer, EscrowError::Unauthorized);
        require!(
            d.state == State::Created && now < d.fund_by && d.approvals == 3,
            EscrowError::WrongState
        );
        for a in [&mut ctx.accounts.primary, &mut ctx.accounts.backup] {
            require!(a.total - a.locked >= d.bond, EscrowError::InsufficientBond);
            a.locked = a.locked.checked_add(d.bond).ok_or(EscrowError::Overflow)?;
        }
        transfer(
            &ctx.accounts.token_program,
            &ctx.accounts.source,
            &ctx.accounts.vault,
            ctx.accounts.buyer.to_account_info(),
            &ctx.accounts.mint,
            d.amount,
            &[],
        )?;
        d.state = State::Funded;
        d.deliver_by = now + d.delivery_seconds;
        Ok(())
    }
    pub fn deliver(ctx: Context<Act>, evidence_hash: [u8; 32]) -> Result<()> {
        let d = &mut ctx.accounts.deal;
        let now = Clock::get()?.unix_timestamp;
        require_keys_eq!(
            ctx.accounts.actor.key(),
            d.seller,
            EscrowError::Unauthorized
        );
        require!(
            d.state == State::Funded && now < d.deliver_by,
            EscrowError::WrongState
        );
        require!(evidence_hash != [0; 32], EscrowError::InvalidTerms);
        d.delivery_hash = evidence_hash;
        d.state = State::Delivered;
        d.review_by = now + d.review_seconds;
        Ok(())
    }
    pub fn dispute(ctx: Context<Act>, evidence_hash: [u8; 32]) -> Result<()> {
        let d = &mut ctx.accounts.deal;
        let now = Clock::get()?.unix_timestamp;
        require_keys_eq!(ctx.accounts.actor.key(), d.buyer, EscrowError::Unauthorized);
        require!(
            d.state == State::Delivered && now < d.review_by,
            EscrowError::WrongState
        );
        require!(evidence_hash != [0; 32], EscrowError::InvalidTerms);
        d.dispute_hash = evidence_hash;
        d.state = State::Disputed;
        d.arbitrate_by = now + d.arbitration_seconds;
        Ok(())
    }
    pub fn confirm(ctx: Context<Settle>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.actor.key(),
            ctx.accounts.deal.buyer,
            EscrowError::Unauthorized
        );
        require!(
            ctx.accounts.deal.state == State::Delivered,
            EscrowError::WrongState
        );
        settle(ctx, true, false)
    }
    pub fn finalize(ctx: Context<Settle>) -> Result<()> {
        let d = &ctx.accounts.deal;
        require!(
            d.state == State::Delivered && Clock::get()?.unix_timestamp >= d.review_by,
            EscrowError::WrongState
        );
        settle(ctx, true, false)
    }
    pub fn refund_expired(ctx: Context<Settle>) -> Result<()> {
        let d = &ctx.accounts.deal;
        require!(
            d.state == State::Funded && Clock::get()?.unix_timestamp >= d.deliver_by,
            EscrowError::WrongState
        );
        settle(ctx, false, false)
    }
    pub fn resolve(ctx: Context<Settle>, pay_seller: bool, reason_hash: [u8; 32]) -> Result<()> {
        let d = &mut ctx.accounts.deal;
        let now = Clock::get()?.unix_timestamp;
        let actor = ctx.accounts.actor.key();
        require!(d.state == State::Disputed, EscrowError::WrongState);
        let is_backup = now >= d.arbitrate_by;
        if is_backup {
            require!(
                now < d.arbitrate_by + d.arbitration_seconds,
                EscrowError::WrongState
            );
            require_keys_eq!(actor, d.backup, EscrowError::Unauthorized);
        } else {
            require_keys_eq!(actor, d.primary, EscrowError::Unauthorized);
        }
        require!(reason_hash != [0; 32], EscrowError::InvalidTerms);
        d.resolution_hash = reason_hash;
        settle(ctx, pay_seller, is_backup)
    }
    pub fn propose_settlement(ctx: Context<Act>, pay_seller: bool) -> Result<()> {
        let d = &mut ctx.accounts.deal;
        require!(
            d.state == State::Disputed
                && Clock::get()?.unix_timestamp >= d.arbitrate_by + d.arbitration_seconds,
            EscrowError::WrongState
        );
        require_keys_eq!(ctx.accounts.actor.key(), d.buyer, EscrowError::Unauthorized);
        d.proposal = if pay_seller { 1 } else { 2 };
        Ok(())
    }
    pub fn accept_settlement(ctx: Context<Settle>, pay_seller: bool) -> Result<()> {
        let d = &ctx.accounts.deal;
        require!(
            d.state == State::Disputed
                && d.proposal != 0
                && Clock::get()?.unix_timestamp >= d.arbitrate_by + d.arbitration_seconds,
            EscrowError::WrongState
        );
        require_keys_eq!(
            ctx.accounts.actor.key(),
            d.seller,
            EscrowError::Unauthorized
        );
        require!(
            d.proposal == if pay_seller { 1 } else { 2 },
            EscrowError::WrongState
        );
        settle(ctx, pay_seller, false)
    }
}

fn settle(ctx: Context<Settle>, pay_seller: bool, backup_fee: bool) -> Result<()> {
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
    let fee = if pay_seller { d.fee } else { 0 };
    transfer(
        &ctx.accounts.token_program,
        &ctx.accounts.vault,
        destination,
        d.to_account_info(),
        &ctx.accounts.mint,
        d.amount - fee,
        &[seeds],
    )?;
    if fee > 0 {
        let fee_token = if backup_fee {
            &ctx.accounts.backup_token
        } else {
            &ctx.accounts.primary_token
        };
        transfer(
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            fee_token,
            d.to_account_info(),
            &ctx.accounts.mint,
            fee,
            &[seeds],
        )?;
    }
    for a in [&mut ctx.accounts.primary, &mut ctx.accounts.backup] {
        a.locked = a.locked.checked_sub(d.bond).ok_or(EscrowError::Overflow)?;
    }
    ctx.accounts.deal.state = if pay_seller {
        State::Completed
    } else {
        State::Refunded
    };
    Ok(())
}
fn transfer<'info>(
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

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer=authority, space=8+33, seeds=[b"config"], bump)]
    pub config: Account<'info, Config>,
    pub mint: Box<Account<'info, Mint>>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Register<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds=[b"config"], bump=config.bump, has_one=mint)]
    pub config: Account<'info, Config>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(init, payer=authority, space=8+82, seeds=[b"arb",authority.key().as_ref()], bump)]
    pub arbitrator: Account<'info, Arbitrator>,
    #[account(init, payer=authority, seeds=[b"bond",arbitrator.key().as_ref()], bump, token::mint=mint, token::authority=arbitrator)]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Bond<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds=[b"arb",authority.key().as_ref()], bump=arbitrator.bump, has_one=authority, has_one=mint)]
    pub arbitrator: Account<'info, Arbitrator>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut, token::mint=mint, token::authority=authority)]
    pub source: Box<Account<'info, TokenAccount>>,
    #[account(mut, seeds=[b"bond",arbitrator.key().as_ref()], bump, token::mint=mint, token::authority=arbitrator)]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}
#[derive(Accounts)]
#[instruction(nonce:u64)]
pub struct CreateDeal<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(seeds=[b"config"], bump=config.bump, has_one=mint)]
    pub config: Account<'info, Config>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(has_one=mint)]
    pub primary: Box<Account<'info, Arbitrator>>,
    #[account(has_one=mint)]
    pub backup: Box<Account<'info, Arbitrator>>,
    #[account(init, payer=seller, space=8+900, seeds=[b"deal",seller.key().as_ref(), &nonce.to_le_bytes()], bump)]
    pub deal: Box<Account<'info, Deal>>,
    #[account(init, payer=seller, seeds=[b"vault",deal.key().as_ref()], bump, token::mint=mint, token::authority=deal)]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Act<'info> {
    pub actor: Signer<'info>,
    #[account(mut, seeds=[b"deal",deal.seller.as_ref(),&deal.nonce.to_le_bytes()], bump=deal.bump)]
    pub deal: Box<Account<'info, Deal>>,
}
#[derive(Accounts)]
pub struct Fund<'info> {
    pub buyer: Signer<'info>,
    #[account(mut, seeds=[b"deal",deal.seller.as_ref(),&deal.nonce.to_le_bytes()], bump=deal.bump, has_one=mint)]
    pub deal: Box<Account<'info, Deal>>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut, seeds=[b"arb",deal.primary.as_ref()], bump=primary.bump, has_one=mint)]
    pub primary: Box<Account<'info, Arbitrator>>,
    #[account(mut, seeds=[b"arb",deal.backup.as_ref()], bump=backup.bump, has_one=mint)]
    pub backup: Box<Account<'info, Arbitrator>>,
    #[account(mut, token::mint=mint, token::authority=buyer)]
    pub source: Box<Account<'info, TokenAccount>>,
    #[account(mut, seeds=[b"vault",deal.key().as_ref()], bump, token::mint=mint, token::authority=deal)]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}
#[derive(Accounts)]
pub struct Settle<'info> {
    pub actor: Signer<'info>,
    #[account(mut, seeds=[b"deal",deal.seller.as_ref(),&deal.nonce.to_le_bytes()], bump=deal.bump, has_one=mint)]
    pub deal: Box<Account<'info, Deal>>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut, seeds=[b"arb",deal.primary.as_ref()], bump=primary.bump, has_one=mint)]
    pub primary: Box<Account<'info, Arbitrator>>,
    #[account(mut, seeds=[b"arb",deal.backup.as_ref()], bump=backup.bump, has_one=mint)]
    pub backup: Box<Account<'info, Arbitrator>>,
    #[account(mut, seeds=[b"vault",deal.key().as_ref()], bump, token::mint=mint, token::authority=deal)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(mut, token::mint=mint, constraint=buyer_token.owner==deal.buyer @ EscrowError::Unauthorized)]
    pub buyer_token: Box<Account<'info, TokenAccount>>,
    #[account(mut, token::mint=mint, constraint=seller_token.owner==deal.seller @ EscrowError::Unauthorized)]
    pub seller_token: Box<Account<'info, TokenAccount>>,
    #[account(mut, token::mint=mint, constraint=primary_token.owner==deal.primary @ EscrowError::Unauthorized)]
    pub primary_token: Box<Account<'info, TokenAccount>>,
    #[account(mut, token::mint=mint, constraint=backup_token.owner==deal.backup @ EscrowError::Unauthorized)]
    pub backup_token: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}
#[account]
pub struct Config {
    pub mint: Pubkey,
    pub bump: u8,
}
#[account]
pub struct Arbitrator {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub total: u64,
    pub locked: u64,
    pub bump: u8,
}
#[account]
pub struct Deal {
    pub seller: Pubkey,
    pub buyer: Pubkey,
    pub primary: Pubkey,
    pub backup: Pubkey,
    pub mint: Pubkey,
    pub nonce: u64,
    pub amount: u64,
    pub bond: u64,
    pub fee: u64,
    pub created_at: i64,
    pub fund_by: i64,
    pub delivery_seconds: i64,
    pub review_seconds: i64,
    pub arbitration_seconds: i64,
    pub deliver_by: i64,
    pub review_by: i64,
    pub arbitrate_by: i64,
    pub state: State,
    pub approvals: u8,
    pub bump: u8,
    pub proposal: u8,
    pub delivery_hash: [u8; 32],
    pub dispute_hash: [u8; 32],
    pub resolution_hash: [u8; 32],
    pub terms: String,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum State {
    Created,
    Funded,
    Delivered,
    Disputed,
    Completed,
    Refunded,
    Cancelled,
}
#[error_code]
pub enum EscrowError {
    #[msg("Wallet is not authorized for this action")]
    Unauthorized,
    #[msg("Invalid amount, participants, evidence or time window")]
    InvalidTerms,
    #[msg("Action is not available in this state or time window")]
    WrongState,
    #[msg("This bond is reserved for active deals")]
    BondLocked,
    #[msg("Arbitrator needs more available bond")]
    InsufficientBond,
    #[msg("Arithmetic overflow")]
    Overflow,
}
