import * as anchor from "@coral-xyz/anchor";
import { Metadata } from "@metaplex-foundation/js";
import { creator, creatorMetaplex, user } from "./1_init";
import {
  confirmTx,
  getMetadata,
  getTransmuterStruct,
  getTransmuterStructs,
  getvaultAuthStruct,
  getvaultAuthStructs,
} from "../utils";
import { SystemProgram } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID as tokenProgram,
} from "@solana/spl-token";
import assert from "assert";
import { program } from "..";
import { seed } from "./2_transmuter";
import { vaultSeed } from "./3_user";

it("should not be possible for a user to resolve an input", async () => {
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

      const vaultAuthNft = vaultAuthNfts[0];

      const vault = await getOrCreateAssociatedTokenAccount(
        anchor.getProvider().connection,
        creator,
        vaultAuthNft.mintAddress,
        vaultAuth.publicKey,
        true
      );

      const metadata = await getMetadata(vaultAuthNft.mintAddress);

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
                  creator: user.publicKey,
                  user: user.publicKey,
                  mint: vaultAuthNft.mintAddress,
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
                  creator: user.publicKey,
                  user: user.publicKey,
                  mint: vaultAuthNft.mintAddress,
                  ata: creatorAta.address,
                  vaultAuth: vaultAuth.publicKey,
                  vault: vault.address,
                  tokenProgram,
                  transmuter: transmuter.publicKey,
                })
                .signers([user])
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
  } catch (e) {
    assert.ok(e instanceof Error);
    return;
  }
  assert.fail("Test should have failed");
});

it("resolves an input", async () => {
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

    const vaultAuthNft = vaultAuthNfts[0];

    const vault = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      creator,
      vaultAuthNft.mintAddress,
      vaultAuth.publicKey,
      true
    );

    const metadata = await getMetadata(vaultAuthNft.mintAddress);

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
              .creatorBurnInput(transmuter.account.seed, vaultAuth.account.seed)
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
});

it("should check that the inputs are not all resolved", async () => {
  const transmuters = await getTransmuterStructs(program, creator.publicKey);

  for (let transmuter of transmuters) {
    const vaultAuthStructs = await getvaultAuthStructs(
      program,
      transmuter.publicKey,
      false
    );

    const vaultAuth = vaultAuthStructs[0];

    assert.ok(
      !vaultAuth.account.handledInputs.every((handledInput) => !handledInput)
    );
  }
});

it("should verify vault auth is not closed", async () => {
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

  assert.notEqual(vaultAuth, undefined);
});

it("resolves all inputs", async () => {
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

      const metadata = await getMetadata(vaultAuthNft.mintAddress);

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
});

it("should verify vault auth have been closed", async () => {
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

  assert.equal(vaultAuth, undefined);
});
