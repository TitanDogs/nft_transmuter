import * as anchor from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  CreateCompressedNftOutput,
  Metaplex,
  keypairIdentity,
  mockStorage,
} from "@metaplex-foundation/js";
import {
  TOKEN_DECIMALS,
  TOKEN_METADATA_PROGRAM_ID,
  confirmTxs,
} from "../utils";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";

require("dotenv").config({ path: ".env" });

// Set up our keys
export const [creator, user] = [
  new Keypair(),
  new Keypair(),
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
export let inputMints: CreateCompressedNftOutput[] = [];
export let creatorMint: PublicKey;

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

it("mints creator token", async () => {
  creatorMint = await createMint(
    anchor.getProvider().connection,
    creator,
    creator.publicKey,
    null,
    6
  );

  const metadata_seeds = [
    Buffer.from("metadata"),
    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    creatorMint.toBuffer(),
  ];

  const [metadata_pda, _bump] = PublicKey.findProgramAddressSync(
    metadata_seeds,
    TOKEN_METADATA_PROGRAM_ID
  );

  const ix1 = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadata_pda,
      mint: creatorMint,
      mintAuthority: creator.publicKey,
      payer: creator.publicKey,
      updateAuthority: creator.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: {
          name: "BOLT",
          collection: null,
          creators: null,
          sellerFeeBasisPoints: 0,
          symbol: "BOLT",
          uri: "https://arweave.net/q5jXzT5EZ3JBxrSMqyeXC1f6eyfv6B-Kqkl3wi5SuAw",
          uses: null,
        },
        isMutable: true,
        collectionDetails: null,
      },
    }
  );
  const tx = new Transaction().add(ix1);
  await sendAndConfirmTransaction(anchor.getProvider().connection, tx, [
    creator,
  ]);

  const ata = await getOrCreateAssociatedTokenAccount(
    anchor.getProvider().connection,
    creator,
    creatorMint,
    creator.publicKey
  );

  await mintTo(
    anchor.getProvider().connection,
    creator,
    creatorMint,
    ata.address,
    creator,
    10 * TOKEN_DECIMALS
  );
});
