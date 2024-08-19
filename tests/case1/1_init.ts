import * as anchor from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import {
  CreateCompressedNftOutput,
  Metaplex,
  keypairIdentity,
  mockStorage,
} from "@metaplex-foundation/js";
import { confirmTxs } from "../utils";

require("dotenv").config({ path: ".env" });

// Set up our keys
export const [creator, user] = [
  new Keypair(),
  new Keypair(),
];
console.log(`creator: ${creator.publicKey}`);
console.log(`user: ${user.publicKey}`);

export const userMetaplex = Metaplex.make(anchor.getProvider().connection)
  .use(keypairIdentity(user))
  .use(mockStorage());

export const creatorMetaplex = Metaplex.make(anchor.getProvider().connection)
  .use(keypairIdentity(creator))
  .use(mockStorage());

export let inputCollection: CreateCompressedNftOutput;
export let creatorCollection: CreateCompressedNftOutput;
export let outputCollection: CreateCompressedNftOutput;
export let inputMints: CreateCompressedNftOutput[] = [];

it("Airdrop", async () => {
  await Promise.all(
    [creator, user].map(async (key) => {
      return await anchor
        .getProvider()
        .connection.requestAirdrop(
          key.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );
    })
  ).then(confirmTxs);
});

it("Creates collections", async () => {
  inputCollection = await userMetaplex.nfts().create({
    name: "Input collection",
    symbol: "INPT",
    sellerFeeBasisPoints: 500,
    uri: "https://arweave.net/qF9H_BBdjf-ZIR90_z5xXsSx8WiPB3-pHA8QTlg1oeI",
    creators: [
      {
        address: creator.publicKey,
        share: 100,
      },
    ],
    isMutable: true,
  });

  outputCollection = await creatorMetaplex.nfts().create({
    name: "Output collection",
    symbol: "OUPT",
    sellerFeeBasisPoints: 500,
    uri: "https://arweave.net/qF9H_BBdjf-ZIR90_z5xXsSx8WiPB3-pHA8QTlg1oeI",
    creators: [
      {
        address: creator.publicKey,
        share: 100,
      },
    ],
    isMutable: true,
  });

  creatorCollection = await creatorMetaplex.nfts().create({
    name: "Creator collection",
    symbol: "INPT",
    sellerFeeBasisPoints: 500,
    uri: "https://arweave.net/qF9H_BBdjf-ZIR90_z5xXsSx8WiPB3-pHA8QTlg1oeI",
    creators: [
      {
        address: creator.publicKey,
        share: 100,
      },
    ],
    isMutable: true,
  });
});

it("mints input NFT", async () => {
  const uris = [
    "https://arweave.net/qF9H_BBdjf-ZIR90_z5xXsSx8WiPB3-pHA8QTlg1oeI?Head=none&Background=blue&Outfit=cope&Breed=shiba",
    "https://arweave.net/qF9H_BBdjf-ZIR90_z5xXsSx8WiPB3-pHA8QTlg1oeI?Head=none&Background=blue&Outfit=pinkHoodie&Breed=chihuahua",
    "https://arweave.net/qF9H_BBdjf-ZIR90_z5xXsSx8WiPB3-pHA8QTlg1oeI?Head=none&Background=red&Outfit=cope&Breed=shiba",
  ];

  for (let i = 0; i < uris.length; i++) {
    let mint = await userMetaplex.nfts().create({
      name: `Generug input #${i + 1}`,
      symbol: "GNRG",
      sellerFeeBasisPoints: 500,
      uri: uris[i],
      creators: [
        {
          address: creator.publicKey,
          share: 100,
        },
      ],
      collection: inputCollection.nft.address,
      isMutable: true,
    });
    inputMints.push(mint);

    await userMetaplex.nfts().verifyCollection({
      mintAddress: mint.nft.address,
      collectionMintAddress: inputCollection.nft.address,
    });

    console.log(`The nft #${i + 1}: ${mint.nft.address}`);
  }
});
