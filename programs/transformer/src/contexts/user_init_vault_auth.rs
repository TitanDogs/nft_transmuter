use crate::structs::Transmuter;
use crate::VaultAuth;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
#[instruction(seed: u64, vault_seed: u64)]
pub struct UserInitVaultAuth<'info> {
    #[account(mut, constraint = *creator.to_account_info().key == transmuter.creator)]
    pub creator: SystemAccount<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"transmuter", creator.key.as_ref(), seed.to_le_bytes().as_ref()],
        bump = transmuter.transmuter_bump,
    )]
    pub transmuter: Box<Account<'info, Transmuter>>,
    #[account(
        init,
        payer = user,
        seeds = [b"vaultAuth", transmuter.key().as_ref(), user.key.as_ref(), vault_seed.to_le_bytes().as_ref()],
        bump,
        space = 10000,
    )]
    pub vault_auth: Box<Account<'info, VaultAuth>>,
    pub system_program: Program<'info, System>,
}
