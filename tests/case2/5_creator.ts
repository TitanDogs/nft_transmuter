import * as anchor from "@coral-xyz/anchor";
import { Metadata } from "@metaplex-foundation/js";
import { creator, creatorMetaplex, user } from "./1_init";
import {
  confirmTx,
  getMetadata,
  getTransmuterStructs,
  getvaultAuthStructs,
} from "../utils";
import { SystemProgram } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID as tokenProgram,
} from "@solana/spl-token";
import assert from "assert";
import { program } from "..";

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

it("should verify all vault auths have been closed", async () => {
  const transmuters = await getTransmuterStructs(program, creator.publicKey);

  for (let transmuter of transmuters) {
    const vaultAuthStructs = await getvaultAuthStructs(
      program,
      transmuter.publicKey,
      false
    );

    assert.equal(vaultAuthStructs.length, 0);
  }
});
