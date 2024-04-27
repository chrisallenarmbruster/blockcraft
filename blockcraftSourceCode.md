# package.json

```json
{
  "name": "blockcraft",
  "version": "0.1.0",
  "type": "module",
  "description": "Blockcraft: A cutting-edge blockchain toolkit designed for developers and innovators. This versatile package provides a robust set of tools and utilities to simplify the development of blockchain applications. Whether you're building decentralized apps, smart contracts, or exploring new consensus mechanisms, BlockCraft offers a flexible and user-friendly platform to bring your blockchain visions to life. Ideal for both blockchain beginners and seasoned cryptonauts, BlockCraft is your go-to toolkit for navigating the exciting world of blockchain technology.",
  "main": "blockcraft.js",
  "scripts": {
    "test": "echo \"Error: no test specified\""
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/chrisallenarmbruster/blockcraft.git"
  },
  "keywords": [
    "blockchain",
    "blockcraft",
    "cryptocurrency",
    "decentralized",
    "smart",
    "contracts",
    "dapp",
    "ethereum",
    "consensus",
    "development",
    "toolkit",
    "blockchain",
    "development"
  ],
  "author": "Chris Armbruster <chris@armbrustermail.com> (https://github.com/chrisallenarmbruster)",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/chrisallenarmbruster/blockcraft/issues"
  },
  "homepage": "https://github.com/chrisallenarmbruster/blockcraft#readme",
  "dependencies": {
    "blockcraft-explorer": "github:chrisallenarmbruster/blockcraft-explorer",
    "elliptic": "^6.5.5",
    "express": "^4.18.2",
    "nanoid": "^5.0.6",
    "ws": "^8.16.0"
  }
}

```

# Blockchain.js

```javascript
/**
 * Blockchain.js
 *
 * This file defines the Blockchain class, which is the main structure for storing and managing data in this blockchain implementation.
 *
 * The Blockchain class uses a consensus mechanism, an incentive model, and a data handler, all of which are passed in as parameters to the constructor.
 * This separates the concerns of establishing consensus to create valid blocks, incentivizing participants, and handling/storing data from each other and the main blockchain logic.
 * This is paving the way for a library of consensus mechanisms, incentive models, data handlers and storage handlers that can be mixed and matched to create custom blockchains.
 * You may create your own custom classes extended from the included base classes that implement these roles and pass them into the Blockchain class.
 *
 * By default, it uses the ProofOfWorkConsensus, StandardMiningReward, DataHandler and StorageHandler classes for these roles.
 *
 * The Blockchain class also allows for a configuration object to be passed in for additional customization.
 *
 * The consensus mechanism, incentive model, data handler and storage handler are all given a reference to the Blockchain instance they belong to.
 *
 * The Blockchain starts with a single block, the genesis block, created by the consensus mechanism.
 *
 * The consensus mechanism is also used to agree on and create new blocks, calling on the Blockchain class to add them to the chain.
 *
 * The addEntry method is used to add new data to the blockchain. It passes the data to the data handler, which handles adding it to the pending entries and determines when a new block should be added.
 *
 * After a block is added to the blockchain, the incentive model's calculateReward and distributeReward methods are called to calculate and distribute incentives to the participants for the block.
 *
 */

import { EventEmitter } from "events";
import ProofOfWorkConsensus from "./ProofOfWorkConsensus.js";
import StandardMiningReward from "./StandardMiningAward.js";
import DataHandler from "./DataHandler.js";
import StorageHandler from "./StorageHandler.js";
import { nanoid } from "nanoid";

class Blockchain extends EventEmitter {
  constructor(
    consensusMechanismInstance = new ProofOfWorkConsensus({ difficulty: 4 }),
    incentiveModelInstance = new StandardMiningReward({ fixedReward: 50 }),
    dataHandlerInstance = new DataHandler(),
    storageHandlerInstance = new StorageHandler({
      storagePath: "blockchain.txt",
    }),
    config = {}
  ) {
    super();
    this.consensusMechanism = consensusMechanismInstance;
    this.incentiveModel = incentiveModelInstance;
    this.dataHandler = dataHandlerInstance;
    this.storageHandler = storageHandlerInstance;
    this.config = config;
    this.consensusMechanism.setBlockchain(this);
    this.incentiveModel.setBlockchain(this);
    this.dataHandler.setBlockchain(this);
    this.storageHandler.setBlockchain(this);
    this.chain = [];
    this.blockCreationInProgress = false;
    this.processingPeerBlock = false;
    this.processingOwnBlock = false;
    this.processingPeerChain = false;
    this.initialize();
  }

  async initialize() {
    try {
      await this.storageHandler.loadBlockchain();
      this.emit("blockchainLoaded", this.chain);
    } catch (error) {
      const genesisBlock = await this.createGenesisBlock();
      this.chain.push(genesisBlock);
      this.emit("genesisBlockCreated", genesisBlock);
    }
  }

  setNetworkNode(networkNodeInstance) {
    this.networkNode = networkNodeInstance;
  }

  async createGenesisBlock() {
    const genesisBlock = this.consensusMechanism.createGenesisBlock(
      this.config
    );
    await this.storageHandler.saveBlock(genesisBlock);
    return genesisBlock;
  }

  async addEntry(entry) {
    try {
      if (!entry.entryId) {
        entry.entryId = nanoid();
      }
      this.dataHandler.addPendingEntry(entry);
      this.emit("entryAdded", entry);
    } catch (error) {
      console.error("Failed to add entry:", error);
    }
  }

  async validateEntry(entry) {
    return this.dataHandler.validateEntry(entry);
  }

  getEntry(entryId) {
    return this.dataHandler.getEntry(entryId);
  }

  getEntriesSentByAccount(account) {
    let allEntries = this.chain.flatMap((block) =>
      Array.isArray(block.data)
        ? block.data.map((entry) => ({
            ...entry,
            blockIndex: block.index,
          }))
        : [{ data: block.data, blockIndex: block.index }]
    );
    const pendingEntries = this.dataHandler.getPendingEntries();
    allEntries = [...pendingEntries, ...allEntries];
    const result = allEntries.filter((entry) => entry.from === account);
    return result;
  }

  getEntriesReceivedByAccount(account) {
    let allEntries = this.chain.flatMap((block) =>
      Array.isArray(block.data)
        ? block.data.map((entry) => ({
            ...entry,
            blockIndex: block.index,
          }))
        : [{ data: block.data, blockIndex: block.index }]
    );
    const pendingEntries = this.dataHandler.getPendingEntries();
    allEntries = [...pendingEntries, ...allEntries];
    const result = allEntries.filter((entry) => entry.to === account);
    return result;
  }

  async addBlock(data) {
    let block;
    if (this.blockCreationInProgress) {
      console.log("a block creation is already in progress.");
      return;
    }
    this.blockCreationInProgress = true;
    this.emit("blockCreationStarted", data);

    try {
      const previousBlock = this.getLatestBlock();
      block = await this.consensusMechanism.createBlock(
        this.chain.length,
        data,
        previousBlock.hash
      );

      if (!block || this.processingPeerBlock || this.processingPeerChain) {
        console.log("Mining was stopped or failed. No block added.");
        return;
      }

      this.processingOwnBlock = true;

      await this.storageHandler.saveBlock(block);

      this.chain.push(block);
      this.emit("blockCreated", block);

      const incentiveResult = this.incentiveModel.processIncentive(block);

      if (incentiveResult.success) {
        this.emit("incentiveProcessed", incentiveResult);
      }
    } catch (error) {
      console.error("Failed to add block:", error);
    } finally {
      this.blockCreationInProgress = false;
      this.processingOwnBlock = false;
      this.emit("blockCreationEnded", block ? block : null);
    }
  }

  async addPeerBlock(receivedBlock) {
    if (!this.processingPeerBlock) {
      this.processingPeerBlock = true;
      try {
        const blockIsValid = await this.validateBlock(receivedBlock);

        if (
          blockIsValid &&
          !this.processingOwnBlock &&
          !this.processingPeerChain
        ) {
          await this.storageHandler.saveBlock(receivedBlock);
          this.chain.push(receivedBlock);
          this.emit("peerBlockAdded", receivedBlock);
        }
      } catch (error) {
        console.error("Error adding peer block:", error);
      } finally {
        this.processingPeerBlock = false;
      }
    }
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (
        currentBlock.hash !== currentBlock.computeHash() ||
        currentBlock.previousHash !== previousBlock.hash
      ) {
        return false;
      }
    }
    return true;
  }

  async validateBlock(block) {
    const latestBlock = this.getLatestBlock();

    if (
      block.index !== latestBlock.index + 1 ||
      block.previousHash !== latestBlock.hash ||
      !this.isValidTimestamp(block, latestBlock)
    ) {
      return false;
    }

    return await this.consensusMechanism.validateBlockConsensus(block);
  }

  validateChain(externalChain = null) {
    const chainToValidate = externalChain || this.chain;
    const errors = [];
    const chainIntegrity = {
      isValid: true,
      blockCount: chainToValidate.length,
      areHashesValid: true,
      arePreviousHashesValid: true,
      areTimestampsValid: true,
      areIndexesValid: true,
      errors: [],
    };
    for (let i = 1; i < chainToValidate.length; i++) {
      const currentBlock = chainToValidate[i];
      const previousBlock = chainToValidate[i - 1];

      if (this.consensusMechanism.validateBlockHash(currentBlock) !== true) {
        chainIntegrity.errors.push({
          errorType: "hash",
          blockNumber: i,
          message: `Block ${i} has a mismatch between the hash and content.`,
        });
        chainIntegrity.areHashesValid = false;
        chainIntegrity.isValid = false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        chainIntegrity.errors.push({
          errorType: "previousHash",
          blockNumber: i,
          message: `Block ${i} has an invalid previous hash.`,
        });
        chainIntegrity.arePreviousHashesValid = false;
        chainIntegrity.isValid = false;
      }

      if (currentBlock.index !== i) {
        chainIntegrity.errors.push({
          errorType: "index",
          blockNumber: i,
          message: `Block ${i} has an index discrepancy.`,
        });
        chainIntegrity.areIndexesValid = false;
        chainIntegrity.isValid = false;
      }

      if (!this.isValidTimestamp(currentBlock, previousBlock)) {
        chainIntegrity.errors.push({
          errorType: "timestamp",
          blockNumber: i,
          message: `Block ${i} has a timestamp discrepancy.`,
        });
        chainIntegrity.areTimestampsValid = false;
        chainIntegrity.isValid = false;
      }
    }
    return chainIntegrity;
  }

  isValidTimestamp(nextBlock, previousBlock) {
    const MAX_TIMESTEP_FORWARD = 2 * 60 * 60 * 1000;
    const MAX_TIMESTEP_BACKWARD = -60 * 1000;

    return (
      previousBlock.timestamp + MAX_TIMESTEP_BACKWARD < nextBlock.timestamp
      // && nextBlock.timestamp < new Date().getTime() / 1000 + MAX_TIMESTEP_FORWARD
    );
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  getLatestBlocks(limit = 30) {
    const blocksToReturn = Math.min(limit, this.chain.length, 100);
    const startIndex = Math.max(this.chain.length - blocksToReturn, 0);
    return this.chainToSerializableObject().slice(startIndex);
  }

  getOldLatestBlocks(numOfBlocks = 30) {
    const blocksToReturn = Math.min(numOfBlocks, this.chain.length, 100);
    const startIndex = Math.max(this.chain.length - blocksToReturn, 0);
    return this.chainToSerializableObject().slice(startIndex).reverse();
  }

  getBlocksRange(startIndex = 0, limit = 10) {
    return this.chainToSerializableObject().slice(
      Math.max(startIndex, 0),
      Math.max(startIndex + limit, 0)
    );
  }

  getBlockByIndex(index) {
    const block = this.chainToSerializableObject()[index];
    return block !== undefined ? block : null;
  }

  getBlockByHash(hash) {
    const chain = this.chainToSerializableObject();
    for (let i = 0; i < chain.length; i++) {
      if (chain[i].hash === hash) {
        return chain[i];
      }
    }
    return null;
  }

  async replaceChain(newChain) {
    if (!this.processingPeerChain) {
      try {
        if (newChain.length <= this.chain.length) {
          console.log("Received chain is not longer than the current chain.");
          return;
        } else if (!this.validateChain(newChain).isValid) {
          console.log("The received chain is not valid.");
          return;
        }
        this.processingPeerChain = true;
        console.log("Replacing the current chain with the new chain.");
        this.chain = newChain;
        await this.storageHandler.saveBlockchain();
        this.emit("newPeerChainAccepted", newChain);
      } catch (error) {
        console.error("Failed to replace chain:", error);
      } finally {
        this.processingPeerChain = false;
      }
    }
  }

  chainToSerializableObject() {
    return this.chain.map((block) =>
      typeof block.toSerializableObject === "function"
        ? block.toSerializableObject()
        : block
    );
  }

  importChain(chain) {
    // import chain from storage
  }

  exportChain() {
    //export chain to storage
  }
}

export default Blockchain;

```

