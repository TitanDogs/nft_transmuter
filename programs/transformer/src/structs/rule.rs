use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Rule {
    pub name: String,
    pub rule_type: String,
    pub trait_types: Vec<(String, String)>,
}

impl Rule {
    pub const LEN: usize = 5 + 4 + 5 * 10 * 2;
}
