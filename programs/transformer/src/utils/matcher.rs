use anchor_lang::prelude::*;
use mpl_token_metadata::accounts::Metadata;
use url::Url;

use crate::{InputInfo, Rule};

pub fn is_matching_nft<'info>(
    metadata: &AccountInfo<'info>,
    input_info: &InputInfo,
) -> Result<bool> {
    msg!("in is MATCHING");
    let mut is_match = false;

    match input_info.token_standard.as_str() {
        "nft" => {
            let input_metadata = Metadata::try_from(metadata)?;
            let collection_pubkey = input_metadata.collection.unwrap().key;

            is_match = collection_pubkey.to_string() == input_info.collection;

            if is_match {
                if input_info.rule.is_some() {
                    is_match = false;

                    msg!("There is an input rule");
                    let rule = input_info.rule.as_ref().unwrap();
                    msg!("rule.name: {:?}", rule.name);

                    if rule.name == "traits" {
                        msg!("Traits rule");
                        if rule.rule_type == "match" {
                            msg!("metadata uri, {}", &input_metadata.uri);
                            let parsed_url = Url::parse(&input_metadata.uri).unwrap();
                            msg!("parsed_url works: {:?}", parsed_url);

                            let hash_query: Vec<_> =
                                parsed_url.query_pairs().into_owned().collect();

                            //verify NFT traits
                            is_match = rule.trait_types.clone().into_iter().all(
                                |(trait_key, trait_value)| {
                                    hash_query.clone().into_iter().any(|(key, value)| {
                                        &trait_key == &key
                                            && (&trait_value == &value
                                                || &trait_value == &String::from("*"))
                                    })
                                },
                            );
                        }
                    }
                } else {
                    msg!("No rules found");
                }
            }
        }
        _ => msg!("Token standard not found"),
    };

    Ok(is_match)
}

pub fn get_matching_traits(input_uri: String, rule: &Rule) -> Vec<(String, String)> {
    let parsed_url = Url::parse(&input_uri).unwrap();
    let hash_query: Vec<_> = parsed_url.query_pairs().into_owned().collect();

    return hash_query
        .clone()
        .into_iter()
        .filter(|(key, value)| {
            rule.trait_types
                .iter()
                .any(|(trait_key, trait_value)| trait_key == key)
        })
        .collect();
}
