use std::str::FromStr;

use crate::structs::Transmuter;
use crate::{TransmuterError, VaultAuth};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

use mpl_token_metadata::instructions::{
    CreateMasterEditionV3CpiBuilder, CreateMetadataAccountV3CpiBuilder, UpdateV1CpiBuilder,
    VerifyCreatorV1CpiBuilder,
};
use mpl_token_metadata::types::{Collection, Creator, DataV2};

#[derive(Accounts)]
#[instruction(seed: u64, vault_seed: u64)]
pub struct UserClaimOutputSpl<'info> {
    #[account(mut, constraint = *creator.to_account_info().key == transmuter.creator)]
    pub creator: SystemAccount<'info>,
    #[account(mut, constraint = *user.to_account_info().key == vault_auth.user)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"transmuter", creator.key.as_ref(), seed.to_le_bytes().as_ref()],
        bump = transmuter.transmuter_bump,
    )]
    pub transmuter: Box<Account<'info, Transmuter>>,
    #[account(
        seeds = [b"auth", transmuter.key().as_ref()],
        bump
    )]
    /// CHECK: This is not dangerous because this account doesn't exist
    pub auth: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"vaultAuth", transmuter.key().as_ref(), user.key.as_ref(), vault_seed.to_le_bytes().as_ref()],
        bump,
    )]
    pub vault_auth: Box<Account<'info, VaultAuth>>,
    #[account(mut)]
    pub auth_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

impl<'info> UserClaimOutputSpl<'info> {
    pub fn transfer_from_auth(&self, &amount: &u64) -> Result<()> {
        let seeds = &[
            b"auth",
            self.transmuter.to_account_info().key.as_ref(),
            &[self.transmuter.auth_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: self.auth_ata.to_account_info(),
            to: self.user_ata.to_account_info(),
            authority: self.auth.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();

        transfer(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            amount,
        )
    }
}
