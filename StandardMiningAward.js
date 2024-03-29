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

  calculateIncentive(block) {
    return this.fixedReward;
  }

  distributeIncentive(block, incentive) {
    // Distribute the reward to the miner (block creator)
    // In practice, this would involve creating a transaction
    // For demonstration, just logging the distribution
    // Update the blockchain state to reflect this reward distribution
    // This might involve updating the miner's balance or adding a transaction to the block
    const miner = block.blockCreator; // Replace with logic to determine who mined the block
    return {
      block,
      incentive,
      miner,
      message: `Distributed ${incentive} to ${miner}.`,
    };
  }

  processIncentive(block) {
    let result = {
      success: false,
      targetBlockIndex: null,
      incentiveDetails: null,
    };

    if (block.index >= 7) {
      const targetBlockIndex = block.index - 6;
      const targetBlock = this.blockchain.getBlockByIndex(targetBlockIndex);

      if (targetBlock) {
        const incentive = this.calculateIncentive(targetBlock);
        this.distributeIncentive(targetBlock, incentive);

        result.success = true;
        result.blockIndex = targetBlockIndex;
        result.incentiveDetails = {
          blockCreator: targetBlock.blockCreator,
          incentiveAmount: incentive,
        };
      }
    } else {
      console.log("Blockchain not long enough to process incentives yet.");
    }

    return result;
  }
}

export default StandardMiningReward;
