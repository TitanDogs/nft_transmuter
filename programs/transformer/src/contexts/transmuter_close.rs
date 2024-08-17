use anchor_lang::prelude::*;

use crate::Transmuter;

#[derive(Accounts)]
pub struct TransmuterClose<'info> {
    #[account(mut, constraint = *creator.to_account_info().key == transmuter.creator)]
    pub creator: Signer<'info>,
    #[account(mut, close = creator)]
    pub transmuter: Box<Account<'info, Transmuter>>,
}
