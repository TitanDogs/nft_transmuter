use crate::VaultAuth;
use anchor_lang::prelude::*;
use solana_program::pubkey::Pubkey;

pub fn all_outputs_handled(vault_auth: &Box<Account<VaultAuth>>) -> bool {
    vault_auth
        .handled_outputs
        .clone()
        .into_iter()
        .all(|handled_output| handled_output.is_some())
}

pub fn all_inputs_handled(vault_auth: &Box<Account<VaultAuth>>) -> bool {
    vault_auth
        .handled_inputs
        .clone()
        .into_iter()
        .all(|handled_input| handled_input.is_some())
}

pub fn no_outputs_handled(vault_auth: &Box<Account<VaultAuth>>) -> bool {
    vault_auth
        .handled_outputs
        .clone()
        .into_iter()
        .all(|handled_output| handled_output.is_none())
}

pub fn all_inputs_resolved(vault_auth: &Box<Account<VaultAuth>>) -> bool {
    vault_auth
        .handled_inputs
        .iter()
        .all(|handled_input| handled_input.is_none())
}

pub fn is_mint_handled(vault_auth: &Box<Account<VaultAuth>>, mint_key: Pubkey) -> bool {
    vault_auth
        .handled_inputs
        .iter()
        .any(|&input: &Option<Pubkey>| input == Some(mint_key))
}