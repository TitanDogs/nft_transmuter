use crate::{structs::Transmuter, TransmuterError};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct TransmuterSetSpl<'info> {
    #[account(mut, constraint = *creator.to_account_info().key == transmuter.creator)]
    pub creator: Signer<'info>,
    #[account(
        mut,
        seeds = [b"transmuter", creator.key.as_ref(), seed.to_le_bytes().as_ref()],
        bump = transmuter.transmuter_bump,
    )]
    pub transmuter: Box<Account<'info, Transmuter>>,
    #[account(mut)]
    pub auth_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

impl<'info> TransmuterSetSpl<'info> {
    pub fn transfer_to_auth(&self, &amount: &u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: self.creator_ata.to_account_info(),
            to: self.auth_ata.to_account_info(),
            authority: self.creator.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();
        transfer(CpiContext::new(cpi_program, cpi_accounts), amount)
    }
}
