class IncentiveModel {
  constructor(config) {
    this.config = config;
    this.blockchain = null;
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
  }

  calculateReward(block) {
    // Placeholder for reward calculation logic
    // This method can be overridden by subclasses to implement specific reward logic
    throw new Error("calculateReward method must be implemented");
  }

  distributeReward(block, reward) {
    // Placeholder for reward distribution logic
    // This method can be overridden by subclasses to implement specific distribution logic
    throw new Error("distributeReward method must be implemented");
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }
}

export default IncentiveModel;
