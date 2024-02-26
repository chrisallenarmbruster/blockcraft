import NetworkNode from "./NetworkNode.js";
import Blockchain from "./Blockchain.js";
import ProofOfWorkConsensus from "./ProofOfWorkConsensus.js";
import StandardMiningReward from "./StandardMiningAward.js";
import DataHandler from "./DataHandler.js";
import StorageHandler from "./StorageHandler.js";

async function blockchain() {
  let entryCount = 0;
  const numberEntriesToAdd = 1000;
  const millisecondsBetweenEntries = 3000;

  let blockchain = new Blockchain(
    new ProofOfWorkConsensus({ difficulty: 6 }),
    new StandardMiningReward({ fixedReward: 100 }),
    new DataHandler({ minEntriesPerBlock: 3 }),
    new StorageHandler({ storagePath: "blockchain.txt" })
  );

  let node = new NetworkNode(blockchain);

  node.blockchain.on("blockchainLoaded", (chain) => {
    console.log(
      `\nBlockchain with ${chain.length} block(s) found in storage and loaded.\n`
    );
  });

  node.blockchain.on("genesisBlockCreated", (block) => {
    console.log(
      "\nNo blockchain found in storage.  New chain initialized with Genesis Block:\n",
      block,
      "\n"
    );
  });

  node.blockchain.on("blockCreationStarted", (data) => {
    console.log(
      `\nNew block creation started for block #${node.blockchain.chain.length} with data:\n`,
      data,
      "\nMining in progress, please stand by...\n"
    );
  });

  node.blockchain.on("blockCreated", (block) => {
    console.log(
      `\nBlock #${block.index} mined in ${
        (Date.now() - block.timestamp) / 1000
      } seconds and appended to chain:\n`,
      block
    );
  });

  node.blockchain.on("incentiveDistributed", (incentiveDetails) => {
    console.log(
      `\nIncentive of ${incentiveDetails.incentive} distributed to ${incentiveDetails.miner} of block #${incentiveDetails.block.index}:\n`
    );
  });

  const intervalId = setInterval(() => {
    if (entryCount >= numberEntriesToAdd) {
      clearInterval(intervalId);
    } else {
      console.log(`Adding \"Entry ${entryCount}\" to queue.`);
      node.blockchain.addEntry({ data: `Entry ${entryCount}` });
      entryCount++;
    }
  }, millisecondsBetweenEntries);

  setInterval(() => {}, 3600000); // Keep the process running
}

blockchain();
