use super::rule::Rule;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct InputInfo {
    pub amount: u64,
    pub collection: String,
    pub method: String,
    pub token_standard: String,
    pub rule: Option<Rule>,
}

impl InputInfo {
    pub const LEN: usize = 8 + 44 + 8 + 4 + Rule::LEN;
}
