import * as anchor from "@coral-xyz/anchor";
import { Transmuter } from "../../target/types/transmuter";
import { PublicKey, Connection } from "@solana/web3.js";

const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const numbertoBase58 = (number: anchor.BN) => {
  return anchor.utils.bytes.bs58.encode(number.toArrayLike(Buffer, "le", 8));
};

// Structs
export const getTransmuterStruct = async (
  program: anchor.Program<Transmuter>,
  creatorAddress: PublicKey,
  seed: anchor.BN
) => {
  const transmuters = await program.account.transmuter.all([
    {
      memcmp: {
        offset: 8,
        bytes: creatorAddress.toBase58(),
      },
    },
    {
      memcmp: {
        offset: 8 + 32, // Creator pubkey.
        bytes: numbertoBase58(seed),
      },
    },
  ]);
  return transmuters[0];
};

export const getTransmuterStructs = async (
  program: anchor.Program<Transmuter>,
  creatorAddress: PublicKey
) => {
  return program.account.transmuter.all([
    {
      memcmp: {
        offset: 8,
        bytes: creatorAddress.toBase58(),
      },
    },
  ]);
};

export const getvaultAuthStruct = async (
  program: anchor.Program<Transmuter>,
  transmuterAddress: PublicKey,
  userAddress: PublicKey,
  vaultSeed: anchor.BN
) => {
  const vaultAuths = await program.account.vaultAuth.all([
    {
      memcmp: {
        offset: 8, // Discriminator.
        bytes: transmuterAddress.toBase58(),
      },
    },
    {
      memcmp: {
        offset:
          8 + // Discriminator.
          32, // Transmuter pubkey.
        bytes: userAddress.toBase58(),
      },
    },
    {
      memcmp: {
        offset:
          8 + // Discriminator.
          32 + // Transmuter pubkey.
          32, // User pubkey.
        bytes: numbertoBase58(vaultSeed),
      },
    },
  ]);
  return vaultAuths[0];
};

export const getvaultAuthStructs = async (
  program: anchor.Program<Transmuter>,
  transmuterAddress: PublicKey,
  creatorLock: boolean
) => {
  return program.account.vaultAuth.all([
    {
      memcmp: {
        offset: 8, // Discriminator.
        bytes: transmuterAddress.toBase58(),
      },
    },
    {
      memcmp: {
        offset:
          8 + // Discriminator.
          32 + // Transmuter pubkey.
          32 + // User pubkey.
          8, // Vault seed.
        bytes: creatorLock ? "2" : "1",
      },
    },
  ]);
};

// Publickeys
export const getMetadata = async (
  mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
};

export const getMasterEdition = async (
  mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
};

export const getProgramAuthority = async (
  c: Connection,
  programId: PublicKey
): Promise<PublicKey | undefined> => {
  const info = await c.getAccountInfo(programId, { commitment: "confirmed" });
  if (!info) return;
  const dataAddress = new PublicKey(info.data.subarray(4));
  const dataAcc = await c.getAccountInfo(dataAddress);
  if (!dataAcc) return;
  return new PublicKey(dataAcc.data.subarray(13, 45));
};
