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
    this.currentMiningBlock = null;
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
    this.blockchain.on("peerBlockAdded", () => {
      console.log("Stopping mining due to new peer block acceptance.");
      if (this.currentMiningBlock) {
        this.currentMiningBlock.stopMining = true;
      }
    });
    this.blockchain.on("newPeerChainAccepted", () => {
      console.log("Stopping mining due to new peer chain acceptance.");
      if (this.currentMiningBlock) {
        this.currentMiningBlock.stopMining = true;
      }
    });
  }

  async createBlock(index, data, previousHash) {
    console.log(
      "Creating new block...",
      index,
      data,
      previousHash,
      this.blockchain.networkNode.config
    );
    const newBlock = new ProofOfWorkBlock({
      index,
      data,
      previousHash,
      blockCreator: this.blockchain.networkNode.config.id,
      ownerAddress: this.blockchain.networkNode.config.ownerAddress,
      difficulty: this.difficulty,
    });
    newBlock.setBlockchain(this.blockchain);

    this.currentMiningBlock = newBlock;

    const minedSuccessfully = await newBlock.mineBlock();

    this.currentMiningBlock = null;

    if (!minedSuccessfully) {
      return null;
    }

    return newBlock;
  }

  createGenesisBlock(config) {
    return new ProofOfWorkBlock({
      index: 0,
      data: config.genesisEntries,
      previousHash: "0",
      timestamp: config.genesisTimestamp,
      blockCreator: "Genesis Block",
      ownerAddress: "Genesis Block",
      difficulty: this.difficulty,
    });
  }

  validateBlockHash(block) {
    const hash = new ProofOfWorkBlock(block).hash;
    return hash === block.hash;
  }

  async validateBlockConsensus(block) {
    return this.validateBlockHash(block);
  }
}

export default ProofOfWorkConsensus;
