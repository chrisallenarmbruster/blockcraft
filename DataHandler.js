class DataHandler {
  constructor() {
    this.blockchain = null;
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
  }

  // Methods that can now use this.blockchain to call Blockchain methods
}

export default DataHandler;