# blockcraft.js

```javascript
/**
 * Blockcraft: A Comprehensive Blockchain Toolkit
 *
 * Welcome to Blockcraft, a modular and extensible toolkit designed for building and exploring blockchain technologies.
 * This file serves as the main entry point to the Blockcraft package, exporting a suite of classes and utilities that
 * form the backbone of any blockchain application.
 *
 * Exports:
 * - `NetworkNode`: A core class representing a node in the blockchain network, facilitating network operations.
 * - `Blockchain`: A core class representing the blockchain itself, managing the chain and its operations.
 * - `Block`: The basic building block of the blockchain, containing data and links to other blocks.
 * - `P2PService`: Handles peer-to-peer communications within the blockchain network.
 * - `WebService`: Manages HTTP API communications for blockchain interaction.
 * - `ConsensusMechanism`: An abstract base class for blockchain consensus mechanisms.
 * - `ProofOfWorkConsensus`: An implementation of a proof-of-work consensus mechanism.
 * - `ProofOfWorkBlock`: Extends `Block` with proof-of-work functionality.
 * - `IncentiveModel`: An abstract base class for incentive models in a blockchain.
 * - `StandardMiningReward`: Implements a standard mining reward system.
 * - `DataHandler`: Manages data entries in the blockchain.
 * - `StorageHandler`: Handles the persistent storage of blockchain data.
 *
 * Installation:
 * To install Blockcraft directly from GitHub, use the following command:
 * ```
 * npm install https://github.com/chrisallenarmbruster/blockcraft.git
 * ```
 * Usage:
 * Depending on your project setup, you can use either ES6 module or CommonJS syntax to import the Blockcraft classes.
 *
 * Example with ES6 Modules:
 * ```
 * import { Blockchain, Block, NetworkNode } from 'blockcraft';
 * ```
 * Example with CommonJS:
 * ```
 * const { Blockchain, Block, NetworkNode } = require('blockcraft');
 * ```
 *
 * Dive into the fascinating world of blockchain with Blockcraft and build your decentralized applications with ease!
 */

import NetworkNode from "./NetworkNode.js";
import Blockchain from "./Blockchain.js";
import P2PService from "./P2PService.js";
import WebService from "./WebService.js";
import ProofOfWorkConsensus from "./ProofOfWorkConsensus.js";
import StandardMiningReward from "./StandardMiningAward.js";
import DataHandler from "./DataHandler.js";
import StorageHandler from "./StorageHandler.js";
import ConsensusMechanism from "./ConsensusMechanism.js";
import ProofOfWorkBlock from "./ProofOfWorkBlock.js";
import Block from "./Block.js";
import IncentiveModel from "./IncentiveModel.js";

export {
  NetworkNode,
  Blockchain,
  P2PService,
  WebService,
  ProofOfWorkConsensus,
  StandardMiningReward,
  DataHandler,
  StorageHandler,
  ConsensusMechanism,
  ProofOfWorkBlock,
  Block,
  IncentiveModel,
};

```

