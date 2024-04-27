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
