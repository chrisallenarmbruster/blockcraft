import {
  NetworkNode,
  Blockchain,
  ProofOfWorkConsensus,
  StandardMiningReward,
  DataHandler,
  StorageHandler,
  P2PService,
  WebService,
} from "./blockcraft.js";

let config = {};
for (let i = 2; i < process.argv.length; i += 2) {
  let key = process.argv[i];
  let value = process.argv[i + 1];
  if (key.startsWith("-")) {
    config[key.substring(1)] = value;
  }
}

"true" === config.p2pAutoStart
  ? (config.p2pAutoStart = true)
  : (config.p2pAutoStart = false);

config.p2pPort = parseInt(config.p2pPort);
config.webPort = parseInt(config.webPort);
config.seedPeers = JSON.parse(config.seedPeers);
config.testMessageDelay = parseInt(config.testMessageDelay);
config.difficulty = parseInt(config.difficulty);
config.reward = parseInt(config.reward);
config.minEntriesPerBlock = parseInt(config.minEntriesPerBlock);

async function blockchain(config) {
  let entryCount = 0;
  const numberEntriesToAdd = 1000;
  const millisecondsBetweenEntries = 3000;

  let blockchain = new Blockchain(
    new ProofOfWorkConsensus({ difficulty: config.difficulty || 6 }),
    new StandardMiningReward({ fixedReward: config.reward || 100 }),
    new DataHandler({ minEntriesPerBlock: config.minEntriesPerBlock || 3 }),
    new StorageHandler({ storagePath: config.storagePath || "blockchain.txt" })
  );

  let node = new NetworkNode(
    blockchain,
    new P2PService({
      port: config.p2pPort,
      autoStart: config.p2pAutoStart,
      id: config.p2pNodeId,
      seedPeers: config.seedPeers,
    }),
    new WebService({ port: config.webPort || 3000 })
  );

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
      console.log(
        `\nAdding \"${config.p2pNodeId.toUpperCase()}-Entry ${entryCount}\" to queue.`
      );
      node.blockchain.addEntry({
        data: `${config.p2pNodeId.toUpperCase()}-Entry ${entryCount}`,
      });
      entryCount++;
    }
  }, millisecondsBetweenEntries);

  setInterval(() => {}, 3600000); // Keep the process running
}

console.clear();

blockchain(config);

// Run this file with the following command:
//   node test.js -p2pPort 6001 -p2pAutoStart true -p2pNodeId node1 -webPort 3000 -seedPeers '["ws://localhost:6002"]' -difficulty 6 -reward 100 -minEntriesPerBlock 3 -storagePath blockchain.txt
//
// try the following in separate terminals:
// node test.js -p2pPort 6001 -p2pAutoStart true -p2pNodeId node1 -webPort 3000 -seedPeers '["ws://localhost:6002","ws://localhost:6003"]' -difficulty 6 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain.txt"
// node test.js -p2pPort 6002 -p2pAutoStart true -p2pNodeId node2 -webPort 3001 -seedPeers '["ws://localhost:6001","ws://localhost:6003"]' -difficulty 6 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain2.txt"
// node test.js -p2pPort 6003 -p2pAutoStart true -p2pNodeId node3 -webPort 3002 -seedPeers '["ws://localhost:6001","ws://localhost:6002"]' -difficulty 6 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain3.txt"