# ConsensusMechanism.js

```javascript
/**
 * ConsensusMechanism.js
 *
 * This file defines the ConsensusMechanism class, which serves as an abstract base class for different consensus mechanisms in a blockchain.
 *
 * This class or its subclasses are passed into the Blockchain class to handle the logic for creating the genesis block, and aligning on new valid blocks.
 *
 * The ConsensusMechanism class is constructed with a configuration object and has methods for setting the blockchain instance, creating the genesis block, creating a new block, and updating the configuration.
 *
 * The createGenesisBlock and createBlock methods are placeholders that should be overridden by subclasses to implement specific logic for creating the genesis block and new blocks.
 *
 * The setBlockchain method is used to set the blockchain instance that the consensus mechanism belongs to.
 *
 * The updateConfig method is used to update the configuration of the consensus mechanism.
 *
 */

class ConsensusMechanism {
  constructor(config) {
    this.config = config;
    this.blockchain = null;
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
  }

  createGenesisBlock(config) {
    // Placeholder for genesis block creation
    // This method can be overridden by subclasses to implement specific genesis block logic
    throw new Error("createGenesisBlock method must be implemented");
  }

  createBlock(index, data, previousHash) {
    // Placeholder for block creation
    // This method can be overridden by subclasses to implement specific block creation logic
    throw new Error("createBlock method must be implemented");
  }

  validateBlockHash(block) {
    // Placeholder for block hash validation
    // This method can be overridden by subclasses to implement specific block hash validation logic
    throw new Error("validateBlockHash method must be implemented");
  }

  async validateBlockConsensus(block) {
    // Placeholder for block consensus validation
    // This method can be overridden by subclasses to implement specific block consensus validation logic
    throw new Error("validateBlockConsensus method must be implemented");
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }
}

export default ConsensusMechanism;

```

# Block.js

```javascript
/**
 * Block.js
 *
 * This file defines the Block class, which represents a block in a blockchain.
 *
 * Each block has an index, data, previousHash, timestamp, and hash. The index is the position of the block in the blockchain,
 * the data is the information stored in the block, the previousHash is the hash of the previous block in the blockchain,
 * the timestamp is the time when the block was created, and the hash is a SHA-256 hash of the block's index, previousHash,
 * timestamp, and data.
 *
 * The Block class has a computeHash method, which computes the block's hash using the SHA-256 algorithm.
 *
 * This is a base class that can be extended to implement specific block logic for different types of blockchains.
 *
 */

import crypto from "crypto";

class Block {
  constructor({
    index,
    data,
    previousHash,
    timestamp = Date.now(),
    blockCreator,
    ownerAddress,
  }) {
    this.index = index;
    this.data = data;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.blockCreator = blockCreator;
    this.ownerAddress = ownerAddress;
    this.hash = this.computeHash();
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
  }

  toSerializableObject() {
    return {
      index: this.index,
      data: this.data,
      previousHash: this.previousHash,
      timestamp: this.timestamp,
      blockCreator: this.blockCreator,
      ownerAddress: this.ownerAddress,
      hash: this.hash,
    };
  }

  computeHash() {
    return crypto
      .createHash("SHA256")
      .update(
        `${this.index}${this.previousHash}${this.timestamp}${
          this.blockCreator
        }${this.ownerAddress}${JSON.stringify(this.data)}`
      )
      .digest("hex");
  }
}

export default Block;

```

# IncentiveModel.js

```javascript
/**
 * IncentiveModel.js
 *
 * This file defines the IncentiveModel class, which serves as an abstract base class for different incentive models in a blockchain.
 *
 * This class or its subclasses are passed into the Blockchain class to define the incentive model for the blockchain.
 *
 * The IncentiveModel class is constructed with a configuration object and has methods for setting the blockchain instance, calculating the reward for a block, distributing the reward, and updating the configuration.
 *
 * The calculateReward and distributeReward methods are placeholders that should be overridden by subclasses to implement specific logic for calculating and distributing the reward for a block.
 *
 * The setBlockchain method is used to set the blockchain instance that the incentive model belongs to.
 *
 * The updateConfig method is used to update the configuration of the incentive model.
 *
 */

class IncentiveModel {
  constructor(config) {
    this.config = config;
    this.blockchain = null;
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
  }

  calculateIncentive(block) {
    // Placeholder for reward calculation logic
    // This method can be overridden by subclasses to implement specific reward logic
    throw new Error("calculateIncentive method must be implemented");
  }

  distributeIncentive(block, incentive) {
    // Placeholder for reward distribution logic
    // This method can be overridden by subclasses to implement specific distribution logic
    throw new Error("distributeIncentive method must be implemented");
  }

  processIncentive(block) {
    // Placeholder for processing incentive logic
    // This method can be overridden by subclasses to implement specific processing logic
    throw new Error("processIncentive method must be implemented");
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }
}

export default IncentiveModel;

```

# NetworkNode.js

```javascript
/**
 * NetworkNode.js
 *
 * This file defines the NetworkNode class, a central component of the Blockcraft blockchain network.
 * The NetworkNode class integrates the blockchain logic with network functionalities, enabling node-to-node
 * communication and providing an HTTP API for external interaction.
 *
 * The class accepts instances of the Blockchain, P2PService, and WebService as parameters, facilitating
 * a modular and flexible architecture. Each of these components is responsible for a specific aspect of
 * the blockchain network operation, allowing for easy updates and maintenance.
 *
 * Usage:
 * const networkNode = new NetworkNode(blockchainInstance, p2pServiceInstance, webServiceInstance, config);
 *
 */

class NetworkNode {
  constructor(
    blockchainInstance,
    p2pServiceInstance,
    webServiceInstance,
    config = {}
  ) {
    this.blockchain = blockchainInstance;
    this.p2pService = p2pServiceInstance;
    this.webService = webServiceInstance;
    this.config = config;

    this.blockchain?.setNetworkNode(this);
    this.p2pService?.setNetworkNode(this);
    this.webService?.setNetworkNode(this);

    if (this.blockchain && this.p2pService) {
      this.blockchain.on("entryAdded", (entry) => {
        this.p2pService.broadcastEntry(entry);
      });

      this.blockchain.on("blockCreated", (block) => {
        this.p2pService.broadcastBlock(block);
      });

      this.blockchain.on("peerBlockAdded", (block) => {
        console.log("Peer block added:", block);
      });
    }
  }

  config(newConfig) {
    this.config = newConfig;
  }
}

export default NetworkNode;

```

# example.js

```javascript
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

```

# P2PService.js

