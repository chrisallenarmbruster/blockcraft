/**
 * DataHandler.js
 *
 * This file defines the DataHandler class, which is responsible for managing the data entries in our blockchain implementation.
 *
 * An entry is a piece of data that is added to the blockchain. It can be anything from a simple string to a complex transaction object, medical record or vote.
 *
 * This class or its subclasses are passed into the Blockchain class to handle the data entries.
 *
 * The DataHandler class is constructed with a configuration object and maintains a list of pending entries that are waiting to be added to the blockchain.
 *
 * The addPendingEntry method is used to add a new entry to the pending entries. It validates the entry, transforms it, and adds it to the list. If the conditions for adding a new block are met, it triggers the creation of a new block with the pending entries.
 *
 * The getPendingEntries and clearPendingEntries methods are used to retrieve and clear the pending entries, respectively.
 *
 * The validatePendingEntry method is used to validate a pending entry. It should be overridden by subclasses to implement specific validation logic.
 *
 * Treat this as a base class for the DataHandler. It should be extended by subclasses to implement specific data handling logic.
 *
 */
import { nanoid } from "nanoid";
class DataHandler {
  constructor(config) {
    this.config = config;
    this.entryPool = new Map();
    this.blockchain = null;
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
    this.blockchain.on("blockCreationEnded", (block) => {
      if (block) {
        this.removeProcessedTransactions(block);
      }
      this.checkAndInitiateBlockCreation();
    });
    this.blockchain.on("peerBlockAdded", (block) => {
      if (block) {
        this.removeProcessedTransactions(block);
      }
      this.checkAndInitiateBlockCreation();
    });
    this.blockchain.on("newPeerChainAccepted", (newChain) => {
      this.updateEntryPoolWithNewChain(newChain);
    });
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }

  addPendingEntry(entry) {
    if (!entry.entryId) {
      entry.entryId = nanoid();
    }

    if (!this.entryPool.has(entry.entryId)) {
      if (this.validatePendingEntry(entry)) {
        this.entryPool.set(entry.entryId, entry);
        this.checkAndInitiateBlockCreation();
      }
    }
  }

  checkAndInitiateBlockCreation() {
    if (
      this.entryPool.size >= this.config.minEntriesPerBlock &&
      !this.blockchain.blockCreationInProgress
    ) {
      this.blockchain.addBlock(Array.from(this.entryPool.values()));
    }
  }

  removeProcessedTransactions(block) {
    if (block.data !== "Genesis Block") {
      block.data.forEach((entry) => {
        this.entryPool.delete(entry.entryId);
      });
    }
  }

  updateEntryPoolWithNewChain(newChain) {
    newChain.forEach((block) => {
      this.removeProcessedTransactions(block);
    });
  }

  clearQueuedEntries() {
    this.entryPool.clear();
  }

  getPendingEntries() {
    return Array.from(this.entryPool.values());
  }

  getEntry(entryId) {
    if (this.entryPool.has(entryId)) {
      const entry = this.entryPool.get(entryId);
      entry.blockIndex = "pending";
      return entry;
    }

    if (this.blockchain) {
      const chain = this.blockchain.chainToSerializableObject();
      for (let i = 0; i < chain.length; i++) {
        for (let entry of chain[i].data) {
          if (entry.entryId === entryId) {
            entry.blockIndex = i;
            return entry;
          }
        }
      }
    }

    return null;
  }

  validatePendingEntry(entry) {
    entry.data.toUpperCase().includes("BOGUS");
    return entry.data.toUpperCase().includes("BOGUS") ? false : true;
    // return this.config.validateEntry(entry);
    // Placeholder for entry validation
    // This method can be overridden by subclasses to implement specific entry validation logic
    throw new Error("validateEntry method must be implemented");
  }

  transformPendingEntry(entry) {
    return entry.data.toUpperCase();
    // return this.config.transformEntry(entry);
    // Placeholder for entry transformation
    // This method can be overridden by subclasses to implement specific entry transformation logic
    throw new Error("transformEntry method must be implemented");
  }
}

export default DataHandler;
