import * as anchor from "@coral-xyz/anchor";
import { Metadata } from "@metaplex-foundation/js";
import { Commitment } from "@solana/web3.js";

const commitment: Commitment = "confirmed";

export const confirmTx = async (signature: string) => {
  const latestBlockhash = await anchor
    .getProvider()
    .connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction(
    {
      signature,
      ...latestBlockhash,
    },
    commitment
  );
};

export const confirmTxs = async (signatures: string[]) => {
  await Promise.all(signatures.map(confirmTx));
};

export const modifyComputeUnits =
  anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: 1000000,
  });

export const addPriorityFee =
  anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1,
  });

export const importTest = (name: string, path: string) => {
  describe(name, () => {
    require(path);
  });
};

export const isUriValid = (nfts: Metadata[], keys: (string | string[])[]) => {
  return nfts.every((nft) => {
    const url = new URL(nft.uri);
    const searchParams = new URLSearchParams(url.search);
    return [...searchParams.keys()].every((searchKey) =>
      keys.some((key) =>
        typeof key === "string" ? searchKey === key : key.includes(searchKey)
      )
    );
  });
};
