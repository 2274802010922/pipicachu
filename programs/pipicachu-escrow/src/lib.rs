use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

declare_id!("4Xds5m5JtWR8HbNLdGeF7e3Qh3akKMHwMfjKsQeVXnrb");
const INITIALIZER: Pubkey = pubkey!("DwTKmg68k39b8jZWt1CHypfoPs5JuJsuP88SfKcbW3uj");
const MAX_SECONDS: i64 = 30 * 86400;

mod contexts;
mod error;
mod math;
mod registry;
mod settlement;
mod state;
pub use contexts::*;
pub use error::*;
use registry::{configure_organization, load_organization};
use settlement::{settle, transfer};
pub use state::*;
#[cfg(test)]
mod compatibility_tests;

#[program]
pub mod pipicachu_escrow {
    use super::*;
    pub fn initialize_fee_config(
        ctx: Context<InitializeFeeConfig>,
        treasury: Pubkey,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            INITIALIZER,
            EscrowError::Unauthorized
        );
        require!(treasury != Pubkey::default(), EscrowError::InvalidTerms);
        ctx.accounts.fee_config.treasury = treasury;
        ctx.accounts.fee_config.bump = ctx.bumps.fee_config;
        Ok(())
    }
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
    pub fn approve_organization(
        ctx: Context<ApproveOrganization>,
        minimum_deposit: u64,
        maximum_deal: u64,
        funding_seconds: i64,
        delivery_seconds: i64,
        review_seconds: i64,
        arbitration_seconds: i64,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.manager.key(),
            ctx.accounts.manager_config.authority,
            EscrowError::Unauthorized
        );
        require!(
            minimum_deposit >= 1_000_000
                && maximum_deal >= 1_000_000
                && maximum_deal <= 1_000_000_000_000,
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
        let org = &mut ctx.accounts.organization;
        org.authority = ctx.accounts.arbitrator.authority;
        org.mint = ctx.accounts.mint.key();
        org.approved = true;
        org.accepting = false;
        org.minimum_deposit = minimum_deposit;
        org.maximum_deal = maximum_deal;
        org.funding_seconds = funding_seconds;
        org.delivery_seconds = delivery_seconds;
        org.review_seconds = review_seconds;
        org.arbitration_seconds = arbitration_seconds;
        org.bump = ctx.bumps.organization;
        Ok(())
    }
    pub fn set_organization_approval(
        ctx: Context<ManageOrganization>,
        approved: bool,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.manager.key(),
            ctx.accounts.manager_config.authority,
            EscrowError::Unauthorized
        );
        ctx.accounts.organization.approved = approved;
        if !approved {
            ctx.accounts.organization.accepting = false;
        }
        Ok(())
    }
    pub fn set_organization_accepting(
        ctx: Context<OrganizationAction>,
        accepting: bool,
        minimum_deposit: u64,
        maximum_deal: u64,
        funding_seconds: i64,
        delivery_seconds: i64,
        review_seconds: i64,
        arbitration_seconds: i64,
    ) -> Result<()> {
        if accepting {
            let org = &ctx.accounts.organization;
            require!(
                minimum_deposit == org.minimum_deposit
                    && maximum_deal == org.maximum_deal
                    && [
                        funding_seconds,
                        delivery_seconds,
                        review_seconds,
                        arbitration_seconds
                    ] == [
                        org.funding_seconds,
                        org.delivery_seconds,
                        org.review_seconds,
                        org.arbitration_seconds
                    ],
                EscrowError::InvalidTerms
            );

            require!(
                ctx.accounts.organization.approved,
                EscrowError::OrganizationUnavailable
            );
            require!(
                ctx.accounts.arbitrator.total >= ctx.accounts.organization.minimum_deposit,
                EscrowError::InsufficientBond
            );
        }
        ctx.accounts.organization.accepting = accepting;
        Ok(())
    }
    pub fn initialize_manager(ctx: Context<InitializeManager>, authority: Pubkey) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.initializer.key(),
            INITIALIZER,
            EscrowError::Unauthorized
        );
        require!(authority != Pubkey::default(), EscrowError::InvalidTerms);
        let m = &mut ctx.accounts.manager_config;
        m.authority = authority;
        m.pending_authority = Pubkey::default();
        m.bump = ctx.bumps.manager_config;
        Ok(())
    }
    pub fn propose_manager(ctx: Context<ManagerAction>, authority: Pubkey) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.actor.key(),
            ctx.accounts.manager_config.authority,
            EscrowError::Unauthorized
        );
        require!(
            authority != Pubkey::default() && authority != ctx.accounts.actor.key(),
            EscrowError::InvalidTerms
        );
        ctx.accounts.manager_config.pending_authority = authority;
        Ok(())
    }
    pub fn accept_manager(ctx: Context<ManagerAction>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.actor.key(),
            ctx.accounts.manager_config.pending_authority,
            EscrowError::Unauthorized
        );
        require!(
            ctx.accounts.manager_config.pending_authority != Pubkey::default(),
            EscrowError::InvalidTerms
        );
        ctx.accounts.manager_config.authority = ctx.accounts.actor.key();
        ctx.accounts.manager_config.pending_authority = Pubkey::default();
        Ok(())
    }
    pub fn submit_arbitrator_application(ctx: Context<SubmitApplication>) -> Result<()> {
        if let Some(org) = load_organization(&ctx.accounts.organization.to_account_info())? {
            require!(!org.approved, EscrowError::AlreadyApproved);
        }
        let a = &mut ctx.accounts.application;
        if a.authority != Pubkey::default() {
            require_keys_eq!(
                a.authority,
                ctx.accounts.authority.key(),
                EscrowError::Unauthorized
            );
            if a.status == 0 {
                return Ok(());
            }
        }
        let now = Clock::get()?.unix_timestamp;
        a.authority = ctx.accounts.authority.key();
        a.status = 0;
        a.submitted_at = now;
        a.updated_at = now;
        a.reason_code = 0;
        a.bump = ctx.bumps.application;
        Ok(())
    }
    pub fn approve_arbitrator_application(
        ctx: Context<ApproveApplication>,
        minimum_deposit: u64,
        maximum_deal: u64,
        funding_seconds: i64,
        delivery_seconds: i64,
        review_seconds: i64,
        arbitration_seconds: i64,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.manager.key(),
            ctx.accounts.manager_config.authority,
            EscrowError::Unauthorized
        );
        require!(
            ctx.accounts.application.status == 0,
            EscrowError::ApplicationNotPending
        );
        require_keys_eq!(
            ctx.accounts.application.authority,
            ctx.accounts.arbitrator.authority,
            EscrowError::Unauthorized
        );
        configure_organization(
            &mut ctx.accounts.organization,
            ctx.accounts.arbitrator.authority,
            ctx.accounts.mint.key(),
            minimum_deposit,
            maximum_deal,
            [
                funding_seconds,
                delivery_seconds,
                review_seconds,
                arbitration_seconds,
            ],
            ctx.bumps.organization,
        )?;
        ctx.accounts.application.status = 1;
        ctx.accounts.application.reason_code = 0;
        ctx.accounts.application.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
    pub fn reject_arbitrator_application(
        ctx: Context<RejectApplication>,
        reason_code: u8,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.manager.key(),
            ctx.accounts.manager_config.authority,
            EscrowError::Unauthorized
        );
        require!(
            ctx.accounts.application.status == 0,
            EscrowError::ApplicationNotPending
        );
        require!((1..=3).contains(&reason_code), EscrowError::InvalidTerms);
        ctx.accounts.application.status = 2;
        ctx.accounts.application.reason_code = reason_code;
        ctx.accounts.application.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
    pub fn update_organization_policy(
        ctx: Context<ManageOrganization>,
        minimum_deposit: u64,
        maximum_deal: u64,
        funding_seconds: i64,
        delivery_seconds: i64,
        review_seconds: i64,
        arbitration_seconds: i64,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.manager.key(),
            ctx.accounts.manager_config.authority,
            EscrowError::Unauthorized
        );
        require!(
            !ctx.accounts.organization.accepting,
            EscrowError::OrganizationUnavailable
        );
        let org = &mut ctx.accounts.organization;
        let approved = org.approved;
        let (authority, mint, bump) = (org.authority, org.mint, org.bump);
        configure_organization(
            org,
            authority,
            mint,
            minimum_deposit,
            maximum_deal,
            [
                funding_seconds,
                delivery_seconds,
                review_seconds,
                arbitration_seconds,
            ],
            bump,
        )?;
        org.approved = approved;
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
        if let Some(org) = load_organization(&ctx.accounts.organization.to_account_info())? {
            require!(
                !org.accepting && ctx.accounts.arbitrator.locked == 0,
                EscrowError::BondLocked
            );
        }
        let a = &ctx.accounts.arbitrator;
        require!(
            amount > 0 && amount <= a.total.checked_sub(a.locked).ok_or(EscrowError::Overflow)?,
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
        ctx.accounts.arbitrator.total = ctx
            .accounts
            .arbitrator
            .total
            .checked_sub(amount)
            .ok_or(EscrowError::Overflow)?;
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
        require!(
            ctx.accounts.organization.approved && ctx.accounts.organization.accepting,
            EscrowError::OrganizationUnavailable
        );
        require!(
            amount <= ctx.accounts.organization.maximum_deal,
            EscrowError::InvalidTerms
        );
        let seller = ctx.accounts.seller.key();
        let arbitrator = ctx.accounts.arbitrator.authority;
        require!(
            buyer != seller && buyer != arbitrator && seller != arbitrator,
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
        d.arbitrator = arbitrator;
        d.mint = ctx.accounts.mint.key();
        d.nonce = nonce;
        d.amount = amount;
        d.bond = amount.div_ceil(10);
        d.fee = amount / 100;
        d.platform_fee = amount / 100;
        d.fee_version = 1;
        d.created_at = Clock::get()?.unix_timestamp;
        d.fund_by = d.created_at + funding_seconds;
        d.delivery_seconds = delivery_seconds;
        d.review_seconds = review_seconds;
        d.arbitration_seconds = arbitration_seconds;
        d.state = State::Created;
        d.approvals = 0;
        d.bump = ctx.bumps.deal;
        d.terms = terms;
        d.workflow_version = 0;
        d.resolution_policy_version = 0;
        Ok(())
    }
    pub fn create_organization_deal(
        ctx: Context<CreateOrganizationDeal>,
        nonce: u64,
        buyer: Pubkey,
        amount: u64,
        funding_seconds: i64,
        delivery_seconds: i64,
        review_seconds: i64,
        arbitration_seconds: i64,
        terms: String,
        resolution_policy_version: u8,
    ) -> Result<()> {
        require_eq!(resolution_policy_version, 1, EscrowError::InvalidTerms);
        let org = &ctx.accounts.organization;
        require!(
            org.approved && org.accepting,
            EscrowError::OrganizationUnavailable
        );
        require!(
            ctx.accounts.arbitrator.total >= org.minimum_deposit,
            EscrowError::InsufficientBond
        );
        require!(amount <= org.maximum_deal, EscrowError::InvalidTerms);
        require!(
            [
                funding_seconds,
                delivery_seconds,
                review_seconds,
                arbitration_seconds
            ] == [
                org.funding_seconds,
                org.delivery_seconds,
                org.review_seconds,
                org.arbitration_seconds
            ],
            EscrowError::InvalidTerms
        );
        require!(
            ctx.accounts
                .arbitrator
                .total
                .checked_sub(ctx.accounts.arbitrator.locked)
                .ok_or(EscrowError::Overflow)?
                >= amount.div_ceil(10),
            EscrowError::InsufficientBond
        );
        let seller = ctx.accounts.seller.key();
        let arbitrator = ctx.accounts.arbitrator.authority;
        require!(
            buyer != seller && buyer != arbitrator && seller != arbitrator,
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
        d.arbitrator = arbitrator;
        d.mint = ctx.accounts.mint.key();
        d.nonce = nonce;
        d.amount = amount;
        d.bond = amount.div_ceil(10);
        d.fee = amount / 100;
        d.platform_fee = amount / 100;
        d.fee_version = 1;
        d.created_at = Clock::get()?.unix_timestamp;
        d.fund_by = d.created_at + funding_seconds;
        d.delivery_seconds = delivery_seconds;
        d.review_seconds = review_seconds;
        d.arbitration_seconds = arbitration_seconds;
        d.state = State::Created;
        d.approvals = 1;
        d.bump = ctx.bumps.deal;
        d.terms = terms;
        d.workflow_version = 1;
        d.resolution_policy_version = 1;
        Ok(())
    }
    pub fn accept_deal(ctx: Context<Act>) -> Result<()> {
        let d = &mut ctx.accounts.deal;
        let who = ctx.accounts.actor.key();
        require!(
            d.state == State::Created && Clock::get()?.unix_timestamp < d.fund_by,
            EscrowError::WrongState
        );
        require_keys_eq!(who, d.arbitrator, EscrowError::Unauthorized);
        d.approvals = 1;
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
            d.state == State::Created && now < d.fund_by && d.approvals == 1,
            EscrowError::WrongState
        );
        if d.workflow_version == 1 {
            let org = load_organization(&ctx.accounts.organization.to_account_info())?
                .ok_or(EscrowError::OrganizationUnavailable)?;
            require!(
                org.approved && org.accepting,
                EscrowError::OrganizationUnavailable
            );
            require!(
                ctx.accounts.arbitrator.total >= org.minimum_deposit
                    && d.amount <= org.maximum_deal,
                EscrowError::InsufficientBond
            );
        }
        for a in [&mut ctx.accounts.arbitrator] {
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
        settle(ctx, true)
    }
    pub fn finalize(ctx: Context<Settle>) -> Result<()> {
        let d = &ctx.accounts.deal;
        require!(
            d.state == State::Delivered && Clock::get()?.unix_timestamp >= d.review_by,
            EscrowError::WrongState
        );
        settle(ctx, true)
    }
    pub fn refund_expired(ctx: Context<Settle>) -> Result<()> {
        let d = &ctx.accounts.deal;
        require!(
            d.state == State::Funded && Clock::get()?.unix_timestamp >= d.deliver_by,
            EscrowError::WrongState
        );
        settle(ctx, false)
    }
    pub fn resolve(ctx: Context<Settle>, pay_seller: bool, reason_hash: [u8; 32]) -> Result<()> {
        let d = &mut ctx.accounts.deal;
        let now = Clock::get()?.unix_timestamp;
        let actor = ctx.accounts.actor.key();
        require!(d.state == State::Disputed, EscrowError::WrongState);
        require!(d.resolution_policy_version <= 1, EscrowError::InvalidTerms);
        require!(
            d.resolution_policy_version == 1 || now < d.arbitrate_by,
            EscrowError::WrongState
        );
        require_keys_eq!(actor, d.arbitrator, EscrowError::Unauthorized);
        require!(reason_hash != [0; 32], EscrowError::InvalidTerms);
        d.resolution_hash = reason_hash;
        settle(ctx, pay_seller)
    }
    pub fn propose_settlement(ctx: Context<Act>, pay_seller: bool) -> Result<()> {
        let d = &mut ctx.accounts.deal;
        require!(
            d.state == State::Disputed && Clock::get()?.unix_timestamp >= d.arbitrate_by,
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
                && Clock::get()?.unix_timestamp >= d.arbitrate_by,
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
        settle(ctx, pay_seller)
    }
}
