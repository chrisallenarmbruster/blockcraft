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
    const stringOfThisBlock = JSON.stringify(this);
    const hash = crypto.createHash("SHA256");
    hash.update(stringOfThisBlock);
    return hash.digest("hex");
  }
}

export default Block;