```javascript
/**
 * P2PService.js
 *
 * The P2PService class in the Blockcraft blockchain framework handles peer-to-peer (P2P) communications within
 * the blockchain network. It is responsible for node discovery, data synchronization, and maintaining the
 * decentralized nature of the blockchain.
 *
 * This class ensures that all nodes in the network stay updated with the latest blockchain state and facilitates
 * the propagation of new transactions and blocks. The P2PService class can be tailored to use different P2P
 * communication protocols and strategies, offering flexibility for various network topologies.
 *
 * Usage Example:
 * const p2pService = new P2PService({port: 6001, autoStart: true, id: "node1", seedPeers: ["ws://localhost:6002"]});
 * p2pService.setNetworkNode(networkNodeInstance);
 *
 */
import WebSocket, { WebSocketServer } from "ws";
import { nanoid } from "nanoid";

class P2PService {
  constructor(config = {}) {
    this.config = config;
    this.peers = new Map();
    this.websocketServer = null;
    this.messageHistory = new Set();
    this.messageTimeout = 30000;
    this.networkNode = null;

    if (this.config.autoStart) {
      this.initWebsocketServer();
    }

    if (Array.isArray(this.config.seedPeers)) {
      this.connectToSeedPeers(this.config.seedPeers);
    }
  }

  setNetworkNode(networkNodeInstance) {
    this.networkNode = networkNodeInstance;
  }

  initWebsocketServer(port = this.config.port) {
    this.websocketServer = new WebSocketServer({ port });
    this.websocketServer.on("connection", (ws, req) => {
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const url = req.url;
      console.log(`New connection from ${ip} at ${url}`);
      ws.on("message", (message) => this.handleMessage(ws, message));
    });
    console.log(`P2PService WebSocket server started on port ${port}`);
  }

  handleMessage(ws, message) {
    const msg = JSON.parse(message);
    if (msg.type === "handshake") {
      this.handleHandshake(ws, msg);
    } else {
      this.handleNonHandshakeMessage(msg);
    }
  }

  handleHandshake(ws, msg) {
    if (!this.peers.has(msg.senderConfig?.id)) {
      console.log("Adding to my connected peers list:", msg.senderConfig?.id);
      this.sendHandshake(ws);
    }
    this.connectPeer(ws, msg.senderConfig);
  }

  handleNonHandshakeMessage(msg) {
    if (typeof msg === "string") {
      try {
        msg = JSON.parse(msg);
      } catch (error) {
        console.error("Invalid JSON:", msg);
        return;
      }
    }
    if (!this.messageHistory.has(msg.messageId)) {
      console.log(`\nReceived message: ${JSON.stringify(msg)}\n`);
      this.addToMessageHistory(msg.messageId);
      switch (msg.type) {
        case "newEntry":
          // TODO: put method below on the blockchain class
          this.networkNode.blockchain.dataHandler.addPendingEntry(msg.data);
          console.log("Received new entry:", msg.data);
          this.broadcast(msg);
          break;
        case "requestFullChain":
          this.sendFullChain(msg.senderConfig.id);
          break;
        case "fullChain":
          this.handleFullChain(msg);
          break;
        case "newBlock":
          const receivedBlock = msg.data;

          (async () => {
            try {
              const latestBlock = this.networkNode.blockchain.getLatestBlock();
              if (receivedBlock.index > latestBlock.index + 1) {
                console.log("Longer chain detected.");
                this.requestFullChain(msg.senderConfig.id);
                this.broadcast(msg);
              } else {
                const isValidBlock =
                  await this.networkNode.blockchain.validateBlock(
                    receivedBlock
                  );
                if (isValidBlock) {
                  console.log(`Valid new block received:`, receivedBlock);
                  this.networkNode.blockchain.addPeerBlock(receivedBlock);
                  this.broadcast(msg);
                } else {
                  console.log(`Invalid block received:`, receivedBlock);
                  this.broadcast(msg);
                }
              }
            } catch (error) {
              console.error("Error handling new block:", error);
            }
          })();

          break;

        default:
          this.broadcast(msg);
      }
    }
  }

  sendHandshake(ws) {
    const handshakeMessage = {
      type: "handshake",
      senderConfig: {
        id: this.networkNode.config?.id,
        label: this.networkNode.config?.label,
        ip: this.networkNode.config?.ip,
        url: this.networkNode.config?.url,
        p2pPort: this.config?.port,
        webServicePort: this.networkNode?.webService?.config?.port,
      },
      messageId: nanoid(),
    };
    ws.send(JSON.stringify(handshakeMessage));
  }

  connectPeer(ws, senderConfig) {
    if (!this.peers.has(senderConfig.id)) {
      this.peers.set(senderConfig.id, { ws: ws, config: senderConfig });
      console.log(
        `Connected to a new peer with ID ${senderConfig.id}. Total peers: ${this.peers.size}`
      );
    } else {
      this.peers.set(senderConfig.id, { ws: ws, config: senderConfig });
    }
    ws.on("close", () => {
      console.log(`Peer ${senderConfig.id} disconnected.`);
      this.peers.delete(senderConfig.id);
    });
  }

  connectToSeedPeers(seedPeers) {
    seedPeers.forEach((peerAddress) => {
      try {
        this.connectToPeer(peerAddress);
        console.log("Seeded peer connected:", peerAddress);
      } catch (error) {
        console.error(
          `Failed to connect to seed peer at ${peerAddress}:`,
          error
        );
      }
    });
  }

  connectToPeer(peerAddress) {
    const ws = new WebSocket(peerAddress);
    ws.on("open", () => {
      this.sendHandshake(ws);
    }).on("error", (error) => {
      console.error(`Connection error with peer ${peerAddress}:`, error);
    });
    ws.on("message", (message) => this.handleMessage(ws, message));
  }

  broadcastEntry(entry) {
    const message = JSON.stringify({
      type: "newEntry",
      data: entry,
      senderConfig: { id: this.networkNode.config.id },
      messageId: nanoid(),
    });
    this.broadcast(message);
  }

  broadcastBlock(block) {
    const message = JSON.stringify({
      type: "newBlock",
      data: block.toSerializableObject(),
      senderConfig: { id: this.networkNode.config.id },
      messageId: nanoid(),
    });
    this.broadcast(message);
  }

  broadcast(msg) {
    this.peers.forEach((peer, id) => {
      if (id !== msg.senderConfig?.id) {
        peer.ws.send(JSON.stringify(msg));
      }
    });
  }

  addToMessageHistory(messageId) {
    this.messageHistory.add(messageId);
    setTimeout(() => {
      this.messageHistory.delete(messageId);
      console.log(`\nMessage ID ${messageId} removed from history.\n`);
    }, this.messageTimeout);
  }

  requestFullChain(senderId) {
    const request = {
      type: "requestFullChain",
      senderConfig: { id: this.networkNode.config.id },
      messageId: nanoid(),
    };
    if (this.peers.has(senderId)) {
      const peer = this.peers.get(senderId);
      peer.ws.send(JSON.stringify(request));
    } else {
      console.log(`Peer with ID ${senderId} not found.`);
    }
  }

  sendFullChain(receiverId) {
    if (this.peers.has(receiverId)) {
      const fullChain = {
        type: "fullChain",
        data: this.networkNode.blockchain.chainToSerializableObject(),
        senderConfig: { id: this.networkNode.config.id },
        messageId: nanoid(),
      };
      const peer = this.peers.get(receiverId);
      peer.ws.send(JSON.stringify(fullChain));
    } else {
      console.log(`Peer with ID ${receiverId} not found.`);
    }
  }

  handleFullChain(msg) {
    const receivedChain = msg.data;
    if (
      this.networkNode.blockchain.validateChain(receivedChain).isValid &&
      receivedChain.length > this.networkNode.blockchain.chain.length
    ) {
      console.log(
        "Received chain is valid and longer. Replacing current chain with received chain."
      );
      this.networkNode.blockchain.replaceChain(receivedChain);
    } else {
      console.log(
        "Received chain is invalid or not longer than the current chain."
      );
    }
  }
}

export default P2PService;

```

# ProofOfWorkBlock.js

