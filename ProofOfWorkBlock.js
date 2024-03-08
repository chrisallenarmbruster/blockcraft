/**
 * ProofOfWorkBlock.js
 *
 * This file defines the ProofOfWorkBlock class, which extends the Block class and adds proof-of-work functionality.
 *
 * This class is used by the ProofOfWorkConsensus class to create blocks with proof-of-work functionality.
 *
 * Each ProofOfWorkBlock has an index, data, previousHash, timestamp, difficulty, nonce, and hash. The nonce is a number that is incremented in the process of mining the block.
 *
 * The ProofOfWorkBlock class overrides the computeHash method of the Block class to include the nonce in the hash computation.
 *
 * The mineBlock method is used to mine the block by incrementally increasing the nonce and recomputing the hash until a hash that meets the difficulty requirement is found. The difficulty requirement is that the first 'difficulty' number of characters of the hash must be zeros.
 *
 */

import crypto from "crypto";
import Block from "./Block.js";
class ProofOfWorkBlock extends Block {
  constructor({
    index,
    data,
    previousHash,
    timestamp,
    nonce = 0,
    difficulty = 4,
  }) {
    super({ index, data, previousHash, timestamp });
    this.nonce = nonce;
    this.difficulty = difficulty;
    this.hash = this.computeHash();
    this.stopMining = false;
  }

  toSerializableObject() {
    const baseObject = super.toSerializableObject();
    return {
      ...baseObject,
      nonce: this.nonce,
      difficulty: this.difficulty,
    };
  }

  computeHash() {
    return crypto
      .createHash("SHA256")
      .update(
        `${this.index}${this.previousHash}${this.timestamp}${JSON.stringify(
          this.data
        )}${this.nonce}`
      )
      .digest("hex");
  }

  async mineBlock() {
    while (
      !this.stopMining &&
      this.hash.substring(0, this.difficulty) !==
        Array(this.difficulty + 1).join("0")
    ) {
      this.nonce++;
      this.hash = this.computeHash();
      if (this.nonce % 1000 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }
    return !this.stopMining;
  }
}

export default ProofOfWorkBlock;
