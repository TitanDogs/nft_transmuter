use anchor_lang::prelude::*;
use anchor_spl::token::{burn, transfer, Burn, TokenAccount, Transfer};

use mpl_token_metadata::accounts::Metadata;

use url::Url;

mod contexts;
use contexts::*;

mod errors;
use errors::*;

mod structs;
use structs::*;

mod utils;
use utils::*;

mod methods;
use methods::*;

// use spl_token::solana_program::program::invoke_signed;

declare_id!("E92y64UApEZnqJRsxrxRK6Jmp6nCD4hu59kqqegqNNN4");

#[program]
pub mod transmuter {
    use super::*;

    // Transmuter methods
    pub fn transmuter_create(
        ctx: Context<TransmuterCreate>,
        seed: u64,
        config_json: String,
    ) -> Result<()> {
        //Fee 0.75 SOL
        let _ = ctx
            .accounts
            .pay_fee(ctx.accounts.owner.to_account_info(), 75000000);

        //Fee 0.25 SOL
        let _ = ctx
            .accounts
            .pay_fee(ctx.accounts.wba.to_account_info(), 25000000);
        //if output rule is split, there could only be one input!
        //if output rule is merge, there could only be one output!

        let transmuter = &mut ctx.accounts.transmuter;
        transmuter.seed = seed;
        transmuter.creator = ctx.accounts.creator.as_ref().key();
        transmuter.auth_bump = ctx.bumps.auth;
        transmuter.transmuter_bump = ctx.bumps.transmuter;
        transmuter.transmute_count = 0;
        transmuter.locked = true;

        let transmuter_config: Config = parse_json::<Config>(&config_json).unwrap();
        transmuter.transmute_max = transmuter_config.transmute_max;
        transmuter.traits_uri = transmuter_config.traits_uri;

        Ok(())
    }

    pub fn transmuter_create_holder(
        ctx: Context<TransmuterCreateHolder>,
        seed: u64,
        config_json: String,
    ) -> Result<()> {
        let ata = &ctx.accounts.holder_ata.to_account_info();
        let mut ata_data: &[u8] = &ata.try_borrow_data()?;
        let deserialized_ata = TokenAccount::try_deserialize(&mut ata_data)?;

        require!(
            deserialized_ata.owner.key() == ctx.accounts.creator.key()
                && deserialized_ata.amount == 1,
            TransmuterError::InvalidNFTOwner
        );

        let metadata: Metadata =
            Metadata::try_from(&ctx.accounts.holder_metadata.to_account_info())?;
        let collection_pubkey = metadata.collection.unwrap().key;

        msg!("collection_pubkey: {:?}", collection_pubkey);
        //TODO fix this
        require!(
            collection_pubkey.key() == collection_pubkey.key(),
            TransmuterError::InvalidNFTOwner
        );

        let transmuter = &mut ctx.accounts.transmuter;
        transmuter.seed = seed;
        transmuter.creator = ctx.accounts.creator.as_ref().key();
        transmuter.auth_bump = ctx.bumps.auth;
        transmuter.transmuter_bump = ctx.bumps.transmuter;
        transmuter.transmute_count = 0;
        transmuter.locked = true;

        let transmuter_config: Config = parse_json::<Config>(&config_json).unwrap();
        transmuter.transmute_max = transmuter_config.transmute_max;
        transmuter.traits_uri = transmuter_config.traits_uri;

        Ok(())
    }

    pub fn transmuter_set(
        ctx: Context<TransmuterSet>,
        _seed: u64,
        config_json: String,
    ) -> Result<()> {
        let transmuter = &mut ctx.accounts.transmuter;
        let transmuter_config: Config = parse_json::<Config>(&config_json).unwrap();
        transmuter.transmute_max = transmuter_config.transmute_max;
        transmuter.traits_uri = transmuter_config.traits_uri;

        //TODO: update transmuter size from input/output length
        Ok(())
    }

    pub fn transmuter_set_input(
        ctx: Context<TransmuterSet>,
        _seed: u64,
        input_json: String,
    ) -> Result<()> {
        let transmuter = &mut ctx.accounts.transmuter;
        transmuter.inputs.push(input_json);
        Ok(())
    }

    pub fn transmuter_set_output(
        ctx: Context<TransmuterSet>,
        _seed: u64,
        output_json: String,
    ) -> Result<()> {
        let transmuter = &mut ctx.accounts.transmuter;

        let output_info = parse_json::<OutputInfo>(&output_json)?;
        let is_spl = output_info.token_standard == "spl";
        require!(!is_spl, TransmuterError::InvalidMethod);

        transmuter.outputs.push(output_json);
        Ok(())
    }

