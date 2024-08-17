import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { creator, inputMints, user, userMetaplex } from "./1_init";
import {
  TOKEN_METADATA_PROGRAM_ID,
  confirmTx,
  getMasterEdition,
  getMetadata,
  getTransmuterStruct,
  getvaultAuthStruct,
  modifyComputeUnits,
  isUriValid,
} from "../utils";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID as associatedTokenProgram,
  createMint,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID as tokenProgram,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { auth, getTraitId, seed } from "./2_transmuter";
import { randomBytes } from "crypto";
import { program } from "..";
import { Metadata } from "@metaplex-foundation/js";

export const vaultSeed = new anchor.BN(randomBytes(8));

it("should init vault auth", async () => {
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  const vaultAuth = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vaultAuth"),
      transmuter.publicKey.toBytes(),
      user.publicKey.toBytes(),
      vaultSeed.toBuffer().reverse(),
    ],
    program.programId
  )[0];

  console.log("vaultAuth: ", vaultAuth.toBase58());

  await program.methods
    .userInitVaultAuth(seed, vaultSeed)
    .accounts({
      creator: creator.publicKey,
      user: user.publicKey,
      vaultAuth,
      transmuter: transmuter.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([user])
    .rpc({
      skipPreflight: true,
    });
});

it("should handle input", async () => {
  const inputMint = inputMints[0].nft.address;

  //Must have creator and seed to find transmuter
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  const vaultAuth = await getvaultAuthStruct(
    program,
    transmuter.publicKey,
    user.publicKey,
    vaultSeed
  );

  const ata = await getOrCreateAssociatedTokenAccount(
    anchor.getProvider().connection,
    user,
    inputMint,
    user.publicKey,
    true
  );

  const vault = await getOrCreateAssociatedTokenAccount(
    anchor.getProvider().connection,
    user,
    inputMint,
    vaultAuth.publicKey,
    true
  );

  const metadata = await getMetadata(inputMint);

  await program.methods
    .userSendInput(seed, vaultSeed)
    .accounts({
      creator: creator.publicKey,
      user: user.publicKey,
      mint: inputMint,
      ata: ata.address,
      metadata: metadata,
      vaultAuth: vaultAuth.publicKey,
      vault: vault.address,
      tokenProgram,
      transmuter: transmuter.publicKey,
    })
    .signers([user])
    .rpc({
      skipPreflight: true,
    });
});

it("should claim outputs", async () => {
  //Must have creator and seed to find transmuter
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  //Must have user and vaultSeed to find vaultAuth
  const vaultAuth = await getvaultAuthStruct(
    program,
    transmuter.publicKey,
    user.publicKey,
    vaultSeed
  );

  for (let i = 0; i < transmuter.account.outputs.length; i++) {
    let mint = await createMint(
      anchor.getProvider().connection,
      user,
      auth,
      auth,
      0
    );

    const metadata = await getMetadata(mint);

    const ata = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      user,
      mint,
      user.publicKey,
      true
    );

    const masterEdition = await getMasterEdition(mint);
    await program.methods
      .userClaimOutputNft(seed, vaultSeed)
      .accounts({
        creator: creator.publicKey,
        user: user.publicKey,
        vaultAuth: vaultAuth.publicKey,
        auth,
        transmuter: transmuter.publicKey,
        mint,
        ata: ata.address,
        metadata,
        masterEdition,
        tokenProgram,
        associatedTokenProgram,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .preInstructions([modifyComputeUnits])
      .signers([user])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);
  }
});

it("should have minted correct titan part nfts", async () => {
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  const titanParts = [
    await getTraitId(transmuter.account.traitsUri, "Cockpit"),
    await getTraitId(transmuter.account.traitsUri, "Body"),
    await getTraitId(transmuter.account.traitsUri, "Engine"),
    await getTraitId(transmuter.account.traitsUri, "Right Arm"),
    await getTraitId(transmuter.account.traitsUri, "Left Arm"),
    await getTraitId(transmuter.account.traitsUri, "Legs"),
  ];

  const userNfts = (await userMetaplex
    .nfts()
    .findAllByOwner({ owner: user.publicKey })) as Metadata[];

  const titanPartNfts = userNfts.filter((nft) => nft.name === "Titan part");
  const titanPartsUriValid = isUriValid(titanPartNfts, [
    await getTraitId(transmuter.account.traitsUri, "Base Color"),
    titanParts,
  ]);
  assert.equal(titanPartNfts.length, titanParts.length);
  assert.equal(titanPartsUriValid, true);
});

it("should have minted correct titan color nft", async () => {
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  const userNfts = (await userMetaplex
    .nfts()
    .findAllByOwner({ owner: user.publicKey })) as Metadata[];

  const titanColorNfts = userNfts.filter((nft) => nft.name === "Titan color");
  const titanColorUriValid = isUriValid(titanColorNfts, [
    await getTraitId(transmuter.account.traitsUri, "Main Color"),
    await getTraitId(transmuter.account.traitsUri, "Pattern"),
  ]);
  assert.equal(titanColorNfts.length, 1);
  assert.equal(titanColorUriValid, true);
});

it("should have minted correct nfts", async () => {
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  const userNfts = (await userMetaplex
    .nfts()
    .findAllByOwner({ owner: user.publicKey })) as Metadata[];

  const dogPilotNfts = userNfts.filter((nft) => nft.name === "Dog pilot");
  const dogPilotUriValid = isUriValid(dogPilotNfts, [
    await getTraitId(transmuter.account.traitsUri, "Dog Breed"),
    await getTraitId(transmuter.account.traitsUri, "Dog Color"),
  ]);
  assert.equal(dogPilotNfts.length, 1);
  assert.equal(dogPilotUriValid, true);
});

// Should update the metadata based on uri.
// The update server could be triggered with a call back after mint
