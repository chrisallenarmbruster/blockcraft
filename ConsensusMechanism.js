/**
 * ConsensusMechanism.js
 *
 * This file defines the ConsensusMechanism class, which serves as an abstract base class for different consensus mechanisms in a blockchain.
 *
 * This class or its subclasses are passed into the Blockchain class to handle the logic for creating the genesis block, and aligning on new valid blocks.
 *
 * The ConsensusMechanism class is constructed with a configuration object and has methods for setting the blockchain instance, creating the genesis block, creating a new block, and updating the configuration.
 *
 * The createGenesisBlock and createBlock methods are placeholders that should be overridden by subclasses to implement specific logic for creating the genesis block and new blocks.
 *
 * The setBlockchain method is used to set the blockchain instance that the consensus mechanism belongs to.
 *
 * The updateConfig method is used to update the configuration of the consensus mechanism.
 *
 */

class ConsensusMechanism {
  constructor(config) {
    this.config = config;
    this.blockchain = null;
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
  }

  createGenesisBlock() {
    // Placeholder for genesis block creation
    // This method can be overridden by subclasses to implement specific genesis block logic
    throw new Error("createGenesisBlock method must be implemented");
  }

  createBlock(index, data, previousHash) {
    // Placeholder for block creation
    // This method can be overridden by subclasses to implement specific block creation logic
    throw new Error("createBlock method must be implemented");
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }
}

export default ConsensusMechanism;
