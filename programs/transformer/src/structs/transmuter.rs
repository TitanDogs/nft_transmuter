use anchor_lang::prelude::*;

#[account]
pub struct Transmuter {
    pub creator: Pubkey,
    pub seed: u64,
    pub locked: bool,
    pub auth_bump: u8,
    pub transmuter_bump: u8,
    pub inputs: Vec<String>,
    pub outputs: Vec<String>,
    pub traits_uri: Option<String>,
    pub transmute_max: Option<u64>,
    pub transmute_count: u64,
}

//Vector max size?
impl Transmuter {
    pub const LEN: usize = 8 //Discriminator
    + 32 //Pubkey
    + 8 //u64
    + 1 //bool
    + 1 //u8
    + 1 //u8
    + 128 //Vec<String>
    + 128 //Vec<String>
    + 24 //String
    + 8 //u64
    + 8; //u64
}
