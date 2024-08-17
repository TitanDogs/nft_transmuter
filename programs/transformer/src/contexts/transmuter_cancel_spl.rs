use crate::{structs::Transmuter, TransmuterError};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct TransmuterCancelSpl<'info> {
    #[account(mut, constraint = *creator.to_account_info().key == transmuter.creator)]
    pub creator: Signer<'info>,
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
    #[account(mut)]
    pub auth_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

impl<'info> TransmuterCancelSpl<'info> {
    pub fn transfer_from_auth(&self, &amount: &u64) -> Result<()> {
        let seeds = &[
            b"auth",
            self.transmuter.to_account_info().key.as_ref(),
            &[self.transmuter.auth_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: self.auth_ata.to_account_info(),
            to: self.creator_ata.to_account_info(),
            authority: self.auth.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();

        transfer(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            amount,
        )
    }
}
