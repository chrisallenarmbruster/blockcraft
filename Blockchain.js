import ProofOfWorkConsensus from "./ProofOfWorkConsensus.js";
import StandardMiningReward from "./StandardMiningAward.js";
import DataHandler from "./DataHandler.js";

class Blockchain {
  constructor(
    consensusMechanism = new ProofOfWorkConsensus({ difficulty: 4 }),
    incentiveModel = new StandardMiningReward({ fixedReward: 50 }),
    dataHandler = new DataHandler(),
    config = {}
  ) {
    this.consensusMechanism = consensusMechanism;
    this.incentiveModel = incentiveModel;
    this.dataHandler = dataHandler;
    this.config = config;
    this.consensusMechanism.setBlockchain(this);
    this.incentiveModel.setBlockchain(this);
    this.dataHandler.setBlockchain(this);
    this.chain = [this.createGenesisBlock()];
    this.onChainUpdateCallback = () => {};
  }

  createGenesisBlock() {
    return this.consensusMechanism.createGenesisBlock();
  }

  async addBlock(data) {
    try {
      const previousBlock = this.getLatestBlock();
      const block = await this.consensusMechanism.createBlock(
        this.chain.length,
        data,
        previousBlock.hash
      );

      this.chain.push(block);

      const reward = this.incentiveModel.calculateReward(block);
      this.incentiveModel.distributeReward(block, reward);

      this.onChainUpdateCallback(this.chain);
    } catch (error) {
      console.error("Failed to add block:", error);
    }
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (
        currentBlock.hash !== currentBlock.computeHash() ||
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

      if (currentBlock.hash !== currentBlock.computeHash()) {
        errors.push(`Block ${i} has been tampered with.`);
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        errors.push(`Block ${i} has an invalid previous hash.`);
      }

      if (currentBlock.index !== i) {
        errors.push(`Block ${i} has an invalid index.`);
      }

      if (currentBlock.timestamp < previousBlock.timestamp) {
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

export default Blockchain;
