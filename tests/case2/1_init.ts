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
    "https://arweave.net/P5CPXPtzYkmwsL9b9fE_98pN87eZBD_kjfckSg6zx1E?DB=1&DC=1&MC=1&BC=1&LA=1&RA=1&CO=1&BO=1&EN=1&LG=1&PT=1",
    "https://arweave.net/CZkTgTg0j3NJd__1TCET9XNCEy9GBESV0L-qS7ahqvo?DB=2&DC=2&MC=2&BC=2&LA=2&RA=2&CO=2&BO=2&EN=2&LG=2&PT=2",
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

it("mints creator input NFT", async () => {
  for (let i = 0; i < 1; i++) {
    let mint = await creatorMetaplex.nfts().create({
      name: `Generug creator #${i + 1}`,
      symbol: "GNRG",
      sellerFeeBasisPoints: 500,
      uri: `https://arweave.net/qF9H_BBdjf-ZIR90_z5xXsSx8WiPB3-pHA8QTlg1oeI?Head=none&Background=blue&Outfit=cope&Breed=Shiba&Index=${
        i + 1
      }`,
      creators: [
        {
          address: creator.publicKey,
          share: 100,
        },
      ],
      collection: creatorCollection.nft.address,
      isMutable: true,
    });

    await creatorMetaplex.nfts().verifyCollection({
      mintAddress: mint.nft.address,
      collectionMintAddress: creatorCollection.nft.address,
    });

    console.log(`The creator nft #${i + 1}: ${mint.nft.address}`);
  }
});

it("updates", async () => {
  await creatorMetaplex.nfts().update(
    {
      nftOrSft: creatorCollection.nft,
      name: "test",
    },
    { commitment: "confirmed" }
  );

  const nft = await creatorMetaplex.nfts().findByMint({
    mintAddress: creatorCollection.nft.address,
  });
});
