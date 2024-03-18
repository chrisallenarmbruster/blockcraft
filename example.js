/*
Example usage of the Blockcraft blockchain library.

Run the following commands in separate terminals:
node example.js -p2pPort 6001 -p2pAutoStart true -p2pNodeId node1 -webPort 3000 -seedPeers '["ws://localhost:6002","ws://localhost:6003"]' -difficulty 6 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain.txt"
node example.js -p2pPort 6002 -p2pAutoStart true -p2pNodeId node2 -webPort 3001 -seedPeers '["ws://localhost:6001","ws://localhost:6003"]' -difficulty 6 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain2.txt"
node example.js -p2pPort 6003 -p2pAutoStart true -p2pNodeId node3 -webPort 3002 -seedPeers '["ws://localhost:6001","ws://localhost:6002"]' -difficulty 6 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain3.txt"

Add additional nodes as needed, and adjust the seedPeers accordingly.

This will spin up three dApp network nodes communicating with each other via WebSockets on ports 6001,6002 qnd 6003 while listening on ports 3000, 3001, and 3002, respectively, for http requests.  They will automatically connect to each other. 
They will generate fictitious transactions and mine them into blocks, and distribute the mining rewards to the block creators.
They will keep transaction pools and blockchains in sync with each other, and will handle network disconnections and reconnections. 
You can access the web interfaces at: localhost:3000, localhost:3001, and localhost:3002

*/

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
    new StorageHandler({ storagePath: config.storagePath || "blockchain.txt" }),
    { blockchainName: config.blockchainName || "Blockcraft" }
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
      block.toSerializableObject()
    );
  });

  node.blockchain.on("incentiveProcessed", (incentiveResult) => {
    console.log(
      `\nIncentive of ${incentiveResult.incentiveDetails.incentiveAmount} distributed to ${incentiveResult.incentiveDetails.blockCreator} for block #${incentiveResult.blockIndex}:\n`
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
//   node example.js -p2pPort 6001 -p2pAutoStart true -p2pNodeId node1 -webPort 3000 -seedPeers '["ws://localhost:6002"]' -difficulty 6 -reward 100 -minEntriesPerBlock 3 -storagePath blockchain.txt
//
// try the following in separate terminals:
// node example.js -p2pPort 6001 -p2pAutoStart true -p2pNodeId node1 -webPort 3000 -seedPeers '["ws://localhost:6002","ws://localhost:6003"]' -difficulty 6 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain.txt"
// node example.js -p2pPort 6002 -p2pAutoStart true -p2pNodeId node2 -webPort 3001 -seedPeers '["ws://localhost:6001","ws://localhost:6003"]' -difficulty 6 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain2.txt"
// node example.js -p2pPort 6003 -p2pAutoStart true -p2pNodeId node3 -webPort 3002 -seedPeers '["ws://localhost:6001","ws://localhost:6002"]' -difficulty 6 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain3.txt"