```javascript
/**
 * ProofOfWorkBlock.js
 *
 * This file defines the ProofOfWorkBlock class, which extends the Block class and adds proof-of-work functionality.
 *
 * This class is used by the ProofOfWorkConsensus class to create blocks with proof-of-work functionality.
 *
 * Each ProofOfWorkBlock has an index, data, previousHash, timestamp, difficulty, nonce, and hash. The nonce is a number that is incremented in the process of mining the block.
 *
 * The ProofOfWorkBlock class overrides the computeHash method of the Block class to include the nonce in the hash computation.
 *
 * The mineBlock method is used to mine the block by incrementally increasing the nonce and recomputing the hash until a hash that meets the difficulty requirement is found. The difficulty requirement is that the first 'difficulty' number of characters of the hash must be zeros.
 *
 */

import crypto from "crypto";
import Block from "./Block.js";
class ProofOfWorkBlock extends Block {
  constructor({
    index,
    data,
    previousHash,
    timestamp,
    blockCreator,
    ownerAddress,
    nonce = 0,
    difficulty = 5,
  }) {
    super({ index, data, previousHash, timestamp, blockCreator, ownerAddress });
    this.nonce = nonce;
    this.difficulty = difficulty;
    this.hash = this.computeHash();
    this.stopMining = false;
  }

  toSerializableObject() {
    const baseObject = super.toSerializableObject();
    return {
      ...baseObject,
      nonce: this.nonce,
      difficulty: this.difficulty,
    };
  }

  computeHash() {
    return crypto
      .createHash("SHA256")
      .update(
        `${this.index}${this.previousHash}${this.timestamp}${
          this.blockCreator
        }${this.ownerAddress}${JSON.stringify(this.data)}${this.nonce}`
      )
      .digest("hex");
  }

  async mineBlock() {
    while (
      !this.stopMining &&
      this.hash.substring(0, this.difficulty) !==
        Array(this.difficulty + 1).join("0")
    ) {
      this.nonce++;
      this.hash = this.computeHash();
      if (this.nonce % 1000 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }
    return !this.stopMining;
  }
}

export default ProofOfWorkBlock;

```

# ProofOfWorkConsensus.js

```javascript
/**
 * ProofOfWorkConsensus.js
 *
 * This file defines the ProofOfWorkConsensus class, which extends the ConsensusMechanism class and implements a proof-of-work consensus mechanism.
 *
 * This class is passed into the Blockchain class to define a consensus mechanism for the blockchain.
 *
 * The ProofOfWorkConsensus class is constructed with a configuration object and has a difficulty level, which determines how hard it is to mine a block.
 *
 * The createGenesisBlock method is used to create the genesis block, which is the first block in the blockchain. It creates a new ProofOfWorkBlock with the index of 0, the data of "Genesis Block", the previousHash of "0", and the difficulty level of this consensus mechanism.
 *
 * The createBlock method is used to create a new block with a given index, data, and previousHash. It creates a new ProofOfWorkBlock with the given parameters and the difficulty level of this consensus mechanism, mines the block, and then returns it.
 *
 * @author Your Name
 * @version 1.0
 * @since 2022-01-01
 */

import ConsensusMechanism from "./ConsensusMechanism.js";
import ProofOfWorkBlock from "./ProofOfWorkBlock.js";

class ProofOfWorkConsensus extends ConsensusMechanism {
  constructor(config) {
    super(config);
    this.difficulty = config.difficulty || 4;
    this.currentMiningBlock = null;
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
    this.blockchain.on("peerBlockAdded", () => {
      console.log("Stopping mining due to new peer block acceptance.");
      if (this.currentMiningBlock) {
        this.currentMiningBlock.stopMining = true;
      }
    });
    this.blockchain.on("newPeerChainAccepted", () => {
      console.log("Stopping mining due to new peer chain acceptance.");
      if (this.currentMiningBlock) {
        this.currentMiningBlock.stopMining = true;
      }
    });
  }

  async createBlock(index, data, previousHash) {
    console.log(
      "Creating new block...",
      index,
      data,
      previousHash,
      this.blockchain.networkNode.config
    );
    const newBlock = new ProofOfWorkBlock({
      index,
      data,
      previousHash,
      blockCreator: this.blockchain.networkNode.config.id,
      ownerAddress: this.blockchain.networkNode.config.ownerAddress,
      difficulty: this.difficulty,
    });
    newBlock.setBlockchain(this.blockchain);

    this.currentMiningBlock = newBlock;

    const minedSuccessfully = await newBlock.mineBlock();

    this.currentMiningBlock = null;

    if (!minedSuccessfully) {
      return null;
    }

    return newBlock;
  }

  createGenesisBlock(config) {
    return new ProofOfWorkBlock({
      index: 0,
      data: config.genesisEntries,
      previousHash: "0",
      timestamp: config.genesisTimestamp,
      blockCreator: "Genesis Block",
      ownerAddress: "Genesis Block",
      difficulty: this.difficulty,
    });
  }

  validateBlockHash(block) {
    const hash = new ProofOfWorkBlock(block).hash;
    return hash === block.hash;
  }

  async validateBlockConsensus(block) {
    return this.validateBlockHash(block);
  }
}

export default ProofOfWorkConsensus;

```

# README.md

```markdown
# Blockcraft 🚀

Welcome to the Blockcraft, my pioneering blockchain toolkit crafted from scratch to empower developers, innovators, and students 🎓. This toolkit is designed for the creation of robust, efficient, and scalable decentralized applications (dApps) that leverage the full potential of blockchain technology 💡. By starting from the ground up, Blockcraft is tailored to meet the high demands of modern blockchain development, offering an extensive suite of tools and components essential for building cutting-edge blockchain solutions 🔧.

## Key Features

🚀 **From Scratch to Advanced**: Developed from the ground up with a focus on innovation and quality, Blockcraft is not just another blockchain toolkit. It's a comprehensive solution forged through careful design and development to ensure the highest standards of performance and reliability.

🔧 **Modular and Flexible**: Emphasizing flexibility, Blockcraft features a modular design that allows developers to integrate and customize components seamlessly, fitting perfectly into various blockchain application scenarios.

🔒 **Top-Notch Security**: With security at its core, Blockcraft incorporates advanced security protocols to ensure transaction and data integrity, setting a new benchmark for trust and reliability in the blockchain space.

🌐 **Support for Decentralized Networks**: Designed to foster decentralized applications, Blockcraft comes with full support for creating and managing peer-to-peer networks, enabling direct and secure transactions and interactions.

🛠 **All-In-One Toolkit**: From consensus algorithms to peer-to-peer services, Blockcraft provides a full array of tools needed to design, deploy, and manage innovative blockchain applications efficiently.

## Getting Started 🛠️

Dive into the world of blockchain development with Blockcraft by following these setup instructions:

1. **Installation**

```bash
npm install github:chrisallenarmbruster/blockcraft
```

## Usage 🔍

Blockcraft is designed to empower developers with the flexibility to build customizable and efficient blockchain systems. At the core of Blockcraft's design is the separation of concerns, allowing developers to mix and match different components for consensus mechanisms, incentive models, data handling, and storage. This section will guide you through using these features to set up a comprehensive blockchain solution.

### The Blockchain Class 💾

The `Blockchain` class is the heart ❤️ of your blockchain application, orchestrating the interaction between various components. It is initialized with several key parameters that define its behavior:

- **Consensus Mechanism** 🤝: Determines how consensus is achieved on the blockchain. Blockcraft allows for the integration of various consensus mechanisms, enabling you to choose or develop one that best fits your application's requirements.

- **Incentive Model** 🏅: Defines the strategy for rewarding network participants. This modular approach lets you implement a custom incentive model that motivates participation in your blockchain network.

- **Data Handler** 📊: Manages the processing and storage of data within blocks. By customizing the data handler, you can tailor how data is treated, validated, and stored on your blockchain.

- **Storage Handler** 🗃️: Controls how blockchain data is persisted. Whether you're using file systems, databases, or other storage solutions, the storage handler ensures your blockchain data is securely saved and retrievable.

- **Configuration Object** ⚙️: A flexible configuration object allows you to fine-tune the settings and parameters of your blockchain, such as block size limits, transaction fees, and network protocols.

```javascript
const blockchain = new Blockchain({
  consensusMechanism: new ProofOfWorkConsensus(),
  incentiveModel: new StandardMiningReward(),
  dataHandler: new CustomDataHandler(),
  storageHandler: new FileStorageHandler(),
  config: { blockchainName: "my-blockcraft-blockchain" },
});
```

### The NetworkNode Class 🌍

For blockchain networks to function, nodes must communicate and synchronize with each other 🤝. The `NetworkNode` class encapsulates the network layer, integrating:

- **P2P Service** 🔄: Manages peer-to-peer communication between nodes, ensuring data is shared efficiently across the network without relying on a central server.
- **Web Service** 🌐: Provides an HTTP interface for your blockchain, allowing external applications and users to interact with the blockchain via web requests.

The `NetworkNode` class takes an instance of your `Blockchain` 💼, along with instances of the P2P service and Web service, fully encapsulating the networking functionality and allowing your blockchain to operate within a distributed network 🚀.

```javascript
const networkNode = new NetworkNode(
  blockchain,
  new P2PService(),
  new WebService()
);
```

### Example Included 📝

To help you get started, a simple example (see [example.js](./example.js)) is included that demonstrates how to set up a basic blockchain and dApp nodes to host it using Blockcraft. This example showcases the creation of a blockchain with a Proof-of-Work consensus mechanism, a standard mining reward incentive model, and file-based data and storage handlers. The example also demonstrates how to set up a network node to host the blockchain, allowing it to communicate with other nodes in a decentralized network.

### Flexibility and Customization 🔧

The separation of concerns within Blockcraft not only ensures cleaner code and easier maintenance but also grants unparalleled flexibility 🤸‍♂️. Developers can swap out consensus mechanisms 🔁, experiment with different incentive models, customize data handling logic, and choose their preferred method of data storage 🗃 without altering the core blockchain logic. The same is true for creating dApp nodes for hosting blockchains, allowing peer-to-peer services 🌐 and web interfaces to be switched. This design philosophy encourages innovation and experimentation 🚀, enabling the creation of a blockchain that perfectly fits each developer's unique requirements.

## Final Thoughts 🚀

Blockcraft's modular architecture is designed with the developer in mind 🧠, offering the building blocks 🏗️ to create, customize, and scale blockchain applications. By understanding and utilizing the core components of Blockcraft—`Blockchain` and `NetworkNode` classes, along with their associated services and handlers ✨, Blockcraft equips developers to construct blockchain solutions that are tailored 🛠️ to each application's needs.

```

