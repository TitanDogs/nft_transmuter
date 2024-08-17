use super::mint::MintInfo;
use super::rule::Rule;
use serde::{Deserialize, Serialize};
use solana_program::pubkey::Pubkey;

#[derive(Serialize, Deserialize)]
pub struct OutputInfo {
    pub amount: u64,
    pub collection: Option<String>,
    pub method: String,
    pub token_standard: String,
    pub rule: Option<Rule>,
    pub uri: Option<String>,
    pub mint_info: Option<MintInfo>,
    pub mint: Option<String>,
}

impl OutputInfo {
    pub const LEN: usize = 8 //discriminator
    + 8 //u64
    + 44 //String (Pubkey)
    + 4 //String
    + 4 //String
    + Rule::LEN //Rule
    + 64 //String
    + MintInfo::LEN //MintInfo
    + 44; //String (Pubkey)
}
