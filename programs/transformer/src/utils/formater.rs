pub fn uri_from_traits(uri: &String, traits: Vec<(String, String)>) -> String {
    let mut mint_uri = uri.to_owned() + "?";

    for i in 0..traits.len() {
        let key = &traits[i].0;
        let value = &traits[i].1;

        mint_uri = mint_uri + key + "=" + value;

        if i != traits.len() - 1 {
            mint_uri = mint_uri + "&"
        }
    }

    return mint_uri;
}
