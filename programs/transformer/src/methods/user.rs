use crate::{uri_from_traits, InputInfo, OutputInfo, Rule, TransmuterError, VaultAuth};
use crate::{utils::*, UserClaimOutputNft};
use anchor_lang::prelude::*;
use url::Url;

pub fn user_mint_split(ctx: &Context<UserClaimOutputNft>, output_info: &OutputInfo) -> Result<()> {
    let rule = output_info.rule.as_ref().unwrap();
    let mint_info = output_info.mint_info.as_ref().unwrap();

    msg!("Split rule");
    // NB: index 0 because it should only be 1 input uri
    let input_uri = ctx.accounts.vault_auth.input_uris[0].clone().unwrap();
    let split_traits = get_matching_traits(input_uri, rule);
    msg!("split_traits 0: {:?}", split_traits[0]);

    let mint_uri = uri_from_traits(&mint_info.uri, split_traits);
    msg!("new mint uri: {:?}", mint_uri);

    //TODO apply this to mint
    // let output_collection = &output_info.collection;

    //mint as much as input traits (max output)
    let result = &ctx.accounts.mint_token();
    let _ = &ctx.accounts.create_metadata(
        &mint_info.title,
        &mint_info.symbol,
        &mint_uri,
        &output_info.collection,
        500,
    );
    let _ = &ctx.accounts.create_master_edition();
    let _ = &ctx.accounts.update_authority();
    //SET COLLECTION
    
    match result {
        Ok(res) => res,
        Err(_e) => panic!("{}", TransmuterError::MintFailed),
    };

    Ok(())
}

pub fn user_mint_merge(ctx: &Context<UserClaimOutputNft>, output_info: &OutputInfo) -> Result<()> {
    let rule = output_info.rule.as_ref().unwrap();
    let mint_info = output_info.mint_info.as_ref().unwrap();
    let vault_auth = &ctx.accounts.vault_auth;

    let mut trait_values: Vec<(String, String)> = Vec::new();
    for j in 0..vault_auth.input_uris.len() {
        let input_uri = vault_auth.input_uris[j].clone().unwrap();
        let mut matching_traits = get_matching_traits(input_uri, rule);
        trait_values.append(&mut matching_traits);
    }

    let uri = uri_from_traits(&mint_info.uri, trait_values);

    let result = &ctx.accounts.mint_token();
    let _ = &ctx.accounts.create_metadata(
        &mint_info.title,
        &mint_info.symbol,
        &uri,
        &output_info.collection,
        500,
    );
    let _ = &ctx.accounts.create_master_edition();
    let _ = &ctx.accounts.update_authority();

    match result {
        Ok(res) => res,
        Err(_e) => panic!("{}", TransmuterError::MintFailed),
    };

    Ok(())
}

pub fn user_mint(ctx: &Context<UserClaimOutputNft>, output_info: &OutputInfo) -> Result<()> {
    let mint_info = output_info.mint_info.as_ref().unwrap();
    let result = ctx.accounts.mint_token();
    let _ = ctx.accounts.create_metadata(
        &mint_info.title,
        &mint_info.symbol,
        &mint_info.uri,
        &output_info.collection,
        500,
    );
    let _ = ctx.accounts.create_master_edition();
    let _ = ctx.accounts.update_authority();

    match result {
        Ok(res) => res,
        Err(_e) => panic!("{}", TransmuterError::MintFailed),
    };

    Ok(())
}
