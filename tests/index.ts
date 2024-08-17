// import "./case1";
import * as anchor from "@coral-xyz/anchor";
import { IDL, Transmuter } from "../target/types/transmuter";

anchor.setProvider(anchor.AnchorProvider.env());

export const programId = new anchor.web3.PublicKey(
  "E92y64UApEZnqJRsxrxRK6Jmp6nCD4hu59kqqegqNNN4"
);

export const program = new anchor.Program<Transmuter>(
  IDL,
  programId,
  anchor.getProvider()
);

import "./case0";
import "./case1";
import "./case2";
import "./case3";
