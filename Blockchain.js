/**
 * Blockchain.js
 *
 * This file defines the Blockchain class, which is the main structure for storing and managing data in this blockchain implementation.
 *
 * The Blockchain class uses a consensus mechanism, an incentive model, and a data handler, all of which are passed in as parameters to the constructor.
 * This separates the concerns of establishing consensus to create valid blocks, incentivizing participants, and handling/storing data from each other and the main blockchain logic.
 * This is paving the way for a library of consensus mechanisms, incentive models, data handlers and storage handlers that can be mixed and matched to create custom blockchains.
 * You may create your own custom classes extended from the included base classes that implement these roles and pass them into the Blockchain class.
 *
 * By default, it uses the ProofOfWorkConsensus, StandardMiningReward, DataHandler and StorageHandler classes for these roles.
 *
 * The Blockchain class also allows for a configuration object to be passed in for additional customization.
 *
 * The consensus mechanism, incentive model, data handler and storage handler are all given a reference to the Blockchain instance they belong to.
 *
 * The Blockchain starts with a single block, the genesis block, created by the consensus mechanism.
 *
 * The consensus mechanism is also used to agree on and create new blocks, calling on the Blockchain class to add them to the chain.
 *
 * The addEntry method is used to add new data to the blockchain. It passes the data to the data handler, which handles adding it to the pending entries and determines when a new block should be added.
 *
 * After a block is added to the blockchain, the incentive model's calculateReward and distributeReward methods are called to calculate and distribute incentives to the participants for the block.
 *
 */

import { EventEmitter } from "events";
import ProofOfWorkConsensus from "./ProofOfWorkConsensus.js";
import StandardMiningReward from "./StandardMiningAward.js";
import DataHandler from "./DataHandler.js";
import StorageHandler from "./StorageHandler.js";

class Blockchain extends EventEmitter {
  constructor(
    consensusMechanism = new ProofOfWorkConsensus({ difficulty: 4 }),
    incentiveModel = new StandardMiningReward({ fixedReward: 50 }),
    dataHandler = new DataHandler(),
    storageHandler = new StorageHandler({ storagePath: "blockchain.txt" }),
    config = {}
  ) {
    super();
    this.consensusMechanism = consensusMechanism;
    this.incentiveModel = incentiveModel;
    this.dataHandler = dataHandler;
    this.storageHandler = storageHandler;
    this.config = config;
    this.consensusMechanism.setBlockchain(this);
    this.incentiveModel.setBlockchain(this);
    this.dataHandler.setBlockchain(this);
    this.storageHandler.setBlockchain(this);
    this.chain = [];
    this.blockCreationInProgress = false;
    this.initialize();
  }

  async initialize() {
    try {
      await this.storageHandler.loadBlockchain();
      this.emit("blockchainLoaded", this.chain);
    } catch (error) {
      const genesisBlock = await this.createGenesisBlock();
      this.chain.push(genesisBlock);
      this.emit("genesisBlockCreated", genesisBlock);
    }
  }

  async createGenesisBlock() {
    const genesisBlock = this.consensusMechanism.createGenesisBlock();
    await this.storageHandler.saveBlock(genesisBlock);
    return genesisBlock;
  }

  async addEntry(entry) {
    try {
      this.dataHandler.addPendingEntry(entry);
    } catch (error) {
      console.error("Failed to add entry:", error);
    }
  }

  async addBlock(data) {
    if (this.blockCreationInProgress) {
      console.log("a block creation is already in progress.");
      return;
    }
    this.blockCreationInProgress = true;
    this.emit("blockCreationStarted", data);

    try {
      const previousBlock = this.getLatestBlock();
      const block = await this.consensusMechanism.createBlock(
        this.chain.length,
        data,
        previousBlock.hash
      );

      await this.storageHandler.saveBlock(block);

      this.chain.push(block);
      this.emit("blockCreated", block);

      const incentive = this.incentiveModel.calculateIncentive(block);
      const incentiveDistributed = this.incentiveModel.distributeIncentive(
        block,
        incentive
      );

      if (incentiveDistributed) {
        this.emit("incentiveDistributed", incentiveDistributed);
      }
    } catch (error) {
      console.error("Failed to add block:", error);
    } finally {
      this.blockCreationInProgress = false;
      this.emit("blockCreationEnded");
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

  importChain(chain) {
    // import chain from storage
  }

  exportChain() {
    //export chain to storage
  }
}

export default Blockchain;
