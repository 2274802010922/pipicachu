use super::*;
#[account]
pub struct Config {
    pub mint: Pubkey,
    pub bump: u8,
}
#[account]
pub struct FeeConfig {
    pub treasury: Pubkey,
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
    pub arbitrator: Pubkey,
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
    // Appended inside existing minimum 28-byte padding; legacy accounts retain zero fee/version.
    pub platform_fee: u64,
    pub fee_version: u8,
    pub workflow_version: u8,
    pub resolution_policy_version: u8,
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
#[account]
pub struct Organization {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub approved: bool,
    pub accepting: bool,
    pub minimum_deposit: u64,
    pub maximum_deal: u64,
    pub funding_seconds: i64,
    pub delivery_seconds: i64,
    pub review_seconds: i64,
    pub arbitration_seconds: i64,
    pub bump: u8,
}
#[account]
pub struct ManagerConfig {
    pub authority: Pubkey,
    pub pending_authority: Pubkey,
    pub bump: u8,
}
#[account]
pub struct ArbitratorApplication {
    pub authority: Pubkey,
    pub status: u8,
    pub submitted_at: i64,
    pub updated_at: i64,
    pub reason_code: u8,
    pub bump: u8,
}
