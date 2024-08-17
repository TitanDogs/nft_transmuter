use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Indexes {
    pub mint: usize,
    pub metadata: usize,
    pub ata: Option<usize>,
    pub creator_ata: Option<usize>,
    pub master_edition: Option<usize>,
}
