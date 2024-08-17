use anchor_lang::prelude::*;

#[account]
pub struct VaultAuth {
    pub transmuter: Pubkey,
    pub user: Pubkey,
    pub seed: u64,
    pub creator_locked: bool,
    pub user_locked: bool,
    pub handled_inputs: Vec<Option<Pubkey>>,
    pub handled_outputs: Vec<Option<Pubkey>>,
    pub vault_auth_bump: u8,
    pub input_uris: Vec<Option<String>>,
}

impl VaultAuth {
    pub const LEN: usize = 8 //Discriminator
    + 32 //Pubkey
    + 32 //Pubkey
    + 8 //u64
    + 1 //bool
    + 1 //bool
    + 5 * 32 //Vec pubkey (5 max)
    + 5 * 32 //Vec pubkey (5 max)
    + 1 //u8
    + 1 * 24; //Vec string
}
