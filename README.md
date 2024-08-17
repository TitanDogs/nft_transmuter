# NFT transmuter
Anchor program to create a transmuter that swaps NFTs between a creator and users through an escrow.
- A creator can initiate a transmuter, add inputs and outputs rules.
- A user can provide matching inputs and mint output previously determined.
- The creator can burn or withdraw the user NFT in escrow.

1/ Create a .env file and fill in the following variable:  
NFT_STORAGE_KEY=

2/ run `npm install` in the root directory.

3/ run `npm run validator` to start the local validator with the metaplex program clone.

4/ run `anchor build`.

5/ run `anchor run test` to start the test cases.

6/ You can run `solana logs --url localhost` for program logs.

# Features:  
## Case 0 - Transfer NFT
Transfer an NFT from a specific collection to mint a new NFT.

## Case 1 - Burn NFT with traits
Burn an NFT from a specific collection and with specific traits to mint a new NFT.

## Case 2 - Split rule
Transfer an NFT from a specific collection to mint several NFTs each with one matching trait.
Requirements:
- Traits type and values are turned into ids to be placed in the NFT uri.
- JSON of all trait ids should be provided as an uri in transmuter config. 
- Specific Traits to port on output NFT should be defined in the output rule.
- Node server is required after mint to update the NFT metadata from the trait ids located in the NFT uri.
NB: Similarly should be able to merge but test case not created

## Case 3 - SPL token
Transfer an NFT from a specific collection to receive an SPL token from the escrow.

# Related video tutorials:  
- N/A