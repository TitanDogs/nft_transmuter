use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Config {
    pub input_length: u64,
    pub output_length: u64,
    pub transmute_max: Option<u64>,
    pub traits_uri: Option<String>,
}

impl Config {
    pub const LEN: usize = 8 //Discriminator
    + 8 //u64
    + 8 //u64
    + 8 //u64
    + 24; //String
}