# StandardMiningAward.js

```javascript
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

```

# StorageHandler.js

```javascript
/**
 * StorageHandler.js
 *
 * This file defines the StorageHandler class, which is responsible for managing the persistent storage of the blockchain data.
 *
 * The StorageHandler class is constructed with a configuration object and maintains a reference to the blockchain instance it is associated with.
 *
 * The saveBlock method is used to save a block to storage.
 *
 * The saveBlockchain method is used to save the entire blockchain to storage.
 *
 * The loadBlockchain method is used to load the entire blockchain from storage.
 *
 * The clearStorage method is used to clear the storage.
 *
 * The exportChainToJSON method is used to export the entire blockchain to a JSON string.
 *
 * These methods should be overridden by subclasses to implement specific storage mechanisms.
 *
 */
import fs from "fs/promises";
import path from "path";

class StorageHandler {
  constructor(config) {
    this.config = config;
    this.blockchain = null;
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }

  async saveBlock(block) {
    try {
      let blockData;
      if (block.toSerializableObject) {
        blockData = JSON.stringify(block.toSerializableObject()) + ",\n";
      } else {
        blockData = JSON.stringify(block) + ",\n";
      }
      await fs.appendFile(this.config.storagePath, blockData);
    } catch (error) {
      console.error("Failed to save block:", error);
      throw error;
    }
  }

  async clearStorage() {
    try {
      await fs.writeFile(this.config.storagePath, "");
    } catch (error) {
      console.error("Failed to clear storage:", error);
      throw error;
    }
  }

  async saveBlockchain() {
    try {
      const blockchainData = this.blockchain.chain
        .map((block) => JSON.stringify(block) + ",\n")
        .join("");
      await fs.writeFile(this.config.storagePath, blockchainData);
    } catch (error) {
      console.error("Failed to save blockchain:", error);
      throw error;
    }
  }

  async loadBlockchain() {
    try {
      const fileContent = await fs.readFile(this.config.storagePath, "utf8");
      const blocks = fileContent
        .split(",\n")
        .filter((line) => line)
        .map((line) => JSON.parse(line));

      this.blockchain.chain = blocks;
    } catch (error) {
      // console.error("Failed to load blockchain:", error);
      throw error;
    }
  }

  async exportChainToJSON() {
    try {
      const jsonFilePath =
        this.config.storagePath.replace(/\.[^/.]+$/, "") + ".json";

      const blockchainData = JSON.stringify(this.blockchain.chain, null, 2);

      await fs.writeFile(jsonFilePath, blockchainData);
      console.log("Blockchain exported to JSON:", jsonFilePath);
    } catch (error) {
      console.error("Failed to export blockchain:", error);
      throw error;
    }
  }
}

export default StorageHandler;

```

# WebService.js

