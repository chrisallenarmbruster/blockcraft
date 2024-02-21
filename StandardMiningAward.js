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
