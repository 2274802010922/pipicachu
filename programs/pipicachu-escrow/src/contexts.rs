use super::*;
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
    /// CHECK: Seed-bound optional registry, validated for owner/discriminator in handlers.
    #[account(seeds=[b"organization",authority.key().as_ref()],bump)]
    pub organization: UncheckedAccount<'info>,
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
    pub arbitrator: Box<Account<'info, Arbitrator>>,
    #[account(init, payer=seller, space=8+868, seeds=[b"deal",seller.key().as_ref(), &nonce.to_le_bytes()], bump)]
    pub deal: Box<Account<'info, Deal>>,
    #[account(init, payer=seller, seeds=[b"vault",deal.key().as_ref()], bump, token::mint=mint, token::authority=deal)]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    #[account(seeds=[b"platform_fee_v1"],bump=fee_config.bump)]
    pub fee_config: Account<'info, FeeConfig>,
    #[account(seeds=[b"organization",arbitrator.authority.as_ref()],bump=organization.bump,constraint=organization.mint==mint.key())]
    pub organization: Box<Account<'info, Organization>>,
}
#[derive(Accounts)]
#[instruction(nonce:u64)]
pub struct CreateOrganizationDeal<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(seeds=[b"config"], bump=config.bump, has_one=mint)]
    pub config: Account<'info, Config>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(has_one=mint)]
    pub arbitrator: Box<Account<'info, Arbitrator>>,
    #[account(init, payer=seller, space=8+868, seeds=[b"deal",seller.key().as_ref(), &nonce.to_le_bytes()], bump)]
    pub deal: Box<Account<'info, Deal>>,
    #[account(init, payer=seller, seeds=[b"vault",deal.key().as_ref()], bump, token::mint=mint, token::authority=deal)]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    #[account(seeds=[b"platform_fee_v1"],bump=fee_config.bump)]
    pub fee_config: Account<'info, FeeConfig>,
    #[account(seeds=[b"organization",arbitrator.authority.as_ref()],bump=organization.bump,constraint=organization.mint==mint.key())]
    pub organization: Box<Account<'info, Organization>>,
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
    #[account(mut, seeds=[b"arb",deal.arbitrator.as_ref()], bump=arbitrator.bump, has_one=mint)]
    pub arbitrator: Box<Account<'info, Arbitrator>>,
    #[account(mut, token::mint=mint, token::authority=buyer)]
    pub source: Box<Account<'info, TokenAccount>>,
    #[account(mut, seeds=[b"vault",deal.key().as_ref()], bump, token::mint=mint, token::authority=deal)]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Seed-bound optional registry, validated for owner/discriminator in handlers.
    #[account(seeds=[b"organization",deal.arbitrator.as_ref()],bump)]
    pub organization: UncheckedAccount<'info>,
}
#[derive(Accounts)]
pub struct Settle<'info> {
    pub actor: Signer<'info>,
    #[account(mut, seeds=[b"deal",deal.seller.as_ref(),&deal.nonce.to_le_bytes()], bump=deal.bump, has_one=mint)]
    pub deal: Box<Account<'info, Deal>>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut, seeds=[b"arb",deal.arbitrator.as_ref()], bump=arbitrator.bump, has_one=mint)]
    pub arbitrator: Box<Account<'info, Arbitrator>>,
    #[account(mut, seeds=[b"vault",deal.key().as_ref()], bump, token::mint=mint, token::authority=deal)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(mut, token::mint=mint, constraint=buyer_token.owner==deal.buyer @ EscrowError::Unauthorized)]
    pub buyer_token: Box<Account<'info, TokenAccount>>,
    #[account(mut, token::mint=mint, constraint=seller_token.owner==deal.seller @ EscrowError::Unauthorized)]
    pub seller_token: Box<Account<'info, TokenAccount>>,
    #[account(mut, token::mint=mint, constraint=arbitrator_token.owner==deal.arbitrator @ EscrowError::Unauthorized)]
    pub arbitrator_token: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    #[account(seeds=[b"platform_fee_v1"],bump=fee_config.bump)]
    pub fee_config: Account<'info, FeeConfig>,
    #[account(mut,dup,token::mint=mint,constraint=platform_token.owner==fee_config.treasury @ EscrowError::Unauthorized,constraint=platform_token.key()!=vault.key() @ EscrowError::Unauthorized)]
    pub platform_token: Box<Account<'info, TokenAccount>>,
}
#[derive(Accounts)]
pub struct InitializeFeeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init,payer=authority,space=8+33,seeds=[b"platform_fee_v1"],bump)]
    pub fee_config: Account<'info, FeeConfig>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct ApproveOrganization<'info> {
    #[account(mut)]
    pub manager: Signer<'info>,
    #[account(has_one=mint)]
    pub arbitrator: Box<Account<'info, Arbitrator>>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(init,payer=manager,space=8+115,seeds=[b"organization",arbitrator.authority.as_ref()],bump)]
    pub organization: Box<Account<'info, Organization>>,
    pub system_program: Program<'info, System>,
    #[account(seeds=[b"manager_v1"],bump=manager_config.bump)]
    pub manager_config: Account<'info, ManagerConfig>,
}
#[derive(Accounts)]
pub struct ManageOrganization<'info> {
    pub manager: Signer<'info>,
    #[account(mut,seeds=[b"organization",organization.authority.as_ref()],bump=organization.bump)]
    pub organization: Box<Account<'info, Organization>>,
    #[account(seeds=[b"manager_v1"],bump=manager_config.bump)]
    pub manager_config: Account<'info, ManagerConfig>,
}
#[derive(Accounts)]
pub struct OrganizationAction<'info> {
    pub authority: Signer<'info>,
    #[account(mut,seeds=[b"organization",authority.key().as_ref()],bump=organization.bump,has_one=authority)]
    pub organization: Box<Account<'info, Organization>>,
    #[account(seeds=[b"arb",authority.key().as_ref()],bump=arbitrator.bump,has_one=authority,constraint=arbitrator.mint==organization.mint)]
    pub arbitrator: Box<Account<'info, Arbitrator>>,
}