    pub fn transmuter_set_output_spl(
        ctx: Context<TransmuterSetSpl>,
        _seed: u64,
        output_json: String,
        amount: u64,
    ) -> Result<()> {
        let transmuter = &mut ctx.accounts.transmuter;

        let output_info = parse_json::<OutputInfo>(&output_json)?;
        let is_spl = output_info.token_standard == "spl";
        require!(is_spl, TransmuterError::InvalidMethod);
        require!(amount > 0, TransmuterError::InvalidAmount);

        ctx.accounts.transfer_to_auth(&amount);
        ctx.accounts.transmuter.outputs.push(output_json);
        Ok(())
    }

    pub fn transmuter_add_output_spl(
        ctx: Context<TransmuterSetSpl>,
        _seed: u64,
        amount: u64,
    ) -> Result<()> {
        let transmuter = &mut ctx.accounts.transmuter;

        require!(amount > 0, TransmuterError::InvalidAmount);

        ctx.accounts.transfer_to_auth(&amount);
        Ok(())
    }

    pub fn transmuter_cancel_output_spl(
        ctx: Context<TransmuterCancelSpl>,
        _seed: u64,
        index: u64,
    ) -> Result<()> {
        let transmuter = &mut ctx.accounts.transmuter;

        require!(
            index >= 0 && transmuter.outputs.len() > (index as usize),
            TransmuterError::InvalidIndex
        );

        let output_json = &transmuter.outputs[index as usize];
        let output_info = parse_json::<OutputInfo>(output_json)?;
        let is_spl = output_info.token_standard == "spl";
        require!(is_spl, TransmuterError::InvalidMethod);

        ctx.accounts
            .transfer_from_auth(&ctx.accounts.auth_ata.amount);
        ctx.accounts.transmuter.outputs.remove(index as usize);
        Ok(())
    }

    pub fn transmuter_pause(ctx: Context<TransmuterSet>, _seed: u64) -> Result<()> {
        ctx.accounts.transmuter.locked = true;
        Ok(())
    }

    pub fn transmuter_resume(ctx: Context<TransmuterSet>, _seed: u64) -> Result<()> {
        ctx.accounts.transmuter.locked = false;
        Ok(())
    }

    pub fn transmuter_close(_ctx: Context<TransmuterClose>) -> Result<()> {
        Ok(())
    }

