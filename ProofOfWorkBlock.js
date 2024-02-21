import crypto from "crypto";
import Block from "./Block.js";

//overrides the computeHash method to include the nonce and difficulty
//adds a mineBlock method to mine the block

class ProofOfWorkBlock extends Block {
  constructor({ index, data, previousHash, timestamp, difficulty = 4 }) {
    super({ index, data, previousHash, timestamp });
    this.nonce = 0;
    this.difficulty = difficulty;
    this.hash = this.computeHash();
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
      this.hash.substring(0, this.difficulty) !==
      Array(this.difficulty + 1).join("0")
    ) {
      this.nonce++;
      this.hash = this.computeHash();
      if (this.nonce % 1000 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    console.log(
      `\nBlock mined in ${(Date.now() - this.timestamp) / 1000} seconds: ${
        this.hash
      }`
    );
  }
}

export default ProofOfWorkBlock;
