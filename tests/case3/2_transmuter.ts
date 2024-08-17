import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { randomBytes } from "crypto";
import assert from "assert";
import {
  OutputInfo,
  TOKEN_DECIMALS,
  WBA,
  getProgramAuthority,
  getTransmuterStruct,
  getTransmuterStructs,
} from "../utils";
import { creator, inputCollection, creatorMint } from "./1_init";
import { program, programId } from "..";
import {
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID as tokenProgram,
} from "@solana/spl-token";

require("dotenv").config({ path: ".env" });

// Random seed
export const seed = new BN(randomBytes(8));
export const vaultSeed = new anchor.BN(randomBytes(8));

export const transmuter = PublicKey.findProgramAddressSync(
  [
    Buffer.from("transmuter"),
    creator.publicKey.toBytes(),
    seed.toBuffer().reverse(),
  ],
  program.programId
)[0];

export const auth = PublicKey.findProgramAddressSync(
  [Buffer.from("auth"), transmuter.toBytes()],
  program.programId
)[0];

console.log(`auth: ${auth.toBase58()}`);
console.log(`transmuter: ${transmuter.toBase58()}`);

it("creates the transmuter", async () => {
  const owner = await getProgramAuthority(
    anchor.getProvider().connection,
    programId
  );
  console.log("owner: ", owner?.toBase58());

  const transmuterConfig = {
    input_length: 1,
    output_length: 1,
  };

  await program.methods
    .transmuterCreate(seed, JSON.stringify(transmuterConfig))
    .accounts({
      creator: creator.publicKey,
      auth,
      transmuter,
      systemProgram: SystemProgram.programId,
      owner,
      wba: WBA,
    })
    .signers([creator])
    .rpc({
      skipPreflight: true,
    });
});

it("checks one transmuter has been created", async () => {
  const transmuters = await getTransmuterStructs(program, creator.publicKey);
  assert.equal(transmuters.length, 1);
});

it("checks the transmuter max and count", async () => {
  const transmuter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  assert.equal(transmuter.account.transmuteMax, null);
  assert.equal(transmuter.account.transmuteCount, 0);
});

it("should add one input to the transmuter", async () => {
  const transmuterStructBefore = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  const inputInfo = {
    token_standard: "nft",
    collection: inputCollection.nft.address.toBase58(),
    method: "transfer",
    amount: 1,
  };

  await program.methods
    .transmuterSetInput(seed, JSON.stringify(inputInfo))
    .accounts({
      creator: creator.publicKey,
      transmuter,
    })
    .signers([creator])
    .rpc({
      skipPreflight: true,
    });

  const transmuterStructAfter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  assert.equal(
    transmuterStructAfter.account.inputs.length,
    transmuterStructBefore.account.inputs.length + 1
  );
  assert.deepEqual(
    JSON.parse(transmuterStructAfter.account.inputs.slice(-1)[0]),
    inputInfo
  );
});

it("should fail to add one spl output to the transmuter", async () => {
  try {
    const outputInfo = {
      token_standard: "spl",
      method: "transfer",
      amount: 2,
      mint: creatorMint,
    };

    await program.methods
      .transmuterSetOutput(seed, JSON.stringify(outputInfo))
      .accounts({
        creator: creator.publicKey,
        transmuter,
      })
      .signers([creator])
      .rpc({
        skipPreflight: true,
      });
  } catch (e) {
    assert.ok(e instanceof Error);
    return;
  }
});

it("should set one spl output to the transmuter", async () => {
  const outputInfo = {
    token_standard: "spl",
    method: "transfer",
    amount: 2,
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
      new BN(10 * TOKEN_DECIMALS)
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

it("should fail to set one spl output with too much token", async () => {
  try {
    const outputInfo = {
      token_standard: "spl",
      method: "transfer",
      amount: 2,
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
        new BN(10 * TOKEN_DECIMALS)
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
  } catch (e) {
    assert.ok(e instanceof Error);
    return;
  }
  assert.fail("Test should have failed");
});

it("should fail to cancel output with incorrect index", async () => {
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
      .transmuterCancelOutputSpl(seed, new BN(1))
      .accounts({
        creator: creator.publicKey,
        transmuter,
        auth,
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

it("should fail to cancel output with incorrect index", async () => {
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
      .transmuterCancelOutputSpl(seed, new BN(-1))
      .accounts({
        creator: creator.publicKey,
        transmuter,
        auth,
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

it("should cancel spl output", async () => {
  const transmuterStructBefore = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  let transmuterOutputs = transmuterStructBefore.account.outputs.map((output) =>
    JSON.parse(output)
  ) as OutputInfo[];

  let index = transmuterOutputs.findIndex(
    (output) => output.token_standard === "spl"
  );

  const creatorAta = await getOrCreateAssociatedTokenAccount(
    anchor.getProvider().connection,
    creator,
    new PublicKey(transmuterOutputs[index].mint),
    creator.publicKey,
    true
  );

  const authAta = await getOrCreateAssociatedTokenAccount(
    anchor.getProvider().connection,
    creator,
    new PublicKey(transmuterOutputs[index].mint),
    auth,
    true
  );

  await program.methods
    .transmuterCancelOutputSpl(seed, new BN(index))
    .accounts({
      creator: creator.publicKey,
      transmuter,
      auth,
      creatorAta: creatorAta.address,
      authAta: authAta.address,
      tokenProgram,
    })
    .signers([creator])
    .rpc({
      skipPreflight: true,
    });

  const transmuterStructAfter = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  assert.equal(transmuterStructAfter.account.outputs.length, 0);
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