    // User methods
    pub fn user_init_vault_auth<'info>(
        ctx: Context<UserInitVaultAuth>,
        _seed: u64,
        vault_seed: u64,
    ) -> Result<()> {
        let transmuter = &ctx.accounts.transmuter;
        require!(!transmuter.locked, TransmuterError::IsLocked);

        let is_max_reached = transmuter.transmute_max.is_some()
            && transmuter.transmute_count >= transmuter.transmute_max.unwrap();
        require!(!is_max_reached, TransmuterError::MaxReached);

        let transmuter_inputs = parse_json_vec::<InputInfo>(&transmuter.inputs)?;
        let transmuter_outputs = parse_json_vec::<OutputInfo>(&transmuter.outputs)?;
        require!(transmuter_inputs.len() > 0, TransmuterError::InputsNotSet);
        require!(transmuter_outputs.len() > 0, TransmuterError::OutputsNotSet);

        ctx.accounts.vault_auth.vault_auth_bump = ctx.bumps.vault_auth;

        // Vault auth info
        ctx.accounts.vault_auth.transmuter = transmuter.key();
        ctx.accounts.vault_auth.user = ctx.accounts.user.key();
        ctx.accounts.vault_auth.seed = vault_seed;

        //Init locks
        ctx.accounts.vault_auth.user_locked = false;
        ctx.accounts.vault_auth.creator_locked = true;

        //Init trackers
        ctx.accounts.vault_auth.handled_inputs =
            (0..transmuter_inputs.len()).map(|_| None).collect();
        ctx.accounts.vault_auth.input_uris = (0..transmuter_inputs.len()).map(|_| None).collect();
        ctx.accounts.vault_auth.handled_outputs =
            (0..transmuter_outputs.len()).map(|_| None).collect();

        Ok(())
    }

    pub fn user_send_input<'info>(
        ctx: Context<UserSendInput>,
        _seed: u64,
        vault_seed: u64,
    ) -> Result<()> {
        let transmuter = &ctx.accounts.transmuter;
        require!(!transmuter.locked, TransmuterError::IsLocked);
        require!(
            !&ctx.accounts.vault_auth.user_locked,
            TransmuterError::UserLocked
        );

        let is_max_reached = transmuter.transmute_max.is_some()
            && transmuter.transmute_count >= transmuter.transmute_max.unwrap();
        require!(!is_max_reached, TransmuterError::MaxReached);

        let transmuter_inputs = parse_json_vec::<InputInfo>(&transmuter.inputs)?;

        //Find an input_info match
        let mut is_match = false;
        for index in 0..transmuter_inputs.len() {
            if ctx.accounts.vault_auth.handled_inputs.len() > 0
                && ctx.accounts.vault_auth.handled_inputs[index].is_some()
            {
                msg!("Index {:?} already exist in vault_auth", index);
                continue;
            }

            is_match = is_matching_nft(
                &ctx.accounts.metadata.to_account_info(),
                &transmuter_inputs[index],
            )?;

            if is_match {
                ctx.accounts.vault_auth.handled_inputs[index] = Some(ctx.accounts.mint.key());
                //TODO Maybe optional if split or merge
                let input_metadata: Metadata =
                    Metadata::try_from(&ctx.accounts.metadata.to_account_info())?;
                ctx.accounts.vault_auth.input_uris[index] = Some(input_metadata.uri);
            }
        }

        require!(is_match, TransmuterError::InvalidInputAccount);

        ctx.accounts.transfer_to_vault();

        Ok(())
    }

    pub fn user_cancel_input<'info>(
        ctx: Context<UserCancelInput>,
        _seed: u64,
        vault_seed: u64,
    ) -> Result<()> {
        let transmuter = &ctx.accounts.transmuter;
        let vault_auth = &ctx.accounts.vault_auth;

        require!(!transmuter.locked, TransmuterError::IsLocked);
        require!(!vault_auth.user_locked, TransmuterError::UserLocked);
        require!(
            is_mint_handled(vault_auth, ctx.accounts.mint.key()),
            TransmuterError::InvalidInputAccount
        );

        ctx.accounts.transfer_from_vault(vault_seed);

        let input_info_index = vault_auth
            .handled_inputs
            .iter()
            .position(|&input: &Option<Pubkey>| input == Some(ctx.accounts.mint.key()))
            .unwrap();
        ctx.accounts.vault_auth.handled_inputs[input_info_index] = None;

        Ok(())
    }

    pub fn user_claim_output_nft<'info>(
        ctx: Context<UserClaimOutputNft>,
        _seed: u64,
        _vault_seed: u64,
    ) -> Result<()> {
        let vault_auth = &ctx.accounts.vault_auth;
        let is_first_claim = no_outputs_handled(vault_auth);

        let mut transmuter = &ctx.accounts.transmuter;
        require!(!transmuter.locked, TransmuterError::IsLocked);

        if is_first_claim {
            let is_max_reached = transmuter.transmute_max.is_some()
                && transmuter.transmute_count >= transmuter.transmute_max.unwrap();
            require!(!is_max_reached, TransmuterError::MaxReached);
        }

        let transmuter_outputs = parse_json_vec::<OutputInfo>(&transmuter.outputs)?;
        require!(
            transmuter_outputs.len() > 0,
            TransmuterError::IsNotClaimable
        );

        //TODO sync handled output in case of creator post launch change
        require!(
            transmuter_outputs.len() == vault_auth.handled_outputs.len(),
            TransmuterError::HandledOutputsUnsynced
        );

        let output_handled = all_outputs_handled(vault_auth);
        require!(!output_handled, TransmuterError::IsComplete);

        let inputs_handled = all_inputs_handled(vault_auth);
        require!(inputs_handled, TransmuterError::MissingInputs);

        for index in 0..transmuter_outputs.len() {
            if ctx.accounts.vault_auth.handled_outputs[index] != None {
                continue;
            }

            //handle output
            let output_info: &OutputInfo = &transmuter_outputs[index];
            let mut has_minted = false;

            if output_info.rule.is_some() {
                let rule = output_info.rule.as_ref().unwrap();
                let mint_info = output_info.mint_info.as_ref().unwrap();

                if rule.name == "split" {
                    user_mint_split(&ctx, output_info);
                    has_minted = true;
                } else if rule.name == "merge" {
                    user_mint_merge(&ctx, output_info);
                    has_minted = true;
                } else {
                    msg!("Rule not found");
                }
            } else {
                //TODO ADD COLLECTION
                msg!("There is no rule");
                user_mint(&ctx, output_info);
                has_minted = true;
            }

            require!(has_minted, TransmuterError::MintFailed);
            if is_first_claim {
                ctx.accounts.transmuter.transmute_count += 1;
            }
            ctx.accounts.vault_auth.handled_outputs[index] = Some(ctx.accounts.mint.key());
            break;
        }

        ctx.accounts.vault_auth.user_locked = true;
        ctx.accounts.vault_auth.creator_locked = !all_outputs_handled(&ctx.accounts.vault_auth);

        Ok(())
    }

    pub fn user_claim_output_spl<'info>(
        ctx: Context<UserClaimOutputSpl>,
        _seed: u64,
        _vault_seed: u64,
    ) -> Result<()> {
        let vault_auth = &ctx.accounts.vault_auth;
        let is_first_claim = no_outputs_handled(vault_auth);

        let mut transmuter = &ctx.accounts.transmuter;
        require!(!transmuter.locked, TransmuterError::IsLocked);

        if is_first_claim {
            let is_max_reached = transmuter.transmute_max.is_some()
                && transmuter.transmute_count >= transmuter.transmute_max.unwrap();
            require!(!is_max_reached, TransmuterError::MaxReached);
        }

        let transmuter_outputs = parse_json_vec::<OutputInfo>(&transmuter.outputs)?;
        require!(
            transmuter_outputs.len() > 0,
            TransmuterError::IsNotClaimable
        );

        //TODO sync handled output in case of creator post launch change
        require!(
            transmuter_outputs.len() == vault_auth.handled_outputs.len(),
            TransmuterError::HandledOutputsUnsynced
        );

        let output_handled = all_outputs_handled(vault_auth);
        require!(!output_handled, TransmuterError::IsComplete);

        let inputs_handled = all_inputs_handled(vault_auth);
        require!(inputs_handled, TransmuterError::MissingInputs);

        for index in 0..transmuter_outputs.len() {
            if ctx.accounts.vault_auth.handled_outputs[index] != None {
                continue;
            }

            //handle output
            let output_info: &OutputInfo = &transmuter_outputs[index];
            let mut has_minted = false;

            ctx.accounts.transfer_from_auth(&output_info.amount);
            has_minted = true;

            require!(has_minted, TransmuterError::MintFailed);

            if is_first_claim {
                ctx.accounts.transmuter.transmute_count += 1;
            }
            ctx.accounts.vault_auth.handled_outputs[index] = Some(ctx.accounts.user_ata.key());
            break;
        }

        ctx.accounts.vault_auth.user_locked = true;
        ctx.accounts.vault_auth.creator_locked = !all_outputs_handled(&ctx.accounts.vault_auth);

        Ok(())
    }

    // Creator methods
    pub fn creator_resolve_input<'info>(
        ctx: Context<CreatorResolveInput>,
        _seed: u64,
        vault_seed: u64,
    ) -> Result<()> {
        let transmuter = &ctx.accounts.transmuter;
        let transmuter_inputs = parse_json_vec::<InputInfo>(&transmuter.inputs)?;
        let vault_auth = &ctx.accounts.vault_auth;

        require!(!vault_auth.creator_locked, TransmuterError::NotClaimed);

        require!(
            vault_auth
                .handled_inputs
                .contains(&Some(ctx.accounts.mint.key())),
            TransmuterError::InvalidInputAccount
        );

        let input_info_index = vault_auth
            .handled_inputs
            .iter()
            .position(|&input: &Option<Pubkey>| input == Some(ctx.accounts.mint.key()))
            .unwrap();
        let input_info: &InputInfo = &transmuter_inputs[input_info_index];

        require!(
            input_info.method.as_str() == "transfer",
            TransmuterError::InvalidResolveMethod
        );

        ctx.accounts.transfer_from_vault(vault_seed);

        ctx.accounts.vault_auth.handled_inputs[input_info_index] = None;

        if all_inputs_resolved(&ctx.accounts.vault_auth) {
            ctx.accounts
                .vault_auth
                .close(ctx.accounts.user.to_account_info())?;
        }

        Ok(())
    }

    pub fn creator_burn_input<'info>(
        ctx: Context<CreatorBurnInput>,
        _seed: u64,
        vault_seed: u64,
    ) -> Result<()> {
        let transmuter = &ctx.accounts.transmuter;
        let transmuter_inputs = parse_json_vec::<InputInfo>(&transmuter.inputs)?;
        let vault_auth = &ctx.accounts.vault_auth;

        require!(!vault_auth.creator_locked, TransmuterError::NotClaimed);

        require!(
            vault_auth
                .handled_inputs
                .contains(&Some(ctx.accounts.mint.key())),
            TransmuterError::InvalidInputAccount
        );

        let input_info_index = vault_auth
            .handled_inputs
            .iter()
            .position(|&input: &Option<Pubkey>| input == Some(ctx.accounts.mint.key()))
            .unwrap();
        let input_info: &InputInfo = &transmuter_inputs[input_info_index];

        require!(
            input_info.method.as_str() == "burn",
            TransmuterError::InvalidResolveMethod
        );

        let vault_seed_bytes = vault_seed.to_le_bytes();
        let seeds = &[
            b"vaultAuth",
            ctx.accounts.transmuter.to_account_info().key.as_ref(),
            ctx.accounts.user.to_account_info().key.as_ref(),
            &vault_seed_bytes.as_ref(),
            &[vault_auth.vault_auth_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.vault_auth.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        burn(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            1,
        )?;

        ctx.accounts.vault_auth.handled_inputs[input_info_index] = None;

        if all_inputs_resolved(&ctx.accounts.vault_auth) {
            ctx.accounts
                .vault_auth
                .close(ctx.accounts.user.to_account_info())?;
        }

        Ok(())
    }
}
