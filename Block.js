/**
 * Block.js
 *
 * This file defines the Block class, which represents a block in a blockchain.
 *
 * Each block has an index, data, previousHash, timestamp, and hash. The index is the position of the block in the blockchain,
 * the data is the information stored in the block, the previousHash is the hash of the previous block in the blockchain,
 * the timestamp is the time when the block was created, and the hash is a SHA-256 hash of the block's index, previousHash,
 * timestamp, and data.
 *
 * The Block class has a computeHash method, which computes the block's hash using the SHA-256 algorithm.
 *
 * This is a base class that can be extended to implement specific block logic for different types of blockchains.
 *
 */

import crypto from "crypto";

class Block {
  constructor({ index, data, previousHash, timestamp = Date.now() }) {
    this.index = index;
    this.data = data;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.hash = this.computeHash();
  }

  computeHash() {
    return crypto
      .createHash("SHA256")
      .update(
        `${this.index}${this.previousHash}${this.timestamp}${JSON.stringify(
          this.data
        )}`
      )
      .digest("hex");
  }
}

export default Block;