#[derive(Accounts)]
pub struct InitializeManager<'info> {
    #[account(mut,address=INITIALIZER @ EscrowError::Unauthorized)]
    pub initializer: Signer<'info>,
    #[account(init,payer=initializer,space=8+65,seeds=[b"manager_v1"],bump)]
    pub manager_config: Account<'info, ManagerConfig>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct ManagerAction<'info> {
    pub actor: Signer<'info>,
    #[account(mut,seeds=[b"manager_v1"],bump=manager_config.bump)]
    pub manager_config: Account<'info, ManagerConfig>,
}
#[derive(Accounts)]
pub struct SubmitApplication<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds=[b"arb",authority.key().as_ref()],bump=arbitrator.bump,has_one=authority)]
    pub arbitrator: Account<'info, Arbitrator>,
    #[account(init_if_needed,payer=authority,space=8+51,seeds=[b"application_v1",authority.key().as_ref()],bump)]
    pub application: Account<'info, ArbitratorApplication>,
    pub system_program: Program<'info, System>,
    /// CHECK: Optional registry with seed, owner and discriminator validation.
    #[account(seeds=[b"organization",authority.key().as_ref()],bump)]
    pub organization: UncheckedAccount<'info>,
}
#[derive(Accounts)]
pub struct ApproveApplication<'info> {
    #[account(mut)]
    pub manager: Signer<'info>,
    #[account(seeds=[b"manager_v1"],bump=manager_config.bump)]
    pub manager_config: Account<'info, ManagerConfig>,
    #[account(mut,seeds=[b"application_v1",arbitrator.authority.as_ref()],bump=application.bump)]
    pub application: Account<'info, ArbitratorApplication>,
    #[account(seeds=[b"arb",arbitrator.authority.as_ref()],bump=arbitrator.bump,has_one=mint)]
    pub arbitrator: Box<Account<'info, Arbitrator>>,
    #[account(seeds=[b"config"],bump=config.bump,has_one=mint)]
    pub config: Account<'info, Config>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(init_if_needed,payer=manager,space=8+115,seeds=[b"organization",arbitrator.authority.as_ref()],bump)]
    pub organization: Box<Account<'info, Organization>>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct RejectApplication<'info> {
    pub manager: Signer<'info>,
    #[account(seeds=[b"manager_v1"],bump=manager_config.bump)]
    pub manager_config: Account<'info, ManagerConfig>,
    #[account(mut,seeds=[b"application_v1",application.authority.as_ref()],bump=application.bump)]
    pub application: Account<'info, ArbitratorApplication>,
}
