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
