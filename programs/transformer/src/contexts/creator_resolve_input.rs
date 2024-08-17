use crate::VaultAuth;
use crate::{structs::Transmuter, TransmuterError};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(seed: u64, vault_seed: u64)]
pub struct CreatorResolveInput<'info> {
    #[account(mut, constraint = *creator.to_account_info().key == transmuter.creator)]
    pub creator: Signer<'info>,
    #[account(mut, constraint = *user.to_account_info().key == vault_auth.user)]
    pub user: SystemAccount<'info>,
    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub ata: Account<'info, TokenAccount>,
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

impl<'info> CreatorResolveInput<'info> {
    pub fn transfer_from_vault(&self, vault_seed: u64) -> Result<()> {
        let vault_seed_bytes = vault_seed.to_le_bytes();
        let seeds = &[
            b"vaultAuth",
            self.transmuter.to_account_info().key.as_ref(),
            self.user.to_account_info().key.as_ref(),
            &vault_seed_bytes.as_ref(),
            &[self.vault_auth.vault_auth_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: self.vault.to_account_info(),
            to: self.ata.to_account_info(),
            authority: self.vault_auth.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();

        transfer(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            1,
        )
    }
}
