use std::str::FromStr;

use crate::structs::Transmuter;
use crate::VaultAuth;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

use mpl_token_metadata::instructions::{
    CreateMasterEditionV3CpiBuilder, CreateMetadataAccountV3CpiBuilder,
    SetAndVerifyCollectionCpiBuilder, UpdateV1CpiBuilder, VerifyCreatorV1CpiBuilder,
};
use mpl_token_metadata::types::{Collection, Creator, DataV2};

#[derive(Accounts)]
#[instruction(seed: u64, vault_seed: u64)]
pub struct UserClaimOutputNft<'info> {
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
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub ata: Account<'info, TokenAccount>,
    #[account(mut)]
    /// CHECK: fix later
    pub metadata: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: fix later
    pub master_edition: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Metaplex will check this
    pub token_metadata_program: UncheckedAccount<'info>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub rent: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub sysvar_instructions: AccountInfo<'info>,
}

impl<'info> UserClaimOutputNft<'info> {
    pub fn mint_token(&self) -> Result<()> {
        let seeds = &[
            &b"auth"[..],
            &self.transmuter.key().to_bytes()[..],
            &[self.transmuter.auth_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: self.mint.to_account_info(),
            to: self.ata.to_account_info(),
            authority: self.auth.to_account_info(),
        };

        let mint_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );

        mint_to(mint_ctx, 1)
    }

    pub fn create_metadata(
        &self,
        title: &String,
        symbol: &String,
        uri: &String,
        collection_mint: &Option<String>,
        seller_fee_basis_point: u16,
    ) -> Result<()> {
        let seeds = &[
            &b"auth"[..],
            &self.transmuter.key().to_bytes()[..],
            &[self.transmuter.auth_bump],
        ];
        let signer_seeds = &[&seeds[..]];
        let auth_creator = Creator {
            address: self.auth.key(),
            verified: false,
            share: 0,
        };
        let creator = Creator {
            address: self.creator.key(),
            verified: false,
            share: 100,
        };

        let mut collection: Option<Collection> = None;

        if collection_mint.is_some() {
            let collection_string = collection_mint.as_ref().unwrap();
            collection = Some(Collection {
                key: Pubkey::from_str(collection_string).unwrap(),
                verified: false,
            });
        }

        let data: DataV2 = DataV2 {
            name: title.to_string(),
            symbol: symbol.to_string(),
            uri: uri.to_string(),
            seller_fee_basis_points: seller_fee_basis_point,
            creators: Some(vec![auth_creator, creator]),
            collection,
            uses: None,
        };

        let _ = CreateMetadataAccountV3CpiBuilder::new(&self.token_metadata_program)
            .metadata(&self.metadata.to_account_info())
            .mint(&self.mint.to_account_info())
            .mint_authority(&self.auth.to_account_info())
            .payer(&self.user.to_account_info())
            .update_authority(&self.auth.to_account_info(), true)
            .system_program(&self.system_program)
            .rent(Some(&self.rent))
            .data(data)
            .is_mutable(true)
            .invoke_signed(signer_seeds);

        let result = VerifyCreatorV1CpiBuilder::new(&self.token_metadata_program)
            .authority(&self.auth.to_account_info())
            .metadata(&self.metadata.to_account_info())
            .system_program(&self.system_program)
            .sysvar_instructions(&self.sysvar_instructions.to_account_info())
            .add_remaining_account(&self.token_metadata_program.to_account_info(), false, false)
            .invoke_signed(signer_seeds);

        Ok(result?)
    }

    pub fn create_master_edition(&self) -> Result<()> {
        let seeds = &[
            &b"auth"[..],
            &self.transmuter.key().to_bytes()[..],
            &[self.transmuter.auth_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let result = CreateMasterEditionV3CpiBuilder::new(&self.token_metadata_program)
            .edition(&self.master_edition.to_account_info())
            .mint(&self.mint.to_account_info())
            .update_authority(&self.auth.to_account_info())
            .mint_authority(&self.auth.to_account_info())
            .payer(&self.user.to_account_info())
            .metadata(&self.metadata.to_account_info())
            .max_supply(1)
            .token_program(&self.token_program)
            .system_program(&self.system_program)
            .rent(Some(&self.rent))
            .invoke_signed(signer_seeds);

        Ok(result?)
    }

    pub fn update_authority(&self) -> Result<()> {
        let seeds = &[
            &b"auth"[..],
            &self.transmuter.key().to_bytes()[..],
            &[self.transmuter.auth_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let result = UpdateV1CpiBuilder::new(&self.token_program.to_account_info())
            .authority(&self.auth.to_account_info())
            .mint(&self.mint.to_account_info())
            .metadata(&self.metadata.to_account_info())
            .new_update_authority(self.creator.key())
            .payer(&self.user.to_account_info())
            .system_program(&self.system_program.to_account_info())
            .sysvar_instructions(&self.sysvar_instructions.to_account_info())
            .add_remaining_account(&self.token_metadata_program.to_account_info(), false, false)
            .invoke_signed(signer_seeds);

        Ok(result?)
    }

    // pub fn set_collection(&self, collection_string: &Option<String>) -> Result<()> {
    //     let collection_mint = Pubkey::from_str(collection_string).unwrap();

    //     let seeds = &[
    //         &b"auth"[..],
    //         &self.transmuter.key().to_bytes()[..],
    //         &[self.transmuter.auth_bump],
    //     ];
    //     let signer_seeds = &[&seeds[..]];

    //     let result = SetAndVerifyCollectionCpiBuilder::new(&self.token_program.to_account_info())
    //         .metadata(&self.metadata.to_account_info())
    //         .collection_authority(self.creator.key())
    //         .payer(&self.user.to_account_info())
    //         .update_authority(self.creator.key())
    //         .collection_mint()
    //         .invoke_signed(signer_seeds);

    //     Ok(result?)
    // }
}
