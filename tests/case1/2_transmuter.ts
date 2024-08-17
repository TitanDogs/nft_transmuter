import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { randomBytes } from "crypto";
import assert from "assert";
import {
  WBA,
  getProgramAuthority,
  getTransmuterStruct,
  getTransmuterStructs,
} from "../utils";
import { creator, inputCollection, outputCollection } from "./1_init";
import { program, programId } from "..";

require("dotenv").config({ path: ".env" });

// Random seed
export const seed = new BN(randomBytes(8));

const transmuter = PublicKey.findProgramAddressSync(
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
    input_length: 2,
    output_length: 2,
    transmute_max: 1,
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

  assert.equal(transmuter.account.transmuteMax, 1);
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
    rule: {
      name: "traits",
      rule_type: "match",
      trait_types: [
        ["Background", "red"],
        ["Outfit", "cope"],
      ],
    },
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

it("should add one input to the transmuter", async () => {
  const transmuterStructBefore = await getTransmuterStruct(
    program,
    creator.publicKey,
    seed
  );

  const inputInfo = {
    token_standard: "nft",
    collection: inputCollection.nft.address.toBase58(),
    method: "burn",
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

it("should add one output to the transmuter", async () => {
  const outputInfo = {
    token_standard: "nft",
    collection: outputCollection.nft.address.toBase58(),
    method: "mint",
    amount: 1,
    mint_info: {
      title: "Generug split output",
      symbol: "SPLIT",
      uri: "https://arweave.net/qF9H_BBdjf-ZIR90_z5xXsSx8WiPB3-pHA8QTlg1oeI",
    },
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
});

it("should add one output to the transmuter", async () => {
  const outputInfo = {
    token_standard: "nft",
    collection: outputCollection.nft.address.toBase58(),
    method: "mint",
    amount: 1,
    mint_info: {
      title: "Generug output",
      symbol: "NFT",
      uri: "https://arweave.net/qF9H_BBdjf-ZIR90_z5xXsSx8WiPB3-pHA8QTlg1oeI",
    },
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