```javascript
/**
 * WebService.js
 *
 * The WebService class in the Blockcraft blockchain network is responsible for handling HTTP API communications.
 * This class serves as the interface for external applications to interact with the blockchain, facilitating
 * operations like querying blockchains.
 *
 * The class integrates with the NetworkNode to provide seamless interaction between the blockchain and external
 * HTTP requests. It is designed to be flexible and adaptable to various API needs and can be extended or modified
 * for specific use cases.
 *
 * Usage Example:
 * const webService = new WebService({ port: 8000 });
 * webService.setNetworkNode(networkNodeInstance);
 *
 * Routes:
 * GET /blockchain - Returns the entire blockchain.
 * GET /chain/integrity - Validates the blockchain and returns the result.
 * GET /chain/info - Returns information about the blockchain.
 * GET /blocks/:identifier - Returns the block having the specified index or hash.
 * GET /entries/:entryId - Returns the entry with the specified ID.
 * GET /entries - Returns all entries in the blockchain.
 * POST /entries - Queues a new entry to be added to the blockchain. The entry data is provided in the request body.
 
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
class WebService {
  constructor(config = {}) {
    this.config = config;
    this.networkNode = null;
    this.app = express();
    this.app.use(express.json());

    this.initializeRoutes();
    this.serveFrontend();
    this.start();
  }

  setNetworkNode(networkNode) {
    this.networkNode = networkNode;
  }

  setConfig(config) {
    this.config = config;
  }

  initializeRoutes() {
    const router = express.Router();

    router.get("/blockchain", (req, res) => {
      if (this.networkNode && this.networkNode.blockchain) {
        res.json(this.networkNode.blockchain.chainToSerializableObject());
      } else {
        res.status(503).send("Blockchain service is unavailable");
      }
    });

    router.get("/chain/info", async (req, res) => {
      try {
        const chain = this.networkNode.blockchain.chain;

        const chainInfo = {
          blockchainName: this.networkNode.blockchain.config.blockchainName,
          bornOn: chain[0].timestamp,
          currentHeight: chain.length,
        };

        if (chain[chain.length - 1].hasOwnProperty("difficulty")) {
          chainInfo.difficulty = chain[chain.length - 1].difficulty;
        }

        if (chain[chain.length - 1].hasOwnProperty("nonce")) {
          const nonce = chain[chain.length - 1].nonce;
          chainInfo.hashRate =
            nonce /
            ((chain[chain.length - 1].timestamp -
              chain[chain.length - 2].timestamp) /
              1000);
        }

        if (typeof this.networkNode.blockchain.getTotalSupply === "function") {
          const totalSupply = this.networkNode.blockchain.getTotalSupply();
          if (totalSupply !== undefined) {
            chainInfo.totalSupply = totalSupply;
          }
        }

        res.json(chainInfo);
      } catch (error) {
        console.error("Failed to get chain info:", error);
        res.status(500).send("Error fetching chain information");
      }
    });

    router.get("/chain/integrity", (req, res) => {
      const validationResult = this.networkNode.blockchain.validateChain();
      res.json(validationResult);
    });

    router.get("/blocks/:identifier", (req, res) => {
      const { identifier } = req.params;

      if (/^[0-9a-fA-F]{64}$/.test(identifier)) {
        const block = this.networkNode.blockchain.getBlockByHash(identifier);
        if (!block) {
          return res.status(404).send("Block not found");
        }
        res.json(block);
      } else {
        const index = parseInt(identifier);
        if (isNaN(index)) {
          return res
            .status(400)
            .send(
              "Invalid identifier - must be a numeric index or a 64-character hash"
            );
        }

        const block = this.networkNode.blockchain.getBlockByIndex(index);
        if (!block) {
          return res.status(404).send("Block not found");
        }
        res.json(block);
      }
    });

    router.get("/blocks", (req, res) => {
      try {
        const scope = req.query.scope || "all";
        const sort = req.query.sort || "asc";
        const page = parseInt(req.query.page || 1);
        const pageLimit = parseInt(req.query.pageLimit || 30);
        const recordLimit = parseInt(req.query.recordLimit || 100); // ignored by scope "all"
        const startIndex = parseInt(req.query.startIndex || 0); // ignored by scopes "all" & "latest"
        let allBlocks;

        if (scope === "latest") {
          allBlocks = this.networkNode.blockchain.getLatestBlocks(
            Math.min(Number(recordLimit), 100)
          );
        } else if (scope === "range") {
          allBlocks = this.networkNode.blockchain.getBlocksRange(
            startIndex,
            recordLimit
          );
        } else {
          allBlocks = this.networkNode.blockchain.chainToSerializableObject();
        }

        if (sort === "desc") {
          allBlocks.reverse();
        }

        const total = allBlocks.length;
        const pages = Math.ceil(total / pageLimit);
        const pageStartIndex = (page - 1) * pageLimit;
        const pageEndIndex = page * pageLimit;
        const blocks = allBlocks.slice(pageStartIndex, pageEndIndex);

        const meta = {
          scope,
          sort,
          total,
          pages,
          currentPage: page,
          pageSize: pageLimit,
        };
        res.json({ blocks, meta });
      } catch (error) {
        res.status(500).send("Failed to retrieve blocks: " + error.message);
      }
    });

    router.get("/entries/:entryId", (req, res) => {
      const entryId = req.params.entryId;
      const entry = this.networkNode.blockchain.getEntry(entryId);
      if (!entry) {
        return res.status(404).send("Entry not found");
      }
      const isValid = this.networkNode.blockchain.validateEntry(entry);

      res.json({ ...entry, isValid });
    });

    router.get("/entries", async (req, res) => {
      try {
        const page = parseInt(req.query.page || 1);
        const pageLimit = parseInt(req.query.pageLimit || 30);
        const sort = req.query.sort || "asc";
        const scope = req.query.scope || "all";
        const publicKey = req.query.publicKey;
        const blockchain = this.networkNode.blockchain;
        let allEntries = [];

        if (scope === "latest") {
          const latestBlocks = blockchain.chain.slice(-10);
          allEntries = latestBlocks.flatMap((block) =>
            Array.isArray(block.data)
              ? block.data.map((entry) => ({
                  ...entry,
                  blockIndex: block.index,
                }))
              : [{ data: block.data, blockIndex: block.index }]
          );
        } else if (scope === "pending") {
          allEntries = blockchain.dataHandler.getPendingEntries();
          allEntries = allEntries.map((entry) => ({
            ...entry,
            blockIndex: "pending",
          }));
        } else {
          allEntries = blockchain.chain.flatMap((block) =>
            Array.isArray(block.data)
              ? block.data.map((entry) => ({
                  ...entry,
                  blockIndex: block.index,
                }))
              : [{ data: block.data, blockIndex: block.index }]
          );

          const pendingEntries = blockchain.dataHandler.getPendingEntries();
          allEntries = allEntries.concat(
            pendingEntries.map((entry) => ({ ...entry, blockIndex: "pending" }))
          );
        }

        if (publicKey) {
          allEntries = allEntries.filter(
            (entry) => entry.from === publicKey || entry.to === publicKey
          );
        }

        let netAmount = 0;
        if (publicKey) {
          allEntries.forEach((entry) => {
            if (entry.to === publicKey) {
              netAmount += entry.amount;
            }
            if (entry.from === publicKey) {
              netAmount -= entry.amount;
            }
          });
        }

        if (sort === "desc") {
          allEntries.reverse();
        }

        const total = allEntries.length;
        const pages = Math.ceil(total / pageLimit);
        const pageStartIndex = (page - 1) * pageLimit;
        const pageEndIndex = page * pageLimit;
        const entries = allEntries.slice(pageStartIndex, pageEndIndex);
        const meta = {
          scope,
          sort,
          total,
          pages,
          currentPage: page,
          pageSize: pageLimit,
          queriedPublicKey: publicKey || "N/A",
          netAmount: publicKey ? netAmount : undefined,
        };
        res.json({ entries, meta });
      } catch (error) {
        res.status(500).send("Failed to retrieve entries: " + error.message);
      }
    });

    router.post("/entries", (req, res) => {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).send("No data provided");
      }
      try {
        this.networkNode.blockchain.addEntry(req.body);
        res.status(201).send("Entry added successfully");
      } catch (error) {
        res.status(500).send("Error adding entry: " + error.message);
        res.status(500).send("Failed to retrieve entries: " + error.message);
      }
    });

    router.get("/nodes", (req, res) => {
      if (this.networkNode && this.networkNode.p2pService) {
        console.log("Peers:", [...this.networkNode.p2pService.peers.values()]);

        const thisNode = {
          id: this.networkNode.config?.id,
          label: this.networkNode.config?.label,
          ip: this.networkNode.config?.ip,
          url: this.networkNode.config?.url,
          p2pPort: this.networkNode.p2pService.config?.port,
          webServicePort: this.networkNode.webService?.config?.port,
        };

        res.json([
          thisNode,
          ...Array.from(this.networkNode.p2pService.peers.values()).map(
            (value) => value.config
          ),
        ]);
      } else {
        res.status(500).send("P2P service is unavailable");
      }
    });

    this.app.use("/api", router);
  }

  serveFrontend() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const frontendPath = path.join(
      __dirname,
      "node_modules/blockcraft-explorer/dist"
    );
    this.app.use(express.static(frontendPath));

    this.app.get("*", (req, res) => {
      res.sendFile(path.join(frontendPath, "index.html"));
    });
  }

  start() {
    const port = this.config.port || 3000;
    this.app.listen(port, () => {
      console.log(`\nWebService listening on port ${port}`);
    });
  }
}

export default WebService;

```

# DataHandler.js

