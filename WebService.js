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
 * GET /chain-integrity - Validates the blockchain and returns the result.
 * GET /block/:index - Returns the block at the specified index.
 * GET /latest-block - Returns the latest block in the blockchain.
 * POST /add-entry - Queues a new entry to be added to the blockchain. The entry data is provided in the request body.
 * GET /unchained-entries - Returns all queued entries that have not yet been added to a block.
 * GET /chained-entries - Returns all entries that have been added to the blockchain.
 *
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
    this.app.get("/blockchain", (req, res) => {
      if (this.networkNode && this.networkNode.blockchain) {
        res.json(this.networkNode.blockchain.chain);
      } else {
        res.status(503).send("Blockchain service is unavailable");
      }
    });

    this.app.get("/chain-integrity", (req, res) => {
      const validationResult = this.networkNode.blockchain.validateChain();

      if (validationResult === true) {
        res.json({ isValid: true, message: "Blockchain is valid" });
      } else {
        res.status(400).json({
          isValid: false,
          message: "Blockchain validation failed",
          errors: validationResult,
        });
      }
    });

    this.app.get("/block/:index", (req, res) => {
      const index = parseInt(req.params.index);
      if (isNaN(index)) {
        return res.status(400).send("Invalid index");
      }

      const block = this.networkNode.blockchain.getBlockByIndex(index);
      if (!block) {
        return res.status(404).send("Block not found");
      }

      res.json(block);
    });

    this.app.get("/latest-block", (req, res) => {
      const latestBlock = this.networkNode.blockchain.getLatestBlock();
      if (!latestBlock) {
        return res.status(404).send("No blocks found in the blockchain");
      }

      res.json(latestBlock);
    });

    this.app.post("/add-entry", (req, res) => {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).send("No data provided");
      }

      try {
        this.networkNode.blockchain.addEntry(req.body);
        res.status(201).send("Entry added successfully");
      } catch (error) {
        res.status(500).send("Error adding entry: " + error.message);
      }
    });

    this.app.get("/unchained-entries", (req, res) => {
      try {
        const unchainedEntries =
          this.networkNode.blockchain.dataHandler.getPendingEntries();
        res.json(unchainedEntries);
      } catch (error) {
        res
          .status(500)
          .send("Failed to retrieve unchained entries: " + error.message);
      }
    });

    this.app.get("/chained-entries", (req, res) => {
      try {
        const blockchain = this.networkNode.blockchain;
        const allEntries = blockchain.chain.flatMap((block) => block.data);
        res.json(allEntries);
      } catch (error) {
        res
          .status(500)
          .send("Failed to retrieve chained entries: " + error.message);
      }
    });
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
