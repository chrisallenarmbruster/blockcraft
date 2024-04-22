import crypto from "crypto";
import elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");

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

const accounts = [
  {
    privateKey:
      "29913f9985e8e2527de4f60d30c9e00718ad9f09a17e523b53155eb4caa027a9",
    publicKeyCompressed:
      "03938a3f78b121f92c4eab3a8ce35574e57f863ed75ce637ae1400cd33b7d99e4a",
  },
  {
    privateKey:
      "5b4d508d994487a960ca6bcb2e457a48bd5c5e0c3bf81ded9d72f432d94d50d8",
    publicKeyCompressed:
      "03c610d43ea158eb15d7ad3129e9d0c34c58f7c52b2afa93abc5616c11b439e6c8",
  },
  {
    privateKey:
      "d3bac06590120ad854365d26fd782e9f014cdcc5cc6435427c005c16757dc413",
    publicKeyCompressed:
      "02f9745a70591442d139d4d244a2ab5b8f170081cc3f4d603e2972535402e6577a",
  },
  {
    privateKey:
      "7c335dd16a5e6ca7e5a23b242afb58cd2827405ed07f48bb41704e4923f74fce",
    publicKeyCompressed:
      "0243e91ee7de0bf23400eb7a38e8a48a8b65f28e643200769e7b7b0ce0ba96b4ba",
  },
  {
    privateKey:
      "957ec60108edbf844c0990bf36c9273fc243c4d14361b9a7013b83b75500639d",
    publicKeyCompressed:
      "035bdeedfcf74b4b0e1102b3de81b27abc0d3815bebbc01fd81a85796c5bef25c6",
  },
  {
    privateKey:
      "7498a29c649d0e696ac640694425c9cf8ee668e18ef3ebef689494908755b7fb",
    publicKeyCompressed:
      "0267906d0547ac4cf33ac14e9f8469ab49f8a7b9edb8df7176ae0d3ed8cfef4477",
  },
  {
    privateKey:
      "669ad6449b1d5034450be1e7cf6e8a4013f12a550e5f28485c0322a7147af11c",
    publicKeyCompressed:
      "021cd9bf94677db290325f2377161c94d2a5b42d4d9b2003d728c29f8f16710d08",
  },
  {
    privateKey:
      "960748a4ae1043df4a2721b521a0527c0cfa0672efde13458ce50769520813fd",
    publicKeyCompressed:
      "02ceb7c11f7f0bc17e7054a0033f569932e359b36dab108970c795189a7d290a29",
  },
  {
    privateKey:
      "4e7124857580d59f41f8e669516b5816e17df8c744ab0a9fc6baff38f399e6fc",
    publicKeyCompressed:
      "02b116b1a6d8fc9db9a01b3856a271f983d0d87de0f50c438b908a2cc50cad62cf",
  },
  {
    privateKey:
      "4ce5355f938437d4671666795745182d4cefff365f04a5534ea2536fb3544b75",
    publicKeyCompressed:
      "02b4b0f37594a9a73dd76fe4a78e724417c8946be109aeb0921451cee6c6895be9",
  },
];

Array.prototype.random = function () {
  return this[Math.floor(Math.random() * this.length)];
};

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

  function signEntry(entry, privateKeyHex) {
    const sign = crypto.createSign("SHA256");
    sign.update(JSON.stringify(entry));
    sign.end();
    const ecKeyPair = ec.keyFromPrivate(privateKeyHex);
    const signature = ecKeyPair.sign(JSON.stringify(entry)).toDER("hex");
    return signature;
  }

  function hashEntry(entry) {
    const hash = crypto.createHash("SHA256");
    hash.update(JSON.stringify(entry));
    return hash.digest("hex");
  }

  const intervalId = setInterval(() => {
    if (entryCount >= numberEntriesToAdd) {
      clearInterval(intervalId);
    } else {
      console.log(
        `\nAdding \"${config.nodeId.toUpperCase()}-Entry ${entryCount}\" to queue.`
      );

      const senderKeyPair = accounts.random();

      const unsignedEntry = {
        from: senderKeyPair.publicKeyCompressed,
        to: accounts.random().publicKeyCompressed,
        amount: Math.floor(Math.random() * 100),
        type: "crypto",
        data: `${config.nodeId.toUpperCase()}-Entry ${entryCount}`,
      };

      const entryHash = hashEntry(unsignedEntry);
      const signature = signEntry(unsignedEntry, senderKeyPair.privateKey);

      const signedEntry = {
        ...unsignedEntry,
        hash: entryHash,
        signature: signature,
      };

      node.blockchain.addEntry(signedEntry);

      entryCount++;
    }
  }, millisecondsBetweenEntries);

  setInterval(() => {}, 3600000); // Keep the process running
}

console.clear();

blockchain(config);

/* Run this file with the following command:
  
node test.js -nodeId node1 -nodeLabel "Node 1" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6001 -p2pAutoStart true -seedPeers '["ws://localhost:6002","ws://localhost:6003"]' -webPort 3000 -difficulty 5 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain.txt"

try the following in separate terminals:

node test.js -nodeId node1 -nodeLabel "Node 1" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6001 -p2pAutoStart true -seedPeers '["ws://localhost:6002","ws://localhost:6003","ws://localhost:6004"]' -webPort 3000 -difficulty 5 -reward 100 -minEntriesPerBlock 7 -storagePath "blockchain.txt"
node test.js -nodeId node2 -nodeLabel "Node 2" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6002 -p2pAutoStart true -seedPeers '["ws://localhost:6001","ws://localhost:6003","ws://localhost:6004"]' -webPort 3001 -difficulty 5 -reward 100 -minEntriesPerBlock 7 -storagePath "blockchain2.txt"
node test.js -nodeId node3 -nodeLabel "Node 3" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6003 -p2pAutoStart true -seedPeers '["ws://localhost:6001","ws://localhost:6002","ws://localhost:6004"]' -webPort 3002 -difficulty 5 -reward 100 -minEntriesPerBlock 7 -storagePath "blockchain3.txt"
node test.js -nodeId node4 -nodeLabel "Node 4" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6004 -p2pAutoStart true -seedPeers '["ws://localhost:6001","ws://localhost:6002","ws://localhost:6003"]' -webPort 3003 -difficulty 5 -reward 100 -minEntriesPerBlock 7 -storagePath "blockchain4.txt"

*/