```javascript
/**
 * DataHandler.js
 *
 * This file defines the DataHandler class, which is responsible for managing the data entries in our blockchain implementation.
 *
 * An entry is a piece of data that is added to the blockchain. It can be anything from a simple string to a complex transaction object, medical record or vote.
 *
 * This class or its subclasses are passed into the Blockchain class to handle the data entries.
 *
 * The DataHandler class is constructed with a configuration object and maintains a list of pending entries that are waiting to be added to the blockchain.
 *
 * The addPendingEntry method is used to add a new entry to the pending entries. It validates the entry, transforms it, and adds it to the list. If the conditions for adding a new block are met, it triggers the creation of a new block with the pending entries.
 *
 * The getPendingEntries and clearPendingEntries methods are used to retrieve and clear the pending entries, respectively.
 *
 * The validatePendingEntry method is used to validate a pending entry. It should be overridden by subclasses to implement specific validation logic.
 *
 * Treat this as a base class for the DataHandler. It should be extended by subclasses to implement specific data handling logic.
 *
 */
import { nanoid } from "nanoid";
import crypto from "crypto";
import elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");
class DataHandler {
  constructor(config) {
    this.config = config;
    this.entryPool = new Map();
    this.blockchain = null;
  }

  setBlockchain(blockchainInstance) {
    this.blockchain = blockchainInstance;
    this.blockchain.on("blockCreationEnded", (block) => {
      if (block) {
        this.removeProcessedTransactions(block);
      }
      this.checkAndInitiateBlockCreation();
    });
    this.blockchain.on("peerBlockAdded", (block) => {
      if (block) {
        this.removeProcessedTransactions(block);
      }
      this.checkAndInitiateBlockCreation();
    });
    this.blockchain.on("newPeerChainAccepted", (newChain) => {
      this.updateEntryPoolWithNewChain(newChain);
    });
  }

  updateConfig(newConfig) {
    this.config = newConfig;
  }

  addPendingEntry(entry) {
    if (!entry.entryId) {
      entry.entryId = nanoid();
    }

    if (!this.entryPool.has(entry.entryId)) {
      if (this.validatePendingEntry(entry)) {
        this.entryPool.set(entry.entryId, entry);
        this.checkAndInitiateBlockCreation();
      }
    }
  }

  checkAndInitiateBlockCreation() {
    if (
      this.entryPool.size >= this.config.minEntriesPerBlock &&
      !this.blockchain.blockCreationInProgress
    ) {
      this.blockchain.addBlock(Array.from(this.entryPool.values()));
    }
  }

  removeProcessedTransactions(block) {
    if (block.data !== "Genesis Block") {
      block.data.forEach((entry) => {
        this.entryPool.delete(entry.entryId);
      });
    }
  }

  updateEntryPoolWithNewChain(newChain) {
    newChain.forEach((block) => {
      this.removeProcessedTransactions(block);
    });
  }

  clearQueuedEntries() {
    this.entryPool.clear();
  }

  getPendingEntries() {
    return Array.from(this.entryPool.values());
  }

  getEntry(entryId) {
    if (this.entryPool.has(entryId)) {
      const entry = { ...this.entryPool.get(entryId) };
      entry.blockIndex = "pending";
      return entry;
    }

    if (this.blockchain) {
      const chain = this.blockchain.chainToSerializableObject();
      for (let i = 0; i < chain.length; i++) {
        for (let entry of chain[i].data) {
          if (entry.entryId === entryId) {
            const entryCopy = { ...entry };
            entryCopy.blockIndex = i;
            return entryCopy;
          }
        }
      }
    }

    return null;
  }

  // validatePendingEntry(entry) {
  //   entry.data.toUpperCase().includes("BOGUS");
  //   return entry.data.toUpperCase().includes("BOGUS") ? false : true;
  //   // return this.config.validateEntry(entry);
  //   // Placeholder for entry validation
  //   // This method can be overridden by subclasses to implement specific entry validation logic
  //   throw new Error("validateEntry method must be implemented");
  // }

  hashEntry(entry) {
    const entryToHash = {
      from: entry.from,
      to: entry.to,
      amount: entry.amount,
      type: entry.type,
      initiationTimestamp: entry.initiationTimestamp,
      data: entry.data,
    };

    const hash = crypto.createHash("SHA256");
    hash.update(JSON.stringify(entryToHash));
    return hash.digest("hex");
  }

  verifySignature(entry) {
    if (entry.from !== "ICO" && entry.from !== "INCENTIVE") {
      const signedEntry = JSON.stringify({
        from: entry.from,
        to: entry.to,
        amount: entry.amount,
        type: entry.type,
        initiationTimestamp: entry.initiationTimestamp,
        data: entry.data,
        hash: entry.hash,
      });

      const keyPair = ec.keyFromPublic(entry.from, "hex");
      const verifier = crypto.createVerify("SHA256");
      verifier.update(signedEntry);
      verifier.end();
      return keyPair.verify(signedEntry, entry.signature);
    } else {
      return true;
    }
  }

  validatePendingEntry(entry) {
    const MAX_TIME_DIFF = 60000;

    const recalculatedHash = this.hashEntry(entry);
    if (recalculatedHash !== entry.hash) {
      console.error("Hash mismatch, entry data may have been tampered with.");
      return false;
    }

    if (!this.verifySignature(entry)) {
      console.error("Signature verification failed.");
      return false;
    }

    const currentTime = Date.now();
    const entryTime = entry.initiationTimestamp;
    if (Math.abs(currentTime - entryTime) > MAX_TIME_DIFF) {
      console.error("Entry timestamp is not within the acceptable range.");
      return false;
    }

    return true;
  }

  validateEntry(entry) {
    const recalculatedHash = this.hashEntry(entry);
    if (recalculatedHash !== entry.hash) {
      console.error("Hash mismatch, entry data may have been tampered with.");
      return false;
    }

    if (entry.blockIndex !== 0 && !this.verifySignature(entry)) {
      console.error("Signature verification failed.");
      return false;
    }

    return true;
  }

  transformPendingEntry(entry) {
    return entry.data.toUpperCase();
    // return this.config.transformEntry(entry);
    // Placeholder for entry transformation
    // This method can be overridden by subclasses to implement specific entry transformation logic
    throw new Error("transformEntry method must be implemented");
  }
}

export default DataHandler;

```

# genKeyPairsForTesting.js

```javascript
import crypto from "crypto";
import elliptic from "elliptic";
const EC = elliptic.ec;

const ec = new EC("secp256k1");

function generateKeyPair() {
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate("hex");
  const publicKeyCompressed = keyPair.getPublic().encode("hex", true); // True for compressed
  return { privateKey, publicKeyCompressed };
}

function signDocument(privateKeyHex, docString) {
  const sign = crypto.createSign("SHA256");
  sign.update(docString);
  sign.end();
  const ecKeyPair = ec.keyFromPrivate(privateKeyHex);
  const signature = ecKeyPair.sign(docString).toDER("hex");
  return signature;
}

function verifySignature(publicKeyCompressedHex, docString, signature) {
  const keyPair = ec.keyFromPublic(publicKeyCompressedHex, "hex");
  const verifier = crypto.createVerify("SHA256");
  verifier.update(docString);
  verifier.end();
  return keyPair.verify(docString, signature);
}

// Example usage:
const { privateKey, publicKeyCompressed } = generateKeyPair();
console.log(`Public Key Compressed: ${publicKeyCompressed}`);

const documentString = "Hello, Blockcraft!";
const signature = signDocument(privateKey, documentString);
console.log(`Signature: ${signature}`);
console.log(`Signature Length: ${signature.length}`);

const isVerified = verifySignature(
  publicKeyCompressed,
  documentString,
  signature
);
console.log(`Is the signature valid? ${isVerified}`);

function generateKeyPairs(numPairs = 10) {
  let keyPairs = [];

  for (let i = 0; i < numPairs; i++) {
    const keyPair = generateKeyPair();
    keyPairs.push(keyPair);
  }

  return keyPairs;
}

// Example usage:
const keyPairs = generateKeyPairs(10);
console.log(keyPairs);

```

