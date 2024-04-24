import fs from "fs";
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
} from "../blockcraft.js";
import { get } from "http";

const configFilePath = process.argv[2];
let config = JSON.parse(fs.readFileSync(configFilePath, "utf8"));

const accounts = [
  {
    privateKey:
      "eb25c7091e6d1085596924e0c45dca79492c754ced32fe156ef3cf8241ab36fc",
    publicKeyCompressed:
      "03b5f4f8ea6eb0d146a3e9a2a0dd89c0124acd5a980a230d097bf6794a85d0d879",
  },
  {
    privateKey:
      "ef4f978f9dfe98b3da6c195f10ef08a40d230f4278cb5d7eff0a68154c049213",
    publicKeyCompressed:
      "03a010ab53e15ec2f56c1f83dcb7fddbc80334fb5aeda42346580208be6be0c8d6",
  },
  {
    privateKey:
      "bf57ea21283cf44ed224c0e737356ed39b49312089348d6bc8cd4eaee717de4f",
    publicKeyCompressed:
      "0305fbfef5295b9e13a6a1c6208b93bbedbc9d259e8b5e5956b64acf21ab5600c4",
  },
  {
    privateKey:
      "eee366f4e97ec8d5cad68948ab3b668924c92b4193c53439c206a542bc2f1f73",
    publicKeyCompressed:
      "02572dff346ccd699e043839e98fe4414512080ec6821afd9ceb4edf47c7953ed7",
  },
  {
    privateKey:
      "b960bd23fc35aedc01f4a4211549c82cb507d3630e40cd363a91d5bdeef0cd16",
    publicKeyCompressed:
      "021829f5f2d714bcec448f8019ffd43e267088ba42408483d7d2d1257f8d5a639b",
  },
  {
    privateKey:
      "30c34382d8fca736bf3459a21a3f1e2e2e01813a6d1934b1e398eba56a17a3d4",
    publicKeyCompressed:
      "027097754984f873f435d6acc434affd0e36c3530d685be10d3b9d068be0666866",
  },
  {
    privateKey:
      "0e3fbd351b598100b7cbb1cfb616160c7e9b78f1a87eeacff8addc921768b430",
    publicKeyCompressed:
      "03797f816e17fd9ef1c0f521d7a9b608d83e1fffb64e3157b8ce186f3b58b4189e",
  },
  {
    privateKey:
      "e828647aefb983ae104d670579dd20463429bbd408b8cd4bc98b36d3b0706015",
    publicKeyCompressed:
      "032cf276cc6ec175a7fa7dfae8c8e652a0cb161bf8ffdaffc4a66f46071e51090b",
  },
  {
    privateKey:
      "30ea59802cd036c618fc334ce8ee4d9630cf177326817b1535babad4d161b39f",
    publicKeyCompressed:
      "02e31edc5c89d85ea2984afcc04603caf3b5f40a94b295fa780a74be872d208c4d",
  },
  {
    privateKey:
      "4d065cdb79226487e28e6b0a16673ad9fd3bbe7f690abfc4e8e380863f3d164e",
    publicKeyCompressed:
      "03845f109f65359905763171ed9afd3ebc0f0accbda25d2a268099dd8ccfd90d9b",
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
    {
      blockchainName: config.blockchainName || "Blockcraft",
      genesisTimestamp: config.genesisTimestamp,
      genesisEntries: config.genesisEntries,
    }
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

  function computeAccountBalance(account) {
    let balance = 0;
    balance += node.blockchain
      .getEntriesReceivedByAccount(account)
      .reduce((acc, entry) => {
        return acc + entry.amount;
      }, 0);
    balance -= node.blockchain
      .getEntriesSentByAccount(account)
      .reduce((acc, entry) => {
        return acc + entry.amount;
      }, 0);
    return balance;
  }

  setTimeout(() => {
    const account =
      "032cf276cc6ec175a7fa7dfae8c8e652a0cb161bf8ffdaffc4a66f46071e51090b";
    const entries = [
      ...node.blockchain.getEntriesReceivedByAccount(account),
      ...node.blockchain.getEntriesSentByAccount(account),
    ];
    console.log("entries", entries);
  }, 3000);

  const intervalId = setInterval(() => {
    if (entryCount >= numberEntriesToAdd) {
      clearInterval(intervalId);
    } else {
      console.log(
        `\nAdding \"${config.nodeId.toUpperCase()}-Entry ${entryCount}\" to queue.`
      );

      const senderKeyPair = accounts.random();
      const accountBalance = computeAccountBalance(
        senderKeyPair.publicKeyCompressed
      );

      if (accountBalance > 0) {
        let amount = Math.floor(Math.random() * accountBalance);
        amount = amount === 0 ? accountBalance : amount;
        const unsignedEntry = {
          from: senderKeyPair.publicKeyCompressed,
          to: accounts.random().publicKeyCompressed,
          amount: amount,
          type: "crypto",
          initiationTimestamp: Date.now(),
          data: `${config.nodeId.toUpperCase()}-Entry ${entryCount}`,
        };

        const entryHash = hashEntry(unsignedEntry);

        const entryToSign = {
          ...unsignedEntry,
          hash: entryHash,
        };

        const signature = signEntry(entryToSign, senderKeyPair.privateKey);

        const signedEntry = {
          ...unsignedEntry,
          hash: entryHash,
          signature: signature,
        };

        node.blockchain.addEntry(signedEntry);

        entryCount++;
      }
    }
  }, millisecondsBetweenEntries);

  setInterval(() => {}, 3600000); // Keep the process running
}

console.clear();

blockchain(config);

/* Run this file with the following command:
  
node test.js -nodeId node1 -nodeLabel "Node 1" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6001 -p2pAutoStart true -seedPeers '["ws://localhost:6002","ws://localhost:6003"]' -webPort 3000 -difficulty 5 -reward 100 -minEntriesPerBlock 3 -storagePath "blockchain.txt"

try the following in separate terminals:

    if (!minedSuccessfully) {
node test.js -nodeId node1 -nodeLabel "Node 1" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6001 -p2pAutoStart true -seedPeers '["ws://localhost:6002","ws://localhost:6003","ws://localhost:6004"]' -webPort 3000 -difficulty 5 -reward 100 -minEntriesPerBlock 7 -storagePath "blockchain.txt" -genesisTimestamp 1640995200000
node test.js -nodeId node2 -nodeLabel "Node 2" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6002 -p2pAutoStart true -seedPeers '["ws://localhost:6001","ws://localhost:6003","ws://localhost:6004"]' -webPort 3001 -difficulty 5 -reward 100 -minEntriesPerBlock 7 -storagePath "blockchain2.txt" -genesisTimestamp 1640995200000 -genesisEntries '["Genesis Block"]'
node test.js -nodeId node3 -nodeLabel "Node 3" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6003 -p2pAutoStart true -seedPeers '["ws://localhost:6001","ws://localhost:6002","ws://localhost:6004"]' -webPort 3002 -difficulty 5 -reward 100 -minEntriesPerBlock 7 -storagePath "blockchain3.txt"
node test.js -nodeId node4 -nodeLabel "Node 4" -nodeIp 127.0.0.1 -nodeUrl localhost -p2pPort 6004 -p2pAutoStart true -seedPeers '["ws://localhost:6001","ws://localhost:6002","ws://localhost:6003"]' -webPort 3003 -difficulty 5 -reward 100 -minEntriesPerBlock 7 -storagePath "blockchain4.txt"

*/
