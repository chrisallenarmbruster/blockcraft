class DataHandler {
  constructor(config) {
    this.config = config;
    this.pendingEntries = [];
    this.blockchain = null;
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }

  async addPendingEntry(entry) {
    if (this.validatePendingEntry(entry)) {
      this.pendingEntries.push(this.transformPendingEntry(entry));
      if (this.shouldAddBlock()) {
        await this.blockchain.addBlock(this.pendingEntries);
        this.clearPendingEntries(); // Reset pending entries
      }
    }
  }

  getPendingEntries() {
    return this.pendingEntries;
  }

  clearPendingEntries() {
    this.pendingEntries = [];
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

  shouldAddBlock() {
    return this.pendingEntries.length >= this.config.maxEntriesPerBlock;
    //return this.config.shouldAddBlock(this.pendingEntries);
    // Placeholder for block addition decision logic
    // This method can be overridden by subclasses to implement specific block addition decision logic
    throw new Error("shouldAddBlock method must be implemented");
  }

  //other methods
}

export default DataHandler;
