/**
 * ProofOfWorkConsensus.js
 *
 * This file defines the ProofOfWorkConsensus class, which extends the ConsensusMechanism class and implements a proof-of-work consensus mechanism.
 *
 * This class is passed into the Blockchain class to define a consensus mechanism for the blockchain.
 *
 * The ProofOfWorkConsensus class is constructed with a configuration object and has a difficulty level, which determines how hard it is to mine a block.
 *
 * The createGenesisBlock method is used to create the genesis block, which is the first block in the blockchain. It creates a new ProofOfWorkBlock with the index of 0, the data of "Genesis Block", the previousHash of "0", and the difficulty level of this consensus mechanism.
 *
 * The createBlock method is used to create a new block with a given index, data, and previousHash. It creates a new ProofOfWorkBlock with the given parameters and the difficulty level of this consensus mechanism, mines the block, and then returns it.
 *
 * @author Your Name
 * @version 1.0
 * @since 2022-01-01
 */

import ConsensusMechanism from "./ConsensusMechanism.js";
import ProofOfWorkBlock from "./ProofOfWorkBlock.js";

class ProofOfWorkConsensus extends ConsensusMechanism {
  constructor(config) {
    super(config);
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
    await newBlock.mineBlock();
    return newBlock;
  }

  validateBlockHash(block) {
    const hash = new ProofOfWorkBlock(block).hash;
    return hash === block.hash;
  }
}

export default ProofOfWorkConsensus;
