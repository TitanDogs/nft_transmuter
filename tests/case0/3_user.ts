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
} from "../utils";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID as associatedTokenProgram,
  createMint,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID as tokenProgram,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { auth, seed, vaultSeed, vaultSeed2, vaultSeed3 } from "./2_transmuter";
import { Metadata } from "@metaplex-foundation/js";
import { program } from "..";

it("should fail to init vault", async () => {
  try {
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
  } catch (e) {
    assert.ok(e instanceof Error);
    return;
  }
  assert.fail("Test should have failed");
});

it("should fail for a user to resume a transmuter", async () => {
  try {
    //Must have creator and seed to find transmuter
    const transmuter = await getTransmuterStruct(
      program,
      creator.publicKey,
      seed
    );

    await program.methods
      .transmuterResume(seed)
      .accounts({
        creator: user.publicKey,
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

it("should resume the transmuter", async () => {
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  await program.methods
    .transmuterResume(seed)
    .accounts({
      creator: creator.publicKey,
      transmuter: transmuter.publicKey,
    })
    .signers([creator])
    .rpc({
      skipPreflight: true,
    });

  const transmuterStruct = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  assert.ok(!transmuterStruct.account.locked);
});

it("should fail for a user to close a transmuter", async () => {
  try {
    //Must have creator and seed to find transmuter
    const transmuter = await getTransmuterStruct(
      program,
      creator.publicKey,
      seed
    );

    await program.methods
      .transmuterClose()
      .accounts({
        creator: user.publicKey,
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

it("should pause the transmuter", async () => {
  //Must have creator and seed to find transmuter
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  await program.methods
    .transmuterPause(seed)
    .accounts({
      creator: creator.publicKey,
      transmuter: transmuter.publicKey,
    })
    .signers([creator])
    .rpc({
      skipPreflight: true,
    });

  const transmuterStruct = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  assert.ok(transmuterStruct.account.locked);
});

it("should fail to send input", async () => {
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
  } catch (e) {
    assert.ok(e instanceof Error);
    return;
  }
  assert.fail("Test should have failed");
});

it("should resume the transmuter", async () => {
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  await program.methods
    .transmuterResume(seed)
    .accounts({
      creator: creator.publicKey,
      transmuter: transmuter.publicKey,
    })
    .signers([creator])
    .rpc({
      skipPreflight: true,
    });

  const transmuterStruct = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  assert.ok(!transmuterStruct.account.locked);
});

it("should send input", async () => {
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

it("should cancel inputs", async () => {
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

  const vaultAuthNfts = await userMetaplex.nfts().findAllByOwner({
    owner: vaultAuth.publicKey,
  });

  for (let vaultAuthNft of vaultAuthNfts) {
    const nftMintAddress = (vaultAuthNft as Metadata).mintAddress;

    const ata = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      user,
      nftMintAddress,
      user.publicKey,
      true
    );

    const vault = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      user,
      nftMintAddress,
      vaultAuth.publicKey,
      true
    );

    await program.methods
      .userCancelInput(seed, vaultSeed)
      .accounts({
        creator: creator.publicKey,
        user: user.publicKey,
        mint: nftMintAddress,
        ata: ata.address,
        vaultAuth: vaultAuth.publicKey,
        vault: vault.address,
        tokenProgram,
        transmuter: transmuter.publicKey,
      })
      .signers([user])
      .rpc({
        skipPreflight: true,
      });
  }
});

it("should check that there are no inputs", async () => {
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
    vaultAuth.account.handledInputs.filter((input) => input),
    0
  );
});

it("should fail to claim output", async () => {
  try {
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
      });
  } catch (e) {
    assert.ok(e instanceof Error);
    return;
  }
  assert.fail("Test should have failed");
});

it("should send input again", async () => {
  const inputMint = inputMints[1].nft.address;

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

it("should pause the transmuter", async () => {
  //Must have creator and seed to find transmuter
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  await program.methods
    .transmuterPause(seed)
    .accounts({
      creator: creator.publicKey,
      transmuter: transmuter.publicKey,
    })
    .signers([creator])
    .rpc({
      skipPreflight: true,
    });

  const transmuterStruct = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  assert.ok(transmuterStruct.account.locked);
});

it("should fail to claim output", async () => {
  try {
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
      });
  } catch (e) {
    assert.ok(e instanceof Error);
    return;
  }
  assert.fail("Test should have failed");
});

it("should resume the transmuter", async () => {
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  await program.methods
    .transmuterResume(seed)
    .accounts({
      creator: creator.publicKey,
      transmuter: transmuter.publicKey,
    })
    .signers([creator])
    .rpc({
      skipPreflight: true,
    });

  const transmuterStruct = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  assert.ok(!transmuterStruct.account.locked);
});

it("should init another vault auth", async () => {
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
      vaultSeed2.toBuffer().reverse(),
    ],
    program.programId
  )[0];

  console.log("vaultAuth2: ", vaultAuth.toBase58());

  await program.methods
    .userInitVaultAuth(seed, vaultSeed2)
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

it("should send another input in another vault", async () => {
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
    vaultSeed2
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
    .userSendInput(seed, vaultSeed2)
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

it("should fail to claim output from vault 2 as max reached", async () => {
  try {
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
      vaultSeed2
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
      .userClaimOutputNft(seed, vaultSeed2)
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
      });
  } catch (e) {
    assert.ok(e instanceof Error);
    assert.equal((e as any).msg, "Transmute max reached");
    return;
  }
  assert.fail("Test should have failed");
});

it("should cancel inputs", async () => {
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  const vaultAuth = await getvaultAuthStruct(
    program,
    transmuter.publicKey,
    user.publicKey,
    vaultSeed2
  );

  const vaultAuthNfts = await userMetaplex.nfts().findAllByOwner({
    owner: vaultAuth.publicKey,
  });

  for (let vaultAuthNft of vaultAuthNfts) {
    const nftMintAddress = (vaultAuthNft as Metadata).mintAddress;

    const ata = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      user,
      nftMintAddress,
      user.publicKey,
      true
    );

    const vault = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      user,
      nftMintAddress,
      vaultAuth.publicKey,
      true
    );

    await program.methods
      .userCancelInput(seed, vaultSeed2)
      .accounts({
        creator: creator.publicKey,
        user: user.publicKey,
        mint: nftMintAddress,
        ata: ata.address,
        vaultAuth: vaultAuth.publicKey,
        vault: vault.address,
        tokenProgram,
        transmuter: transmuter.publicKey,
      })
      .signers([user])
      .rpc({
        skipPreflight: true,
      });
  }
});

it("should fail to init another vault auth", async () => {
  try {
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
        vaultSeed3.toBuffer().reverse(),
      ],
      program.programId
    )[0];

    console.log("vaultAuth3: ", vaultAuth.toBase58());

    await program.methods
      .userInitVaultAuth(seed, vaultSeed3)
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
  } catch (e) {
    assert.ok(e instanceof Error);
    assert.equal((e as any).msg, "Transmute max reached");
    return;
  }
  assert.fail("Test should have failed");
});
