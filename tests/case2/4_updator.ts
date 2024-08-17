import { program } from "..";
import { OutputInfo, TraitInfo, getTransmuterStructs } from "../utils";
import { creator, creatorMetaplex } from "./1_init";
import axios from "axios";
import sharp from "sharp";
import { NFTStorage } from "nft.storage";
import { Metadata, PublicKey } from "@metaplex-foundation/js";
import assert from "assert";

const storageClient = new NFTStorage({
  token: process.env.NFT_STORAGE_KEY,
});

it("verifies collection", async () => {
  const transmuters = await getTransmuterStructs(program, creator.publicKey);

  for (let transmuter of transmuters) {
    const auth = PublicKey.findProgramAddressSync(
      [Buffer.from("auth"), transmuter.publicKey.toBytes()],
      program.programId
    )[0];

    const metadatas = (await creatorMetaplex
      .nfts()
      .findAllByCreator({ creator: auth })) as Metadata[];

    const metadatasToUpdate = metadatas.filter(
      (metadata) => !metadata.collection.verified
    );

    for (let metadata of metadatasToUpdate) {
      await creatorMetaplex.nfts().verifyCollection({
        mintAddress: metadata.mintAddress,
        collectionMintAddress: metadata.collection.address,
      });
    }
  }
});

it("Updates output uri", async () => {
  // find all nfts that are not updated
  // first get all the transmuters of this creator
  const transmuters = await getTransmuterStructs(program, creator.publicKey);

  for (let transmuter of transmuters) {
    //should be done via server callback
    let transmuterOutputs = transmuter.account.outputs.map((output) =>
      JSON.parse(output)
    ) as OutputInfo[];

    const auth = PublicKey.findProgramAddressSync(
      [Buffer.from("auth"), transmuter.publicKey.toBytes()],
      program.programId
    )[0];

    if (
      transmuterOutputs.some(
        (output) =>
          output?.rule?.name === "merge" || output?.rule?.name === "split"
      )
    ) {
      const metadatas = (await creatorMetaplex
        .nfts()
        .findAllByCreator({ creator: auth })) as Metadata[];

      const metadatasToUpdate = metadatas.filter((metadata) => {
        const nftUrl = new URL(metadata.uri);
        const nftBaseUri = nftUrl.origin + nftUrl.pathname;
        return transmuterOutputs.some(
          (output) => output.mint_info?.uri === nftBaseUri
        );
      });

      for (let metadata of metadatasToUpdate) {
        const nft = await creatorMetaplex
          .nfts()
          .findByMint({ mintAddress: metadata.mintAddress });

        const queryString = new URL(nft.uri).searchParams;
        const attributes: { trait_type: string; value: string }[] = [];
        const buffers: Buffer[] = [];

        const transmuterTraits: TraitInfo[] = await axios
          .get(transmuter.account.traitsUri)
          .then((res) => res.data);

        for (let [key, value] of queryString.entries()) {
          const foundTrait = transmuterTraits.find(
            (trait) => trait.trait_type_id === key && trait.value_id === value
          );
          if (foundTrait) {
            attributes.push({ trait_type: key, value: value });
            const response = await axios.get(foundTrait.image, {
              responseType: "arraybuffer",
            });
            buffers.push(Buffer.from(response.data, "utf-8"));
          }
        }

        if (buffers.length > 0) {
          let outputBuffer = await sharp(buffers[0])
            .composite(
              buffers.slice(1, buffers.length - 1).map((buffer) => ({
                input: buffer,
                tile: true,
                blend: "over",
              }))
            )
            .toBuffer();
          const file = new File([outputBuffer], "image.png");
          const imageCid = await storageClient.storeBlob(file);
          const imageUri = `https://${imageCid}.ipfs.nftstorage.link`;
          const updatedMetadata = {
            name: nft.name,
            symbol: nft.symbol,
            sellerFeeBasisPoints: nft.sellerFeeBasisPoints,
            uri: nft.uri,
            creators: nft.creators,
            isMutable: nft.isMutable,
            attributes,
            image: imageUri,
            properties: {
              files: [
                {
                  uri: imageUri,
                  type: "image/png",
                },
              ],
            },
          };
          const metadataCid = await storageClient.storeBlob(
            new File([JSON.stringify(updatedMetadata)], "metadata.json")
          );
          let url = new URL(`https://${metadataCid}.ipfs.nftstorage.link`);
          for (let [key, value] of queryString.entries()) {
            url.searchParams.append(key, value);
          }
          console.log("URL");
          console.log(url.toString());

          await creatorMetaplex.nfts().update(
            {
              nftOrSft: nft,
              uri: url.toString(),
            },
            { commitment: "processed" }
          );

          await creatorMetaplex
            .nfts()
            .verifyCreator(
              { mintAddress: nft.address, creator },
              { commitment: "processed" }
            );

          await creatorMetaplex.nfts().verifyCollection(
            {
              mintAddress: nft.address,
              collectionMintAddress: nft.collection.address,
            },
            { commitment: "processed" }
          );
        }
      }
    }
  }
});

it("should have updated", async () => {
  const transmuters = await getTransmuterStructs(program, creator.publicKey);

  for (let transmuter of transmuters) {
    let transmuterOutputs = transmuter.account.outputs.map((output) =>
      JSON.parse(output)
    ) as OutputInfo[];

    const auth = PublicKey.findProgramAddressSync(
      [Buffer.from("auth"), transmuter.publicKey.toBytes()],
      program.programId
    )[0];

    const metadatas = (await creatorMetaplex
      .nfts()
      .findAllByCreator({ creator: auth })) as Metadata[];

    const metadatasToUpdate = metadatas.filter((metadata) => {
      const nftUrl = new URL(metadata.uri);
      const nftBaseUri = nftUrl.origin + nftUrl.pathname;
      return transmuterOutputs.some(
        (output) => output.uri === nftBaseUri
      );
    });

    assert.equal(metadatasToUpdate.length, 0);
  }
});
