import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { creator, creatorMint, inputMints, user, userMetaplex } from "./1_init";
import {
  TOKEN_METADATA_PROGRAM_ID,
  confirmTx,
  getMasterEdition,
  getMetadata,
  getTransmuterStruct,
  getvaultAuthStruct,
  modifyComputeUnits,
  isUriValid,
  OutputInfo,
  TOKEN_DECIMALS,
} from "../utils";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID as associatedTokenProgram,
  createMint,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID as tokenProgram,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { auth, seed, transmuter } from "./2_transmuter";
import { randomBytes } from "crypto";
import { program } from "..";
import { BN } from "bn.js";

export const vaultSeed = new anchor.BN(randomBytes(8));

it("should fail to init vault auth", async () => {
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

it("should fail to set one spl output to the transmuter with 0 amount", async () => {
  try {
    const outputInfo = {
      token_standard: "spl",
      method: "transfer",
      amount: 2 * TOKEN_DECIMALS,
      mint: creatorMint,
    };

    const creatorAta = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      creator,
      creatorMint,
      creator.publicKey,
      true
    );
    const authAta = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      creator,
      creatorMint,
      auth,
      true
    );

    await program.methods
      .transmuterSetOutputSpl(seed, JSON.stringify(outputInfo), new BN(0))
      .accounts({
        creator: creator.publicKey,
        transmuter,
        creatorAta: creatorAta.address,
        authAta: authAta.address,
        tokenProgram,
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

it("should set one spl output to the transmuter", async () => {
  const outputInfo = {
    token_standard: "spl",
    method: "transfer",
    amount: 2 * TOKEN_DECIMALS,
    mint: creatorMint,
  };

  const creatorAta = await getOrCreateAssociatedTokenAccount(
    anchor.getProvider().connection,
    creator,
    creatorMint,
    creator.publicKey,
    true
  );
  const authAta = await getOrCreateAssociatedTokenAccount(
    anchor.getProvider().connection,
    creator,
    creatorMint,
    auth,
    true
  );

  await program.methods
    .transmuterSetOutputSpl(
      seed,
      JSON.stringify(outputInfo),
      new BN(1 * TOKEN_DECIMALS)
    )
    .accounts({
      creator: creator.publicKey,
      transmuter,
      creatorAta: creatorAta.address,
      authAta: authAta.address,
      tokenProgram,
    })
    .signers([creator])
    .rpc({
      skipPreflight: true,
    });
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

it("should fail to claim the output if not enough funds", async () => {
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

    for (let i = 0; i < transmuter.account.outputs.length; i++) {
      const outputInfo = JSON.parse(
        transmuter.account.outputs[i]
      ) as OutputInfo;
      if (outputInfo.token_standard === "spl") {
        const userAta = await getOrCreateAssociatedTokenAccount(
          anchor.getProvider().connection,
          user,
          new PublicKey(outputInfo.mint),
          user.publicKey,
          true
        );

        const authAta = await getOrCreateAssociatedTokenAccount(
          anchor.getProvider().connection,
          user,
          new PublicKey(outputInfo.mint),
          auth,
          true
        );

        await program.methods
          .userClaimOutputSpl(seed, vaultSeed)
          .accounts({
            creator: creator.publicKey,
            user: user.publicKey,
            vaultAuth: vaultAuth.publicKey,
            auth,
            transmuter: transmuter.publicKey,
            authAta: authAta.address,
            userAta: userAta.address,
            tokenProgram,
          })
          .signers([user])
          .rpc({
            skipPreflight: true,
          });
      }
    }
  } catch (e) {
    assert.ok(e instanceof Error);

    const transmuterAfter = await getTransmuterStruct(
      program,
      creator.publicKey,
      seed
    );

    assert.equal(transmuterAfter.account.transmuteCount, 0);

    const vaultAuthAfter = await getvaultAuthStruct(
      program,
      transmuterAfter.publicKey,
      user.publicKey,
      vaultSeed
    );

    assert.equal(vaultAuthAfter.account.userLocked, false);
    assert.equal(vaultAuthAfter.account.creatorLocked, true);
    assert.equal(
      vaultAuthAfter.account.handledOutputs.filter((output) => output).length,
      0
    );
    return;
  }
  assert.fail("Test should have failed");
});

it("should fail to top up too much spl", async () => {
  try {
    const creatorAta = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      creator,
      creatorMint,
      creator.publicKey,
      true
    );
    const authAta = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      creator,
      creatorMint,
      auth,
      true
    );

    await program.methods
      .transmuterAddOutputSpl(seed, new BN(100 * TOKEN_DECIMALS))
      .accounts({
        creator: creator.publicKey,
        transmuter,
        creatorAta: creatorAta.address,
        authAta: authAta.address,
        tokenProgram,
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

it("should top up transmuter auth with spl", async () => {
  const creatorAta = await getOrCreateAssociatedTokenAccount(
    anchor.getProvider().connection,
    creator,
    creatorMint,
    creator.publicKey,
    true
  );
  const authAta = await getOrCreateAssociatedTokenAccount(
    anchor.getProvider().connection,
    creator,
    creatorMint,
    auth,
    true
  );

  await program.methods
    .transmuterAddOutputSpl(seed, new BN(9 * TOKEN_DECIMALS))
    .accounts({
      creator: creator.publicKey,
      transmuter,
      creatorAta: creatorAta.address,
      authAta: authAta.address,
      tokenProgram,
    })
    .signers([creator])
    .rpc({
      skipPreflight: true,
    });
});

it("should claim the output if enough funds", async () => {
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
    const outputInfo = JSON.parse(transmuter.account.outputs[i]) as OutputInfo;
    if (outputInfo.token_standard === "spl") {
      const userAta = await getOrCreateAssociatedTokenAccount(
        anchor.getProvider().connection,
        user,
        new PublicKey(outputInfo.mint),
        user.publicKey,
        true
      );

      const authAta = await getOrCreateAssociatedTokenAccount(
        anchor.getProvider().connection,
        user,
        new PublicKey(outputInfo.mint),
        auth,
        true
      );

      await program.methods
        .userClaimOutputSpl(seed, vaultSeed)
        .accounts({
          creator: creator.publicKey,
          user: user.publicKey,
          vaultAuth: vaultAuth.publicKey,
          auth,
          transmuter: transmuter.publicKey,
          authAta: authAta.address,
          userAta: userAta.address,
          tokenProgram,
        })
        .signers([user])
        .rpc({
          skipPreflight: true,
        });
    }
  }
});

//TEST BALANCE HERE?