/**
 * IncentiveModel.js
 *
 * This file defines the IncentiveModel class, which serves as an abstract base class for different incentive models in a blockchain.
 *
 * This class or its subclasses are passed into the Blockchain class to define the incentive model for the blockchain.
 *
 * The IncentiveModel class is constructed with a configuration object and has methods for setting the blockchain instance, calculating the reward for a block, distributing the reward, and updating the configuration.
 *
 * The calculateReward and distributeReward methods are placeholders that should be overridden by subclasses to implement specific logic for calculating and distributing the reward for a block.
 *
 * The setBlockchain method is used to set the blockchain instance that the incentive model belongs to.
 *
 * The updateConfig method is used to update the configuration of the incentive model.
 *
 */

class IncentiveModel {
  constructor(config) {
    this.config = config;
    this.blockchain = null;
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
  }

  calculateIncentive(block) {
    // Placeholder for reward calculation logic
    // This method can be overridden by subclasses to implement specific reward logic
    throw new Error("calculateIncentive method must be implemented");
  }

  distributeIncentive(block, incentive) {
    // Placeholder for reward distribution logic
    // This method can be overridden by subclasses to implement specific distribution logic
    throw new Error("distributeIncentive method must be implemented");
  }

  processIncentive(block) {
    // Placeholder for processing incentive logic
    // This method can be overridden by subclasses to implement specific processing logic
    throw new Error("processIncentive method must be implemented");
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }
}

export default IncentiveModel;
