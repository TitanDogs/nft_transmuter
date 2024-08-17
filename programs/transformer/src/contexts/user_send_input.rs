use crate::VaultAuth;
use crate::{structs::Transmuter, TransmuterError};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(seed: u64, vault_seed: u64)]
pub struct UserSendInput<'info> {
    #[account(mut, constraint = *creator.to_account_info().key == transmuter.creator)]
    pub creator: SystemAccount<'info>,
    #[account(mut, constraint = *user.to_account_info().key == vault_auth.user)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub ata: Account<'info, TokenAccount>,
    #[account(mut)]
    /// CHECK: fix later
    pub metadata: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"transmuter", creator.key.as_ref(), seed.to_le_bytes().as_ref()],
        bump = transmuter.transmuter_bump,
    )]
    pub transmuter: Box<Account<'info, Transmuter>>,
    #[account(
        mut,
        seeds = [b"vaultAuth", transmuter.key().as_ref(), user.key.as_ref(), vault_seed.to_le_bytes().as_ref()],
        bump = vault_auth.vault_auth_bump,
    )]
    pub vault_auth: Box<Account<'info, VaultAuth>>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

impl<'info> UserSendInput<'info> {
    pub fn transfer_to_vault(&self) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.ata.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.user.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();
        transfer(CpiContext::new(cpi_program, cpi_accounts), 1)
    }
}
