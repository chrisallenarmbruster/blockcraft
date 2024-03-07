/**
 * StorageHandler.js
 *
 * This file defines the StorageHandler class, which is responsible for managing the persistent storage of the blockchain data.
 *
 * The StorageHandler class is constructed with a configuration object and maintains a reference to the blockchain instance it is associated with.
 *
 * The saveBlock method is used to save a block to storage.
 *
 * The saveBlockchain method is used to save the entire blockchain to storage.
 *
 * The loadBlockchain method is used to load the entire blockchain from storage.
 *
 * The clearStorage method is used to clear the storage.
 *
 * The exportChainToJSON method is used to export the entire blockchain to a JSON string.
 *
 * These methods should be overridden by subclasses to implement specific storage mechanisms.
 *
 */
import fs from "fs/promises";
import path from "path";

class StorageHandler {
  constructor(config) {
    this.config = config;
    this.blockchain = null;
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }

  async saveBlock(block) {
    try {
      const blockData = JSON.stringify(block.toSerializableObject()) + ",\n";
      await fs.appendFile(this.config.storagePath, blockData);
    } catch (error) {
      console.error("Failed to save block:", error);
      throw error;
    }
  }

  async clearStorage() {
    try {
      await fs.writeFile(this.config.storagePath, "");
    } catch (error) {
      console.error("Failed to clear storage:", error);
      throw error;
    }
  }

  async saveBlockchain() {
    try {
      const blockchainData = this.blockchain.chain
        .map((block) => JSON.stringify(block) + ",\n")
        .join("");
      await fs.writeFile(this.config.storagePath, blockchainData);
    } catch (error) {
      console.error("Failed to save blockchain:", error);
      throw error;
    }
  }

  async loadBlockchain() {
    try {
      const fileContent = await fs.readFile(this.config.storagePath, "utf8");
      const blocks = fileContent
        .split(",\n")
        .filter((line) => line)
        .map((line) => JSON.parse(line));

      this.blockchain.chain = blocks;
    } catch (error) {
      // console.error("Failed to load blockchain:", error);
      throw error;
    }
  }

  async exportChainToJSON() {
    try {
      const jsonFilePath =
        this.config.storagePath.replace(/\.[^/.]+$/, "") + ".json";

      const blockchainData = JSON.stringify(this.blockchain.chain, null, 2);

      await fs.writeFile(jsonFilePath, blockchainData);
      console.log("Blockchain exported to JSON:", jsonFilePath);
    } catch (error) {
      console.error("Failed to export blockchain:", error);
      throw error;
    }
  }
}

export default StorageHandler;
