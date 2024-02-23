/**
 * StandardMiningReward.js
 *
 * This file defines the StandardMiningReward class, which extends the IncentiveModel class and implements a standard fixed reward for mining a block.
 *
 * This class is passed into the Blockchain class to define an incentive model for the blockchain.
 *
 * The StandardMiningReward class is constructed with a configuration object, which should contain a fixedReward property that specifies the reward for mining a block. If no fixedReward is specified, a default value of 50 is used.
 *
 * The calculateReward method is used to calculate the reward for a block, which is the fixed reward specified in the configuration.
 *
 * The distributeReward method is used to distribute the reward to the miner of the block. In practice, this would involve creating a transaction. For demonstration purposes, this method just logs the distribution and does not actually update the blockchain state.
 *
 */

import IncentiveModel from "./IncentiveModel.js";

class StandardMiningReward extends IncentiveModel {
  constructor(config) {
    super(config);
    // Assuming config contains a fixedReward property
    this.fixedReward = config.fixedReward || 50;
  }

  calculateReward(block) {
    return this.fixedReward;
  }

  distributeReward(block, reward) {
    // Distribute the reward to the miner (block creator)
    // In practice, this would involve creating a transaction
    // For demonstration, just logging the distribution
    console.log(`Distributing ${reward} to miner of block ${block.index}`);
    // Update the blockchain state to reflect this reward distribution
    // This might involve updating the miner's balance or adding a transaction to the block
  }
}

export default StandardMiningReward;
