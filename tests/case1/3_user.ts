import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { creator, creatorMetaplex, inputMints, user } from "./1_init";
import {
  TOKEN_METADATA_PROGRAM_ID,
  confirmTx,
  getMasterEdition,
  getMetadata,
  getTransmuterStruct,
  getTransmuterStructs,
  getvaultAuthStruct,
  getvaultAuthStructs,
  modifyComputeUnits,
} from "../utils";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID as associatedTokenProgram,
  createMint,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID as tokenProgram,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { auth, seed } from "./2_transmuter";
import { randomBytes } from "crypto";
import { Metadata } from "@metaplex-foundation/js";
import { program } from "..";

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

it("Should fail to handle input as another user", async () => {
  try {
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
        user: creator.publicKey,
        mint: inputMint,
        ata: ata.address,
        metadata: metadata,
        vaultAuth: vaultAuth.publicKey,
        vault: vault.address,
        tokenProgram,
        transmuter: transmuter.publicKey,
      })
      .signers([creator])
      .rpc({
        skipPreflight: true,
      });
  } catch (e) {
    assert.ok(e instanceof Error);
    return;
  }
  assert.fail("Test should have failed");
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

it("Should fail to handle input as trait is not matching", async () => {
  try {
    const inputMint = inputMints[1].nft.address;

    //Must have creator and seed to find transmuter
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
      vaultAuth,
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
        vaultAuth: vaultAuth,
        vault: vault.address,
        tokenProgram,
        transmuter: transmuter.publicKey,
      })
      .signers([user])
      .rpc({
        skipPreflight: true,
      });
  } catch (e) {
    assert.ok(e instanceof Error);
    return;
  }
  assert.fail("Test should have failed");
});

it("should fail to claim output", async () => {
  try {
    //Must have creator and seed to find transmuter
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
        vaultAuth,
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
      .signers([user])
      .rpc({
        skipPreflight: true,
      });
  } catch (e) {
    assert.ok(e instanceof Error);
    return;
  }
  assert.fail("Test should have failed");
});

it("should verify transmuter is not claimable", async () => {
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

  assert.notEqual(
    transmuter.account.inputs.length,
    vaultAuth.account.handledInputs.filter((input) => input).length
  );
});

it("should handle input", async () => {
  const inputMint = inputMints[2].nft.address;

  //Must have creator and seed to find transmuter
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
    vaultAuth,
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
      vaultAuth,
      vault: vault.address,
      tokenProgram,
      transmuter: transmuter.publicKey,
    })
    .signers([user])
    .rpc({
      skipPreflight: true,
    });
});

it("should verify transmuter is claimable", async () => {
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

  assert.equal(
    transmuter.account.inputs.length,
    vaultAuth.account.handledInputs.filter((input) => input).length
  );
});

it("should claim output", async () => {
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
});

it("should verify the transmuter count", async () => {
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  assert.equal(transmuter.account.transmuteCount, 1);
});

it("should verify that vault is locked for user but not complete", async () => {
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

  const handledOutputs = vaultAuth.account.handledOutputs.filter(
    (output) => output
  );

  assert.equal(vaultAuth.account.userLocked, true);
  assert.equal(vaultAuth.account.creatorLocked, true);
  assert.notEqual(transmuter.account.outputs.length, handledOutputs.length);
});

it("should verify that creator cannot resolve incomplete transmuter", async () => {
  try {
    const transmuters = await getTransmuterStructs(program, creator.publicKey);

    for (let transmuter of transmuters) {
      const vaultAuthStructs = await getvaultAuthStructs(
        program,
        transmuter.publicKey,
        false
      );

      const vaultAuth = vaultAuthStructs[0];

      const vaultAuthNfts = (await creatorMetaplex
        .nfts()
        .findAllByOwner({ owner: vaultAuth.publicKey })) as Metadata[];

      for (let vaultAuthNft of vaultAuthNfts) {
        const vault = await getOrCreateAssociatedTokenAccount(
          anchor.getProvider().connection,
          creator,
          vaultAuthNft.mintAddress,
          vaultAuth.publicKey,
          true
        );

        const inputInfoIndex = vaultAuth.account.handledInputs.findIndex(
          (inputAddress) =>
            inputAddress?.toBase58() === vaultAuthNft.mintAddress.toBase58()
        );

        const inputInfo = JSON.parse(transmuter.account.inputs[inputInfoIndex]);

        if (inputInfo) {
          switch (inputInfo.method) {
            case "burn":
              {
                await program.methods
                  .creatorBurnInput(
                    transmuter.account.seed,
                    vaultAuth.account.seed
                  )
                  .accounts({
                    creator: creator.publicKey,
                    user: user.publicKey,
                    mint: vaultAuthNft.mintAddress,
                    vaultAuth: vaultAuth.publicKey,
                    vault: vault.address,
                    tokenProgram,
                    transmuter: transmuter.publicKey,
                  })
                  .signers([creator])
                  .rpc({
                    skipPreflight: true,
                  });
              }
              break;
            case "transfer":
              {
                const creatorAta = await getOrCreateAssociatedTokenAccount(
                  anchor.getProvider().connection,
                  creator,
                  vaultAuthNft.mintAddress,
                  creator.publicKey,
                  true
                );

                await program.methods
                  .creatorResolveInput(
                    transmuter.account.seed,
                    vaultAuth.account.seed
                  )
                  .accounts({
                    creator: creator.publicKey,
                    user: user.publicKey,
                    mint: vaultAuthNft.mintAddress,
                    ata: creatorAta.address,
                    vaultAuth: vaultAuth.publicKey,
                    vault: vault.address,
                    tokenProgram,
                    transmuter: transmuter.publicKey,
                  })
                  .signers([creator])
                  .rpc({
                    skipPreflight: true,
                  })
                  .then(confirmTx);
              }
              break;
            default:
              console.log("Method not found");
          }
        }
      }
    }
  } catch (e) {
    assert.ok(e instanceof Error);
    return;
  }
  assert.fail("Test should have failed");
});

it("should claim output", async () => {
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
});

it("should verify the transmuter count", async () => {
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  assert.equal(transmuter.account.transmuteCount, 1);
});

it("should verify that vault is locked for user but complete", async () => {
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

  const handledOutputs = vaultAuth.account.handledOutputs.filter(
    (output) => output
  );

  assert.equal(vaultAuth.account.userLocked, true);
  assert.equal(vaultAuth.account.creatorLocked, false);
  assert.equal(transmuter.account.outputs.length, handledOutputs.length);
});
