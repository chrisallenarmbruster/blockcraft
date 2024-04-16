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
      seedPeers: config.seedPeers,
    }),
    new WebService({ port: config.webPort || 3000 }),
    {
      id: config.nodeId,
      label: config.nodeLabel,
      ip: config.nodeIp,
      url: config.nodeUrl,
    }
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
        `\nAdding \"${config.nodeId.toUpperCase()}-Entry ${entryCount}\" to queue.`
      );
      node.blockchain.addEntry({
        data: `${config.nodeId.toUpperCase()}-Entry ${entryCount}`,
      });
      entryCount++;
    }
  }, millisecondsBetweenEntries);

  setInterval(() => {}, 3600000); // Keep the process running
}

console.clear();

blockchain(config);

// Run this file with the following command:
//  node test.js -nodeId node1 -nodeLabel "Node 1" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6001 -p2pAutoStart true -seedPeers '["ws://localhost:6002","ws://localhost:6003"]' -webPort 3000 -difficulty 5 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain.txt"
//
// try the following in separate terminals:
//  node test.js -nodeId node1 -nodeLabel "Node 1" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6001 -p2pAutoStart true -seedPeers '["ws://localhost:6002","ws://localhost:6003"]' -webPort 3000 -difficulty 5 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain.txt"
//  node test.js -nodeId node2 -nodeLabel "Node 2" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6002 -p2pAutoStart true -seedPeers '["ws://localhost:6001","ws://localhost:6003"]' -webPort 3001 -difficulty 5 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain2.txt"
//  node test.js -nodeId node3 -nodeLabel "Node 3" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6003 -p2pAutoStart true -seedPeers '["ws://localhost:6001","ws://localhost:6002"]' -webPort 3002 -difficulty 5 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain3.txt"
