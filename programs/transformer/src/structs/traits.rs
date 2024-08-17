use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct TraitInfo {
    pub name: String,
    pub trait_type: String,
    pub value: String,
    pub uri: String,
    pub image: String,
}

// impl TraitInfo {
//     pub const LEN: usize = 8 + 16 + 16 + 64 + 16 + 100;
// }
