import Blockchain from "./Blockchain.js";
import ProofOfWorkConsensus from "./ProofOfWorkConsensus.js";
import StandardMiningReward from "./StandardMiningAward.js";
import DataHandler from "./DataHandler.js";
import StorageHandler from "./StorageHandler.js";

async function testBlockchain() {
  let entryCount = 0;
  const numberEntriesToAdd = 1000;
  const millisecondsBetweenEntries = 3000;

  let testBlockchain = new Blockchain(
    new ProofOfWorkConsensus({ difficulty: 6 }),
    new StandardMiningReward({ fixedReward: 100 }),
    new DataHandler({ minEntriesPerBlock: 3 }),
    new StorageHandler({ storagePath: "blockchain.txt" })
  );

  testBlockchain.on("blockchainLoaded", (chain) => {
    console.log(
      `\nBlockchain with ${chain.length} block(s) found in storage and loaded.\n`
    );
  });

  testBlockchain.on("genesisBlockCreated", (block) => {
    console.log(
      "\nNo blockchain found in storage.  New chain initialized with Genesis Block:\n",
      block,
      "\n"
    );
  });

  testBlockchain.on("blockCreationStarted", (data) => {
    console.log(
      `\nNew block creation started for block #${testBlockchain.chain.length} with data:\n`,
      data,
      "\nMining in progress, please stand by...\n"
    );
  });

  testBlockchain.on("blockCreated", (block) => {
    console.log(
      `\nBlock #${block.index} mined in ${
        (Date.now() - block.timestamp) / 1000
      } seconds and appended to chain:\n`,
      block
    );
  });

  testBlockchain.on("incentiveDistributed", (incentiveDetails) => {
    console.log(
      `\nIncentive of ${incentiveDetails.incentive} distributed to ${incentiveDetails.miner} of block #${incentiveDetails.block.index}:\n`
    );
  });

  const intervalId = setInterval(() => {
    if (entryCount >= numberEntriesToAdd) {
      clearInterval(intervalId);
    } else {
      console.log(`Adding \"Entry ${entryCount}\" to queue.`);
      testBlockchain.addEntry({ data: `Entry ${entryCount}` });
      entryCount++;
    }
  }, millisecondsBetweenEntries);

  setInterval(() => {}, 3600000); // Keep the process running
}

testBlockchain();
