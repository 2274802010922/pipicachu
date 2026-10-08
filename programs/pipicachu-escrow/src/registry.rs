use super::*;
pub(crate) fn load_organization(info: &AccountInfo) -> Result<Option<Organization>> {
    if info.data_is_empty() {
        return Ok(None);
    }
    require_keys_eq!(*info.owner, crate::ID, EscrowError::Unauthorized);
    let data = info.try_borrow_data()?;
    Ok(Some(Organization::try_deserialize(&mut &data[..])?))
}
pub(crate) fn configure_organization(
    org: &mut Organization,
    authority: Pubkey,
    mint: Pubkey,
    minimum: u64,
    maximum: u64,
    times: [i64; 4],
    bump: u8,
) -> Result<()> {
    require!(
        (1_000_000..=1_000_000_000_000).contains(&minimum)
            && (1_000_000..=1_000_000_000_000).contains(&maximum),
        EscrowError::InvalidTerms
    );
    for time in times {
        require!(
            (10..=MAX_SECONDS).contains(&time),
            EscrowError::InvalidTerms
        );
    }
    org.authority = authority;
    org.mint = mint;
    org.approved = true;
    org.accepting = false;
    org.minimum_deposit = minimum;
    org.maximum_deal = maximum;
    org.funding_seconds = times[0];
    org.delivery_seconds = times[1];
    org.review_seconds = times[2];
    org.arbitration_seconds = times[3];
    org.bump = bump;
    Ok(())
}
