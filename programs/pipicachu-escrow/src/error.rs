use super::*;
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
    #[msg("Approved organization is not accepting eligible deals")]
    OrganizationUnavailable,
    #[msg("Application is not pending review")]
    ApplicationNotPending,
    #[msg("This organization is already approved")]
    AlreadyApproved,
}
