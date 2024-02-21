import ProofOfWorkBlock from "./ProofOfWorkBlock.js";

class ProofOfWorkConsensus {
  constructor(config) {
    this.difficulty = config.difficulty || 4;
  }

  createGenesisBlock() {
    return new ProofOfWorkBlock({
      index: 0,
      data: "Genesis Block",
      previousHash: "0",
      difficulty: this.difficulty,
    });
  }

  async createBlock(index, data, previousHash) {
    const newBlock = new ProofOfWorkBlock({
      index,
      data,
      previousHash,
      difficulty: this.difficulty,
    });
    console.log("\nMining block, please standby...");
    await newBlock.mineBlock();
    return newBlock;
  }
}

export default ProofOfWorkConsensus;
