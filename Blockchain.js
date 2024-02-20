import ProofOfWork from "./ProofOfWorkBlock.js";

class Blockchain {
  constructor(
    consensusMechanism = new ProofOfWork(),
    incentiveModel = new StandardMiningReward(),
    config = {}
  ) {
    this.consensusMechanism = consensusMechanism;
    this.incentiveModel = incentiveModel;
    Object.assign(this, config);
    this.chain = [this.createGenesisBlock()];
    // ... Other initializations ...
  }

  createGenesisBlock() {
    // The genesis block creation might use properties from the config
    // ...
  }

  addBlock(data) {
    // The addBlock logic might also use properties from the config
    // Example: using this.difficulty if needed by the consensus mechanism
    // ...
  }

  // ... Other methods ...
}
