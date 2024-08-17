use crate::errors::TransmuterError;
use crate::structs::{Config, InputInfo, OutputInfo, Transmuter};
use crate::utils::parse_json;
use anchor_lang::prelude::*;
use std::str::FromStr;

#[derive(Accounts)]
#[instruction(seed: u64, config_json: String)]
pub struct TransmuterCreate<'info> {
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
    pub system_program: Program<'info, System>,
    /// CHECK: This is not dangerous because this account is only receiving SOL
    #[account(mut,address=Pubkey::from_str("CHv326keHnnfBMvNFe1TB9dqNraUnUEBDmeCZJVqLhCi").unwrap())]
    pub owner: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because this account is only receiving SOL
    #[account(mut,address=Pubkey::from_str("3LSY4UTEFt7V7eGsiaAUDzn3iKAJFBPkYseXpdECFknF").unwrap())]
    pub wba: UncheckedAccount<'info>,
}

impl<'info> TransmuterCreate<'info> {
    pub fn pay_fee(&self, to_account: AccountInfo<'info>, lamports: u64) -> Result<()> {
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &self.creator.key(),
            &to_account.key(),
            lamports,
        );

        let tx = anchor_lang::solana_program::program::invoke(
            &ix,
            &[self.creator.to_account_info(), to_account],
        );

        match tx {
            Ok(res) => res,
            Err(_e) => panic!("{}", TransmuterError::CreationFeeError),
        };

        Ok(())
    }
}
