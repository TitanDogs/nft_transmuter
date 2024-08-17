use crate::structs::{Config, InputInfo, OutputInfo, Transmuter};
use crate::utils::parse_json;
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

#[derive(Accounts)]
#[instruction(seed: u64, config_json: String)]
pub struct TransmuterCreateHolder<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        seeds = [b"transmuter", creator.key.as_ref(), seed.to_le_bytes().as_ref()],
        bump,
        space =  Transmuter::LEN + parse_json::<Config>(&config_json).unwrap().input_length as usize * InputInfo::LEN + parse_json::<Config>(&config_json).unwrap().output_length as usize * OutputInfo::LEN,
    )]
    pub transmuter: Box<Account<'info, Transmuter>>,
    #[account(
        seeds = [b"auth", transmuter.key().as_ref()],
        bump
    )]
    /// CHECK: This is not dangerous because this account doesn't exist
    pub auth: UncheckedAccount<'info>,
    #[account(mut)]
    pub holder_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    /// CHECK: fix later
    pub holder_metadata: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
