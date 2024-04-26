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
import crypto from "crypto";

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
    const miner = block.ownerAddress;

    const unhashedEntry = {
      from: "INCENTIVE",
      to: block.ownerAddress,
      amount: incentive,
      type: "crypto",
      initiationTimestamp: Date.now(),
      data: `Block creation incentive for block #${block.index}.`,
    };

    function hashEntry(entry) {
      const hash = crypto.createHash("SHA256");
      hash.update(JSON.stringify(entry));
      return hash.digest("hex");
    }

    const entryHash = hashEntry(unhashedEntry);

    const hashedEntry = {
      ...unhashedEntry,
      hash: entryHash,
      signature: null,
    };

    this.blockchain.addEntry(hashedEntry);
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
          minterAddress: targetBlock.ownerAddress,
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
