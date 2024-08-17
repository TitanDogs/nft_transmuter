use anchor_lang::error::Error;
use serde::Deserialize;
use solana_program::msg;

pub fn parse_json_vec<'a, T>(json_vec: &'a Vec<String>) -> Result<Vec<T>, Error>
where
    T: Deserialize<'a>,
{
    let mut result = Vec::new();
    for index in 0..json_vec.len() {
        result.push(serde_json::from_str::<T>(&json_vec[index]).unwrap())
    }

    Ok(result)
}

pub fn parse_json<'a, T>(json_vec: &'a String) -> Result<T, Error>
where
    T: Deserialize<'a>,
{
    let result = serde_json::from_str::<T>(&json_vec).unwrap();
    Ok(result)
}
