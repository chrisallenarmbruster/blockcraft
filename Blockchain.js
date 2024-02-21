import ProofOfWorkConsensus from "./ProofOfWorkConsensus.js";

class Blockchain {
  constructor(
    consensusMechanism = new ProofOfWorkConsensus({ difficulty: 4 }),
    incentiveModel = new StandardMiningReward(),
    config = {}
  ) {
    this.consensusMechanism = consensusMechanism;
    this.incentiveModel = incentiveModel;
    this.config = config;
    this.chain = [this.consensusMechanism.createGenesisBlock()];
  }

  createGenesisBlock() {
    return this.consensusMechanism.createGenesisBlock();
  }

  addBlock(data) {
    const previousBlock = this.getLatestBlock();
    const block = this.consensusMechanism.createBlock(
      this.chain.length,
      data,
      previousBlock.hash
    );
    this.chain.push(block);
    this.incentiveModel.applyIncentive(block);
    this.onChainUpdateCallback(this.chain);
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (
        currentBlock.hash !== currentBlock.calculateHash() ||
        currentBlock.previousHash !== previousBlock.hash
      ) {
        return false;
      }
    }
    return true;
  }

  validateChain() {
    const errors = [];
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        errors.push(`Block ${i} has been tampered with.`);
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        errors.push(`Block ${i} has an invalid previous hash.`);
      }

      if (currentBlock.index !== i) {
        errors.push(`Block ${i} has an invalid index.`);
      }

      if (currentBlock.timestamp <= previousBlock.timestamp) {
        errors.push(`Block ${i} has an invalid timestamp.`);
      }

      // other validations
    }
    return errors.length ? errors : true;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  getBlockByIndex(index) {
    return this.chain[index];
  }

  replaceChain(newChain) {
    if (newChain.length <= this.chain.length) {
      console.log("Received chain is not longer than the current chain.");
      return;
    } else if (!this.consensusMechanism.isValidChain(newChain)) {
      console.log("The received chain is not valid.");
      return;
    }

    console.log("Replacing the current chain with the new chain.");
    this.chain = newChain;
  }

  onChainUpdate(callback) {
    this.onChainUpdateCallback = callback;
  }

  importChain(chain) {
    // import chain from storage
  }

  exportChain() {
    //export chain to storage
  }
}
