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
    const router = express.Router();

    router.get("/blockchain", (req, res) => {
      if (this.networkNode && this.networkNode.blockchain) {
        res.json(this.networkNode.blockchain.chain);
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

    router.get("/blocks/latest", (req, res) => {
      const { count = 30 } = req.query;
      const numOfBlocks = Math.min(Number(count), 100);
      try {
        const blocks = this.networkNode.blockchain.getLatestBlocks(numOfBlocks);
        res.json(blocks);
      } catch (error) {
        console.error("Failed to fetch the latest blocks:", error);
        res.status(500).json({ error: "Failed to fetch the latest blocks" });
      }
    });

    router.get("/blocks/range", (req, res) => {
      const radius = parseInt(req.query.radius, 10) || 15;
      const centerOnIndex = req.query.centerOnIndex
        ? parseInt(req.query.centerOnIndex, 10)
        : undefined;

      try {
        const blocksRange = this.networkNode.blockchain.getBlocksRange(
          radius,
          centerOnIndex
        );
        res.json(blocksRange);
      } catch (error) {
        console.error("Failed to get blocks range:", error);
        res.status(500).send("Internal Server Error");
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

    router.get("/old-blocks", (req, res) => {
      const { limit = 10, sort = "desc" } = req.query;
      let { startWithIndex } = req.query;

      if (sort === "asc" && startWithIndex === undefined) {
        startWithIndex = "0";
      } else if (startWithIndex === undefined) {
        startWithIndex = this.networkNode.blockchain
          .getLatestBlock()
          .index.toString();
      }

      const limitNum = Math.min(Math.max(parseInt(limit, 10), 1), 100);
      const startWithIndexNum = parseInt(startWithIndex, 10);

      let filteredChain = this.networkNode.blockchain
        .chainToSerializableObject()
        .filter((block) => {
          return sort === "asc"
            ? block.index >= startWithIndexNum
            : block.index <= startWithIndexNum;
        });

      filteredChain =
        sort === "asc"
          ? filteredChain.sort((a, b) => a.index - b.index)
          : filteredChain.sort((a, b) => b.index - a.index);

      const blocks = filteredChain.slice(0, limitNum);

      let lastIndexInResponse =
        blocks.length > 0 ? blocks[blocks.length - 1].index : null;

      const nextIndexReference =
        blocks.length > 0
          ? sort === "asc"
            ? blocks[blocks.length - 1].index
            : blocks[0].index
          : startWithIndexNum;

      const meta = {
        requestedLimit: limitNum,
        returnedBlocks: blocks.length,
        lastIndexInResponse,
        nextIndexReference:
          sort === "asc"
            ? nextIndexReference + 1
            : nextIndexReference - limitNum < 0
            ? null
            : nextIndexReference - limitNum,
        sort,
      };

      res.json({ blocks, meta });
    });

    router.get("/block/:index", (req, res) => {
      console.log(`API Call on Index ${req.params.index}`);
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

    router.get("/latest-block", (req, res) => {
      const latestBlock = this.networkNode.blockchain.getLatestBlock();
      if (!latestBlock) {
        return res.status(404).send("No blocks found in the blockchain");
      }

      res.json(latestBlock);
    });

    router.get("/entries", (req, res) => {
      try {
        const page = parseInt(req.query.page || 1);
        const pageLimit = parseInt(req.query.pageLimit || 30);
        const sort = req.query.sort || "asc";
        const scope = req.query.scope || "all";
        const blockchain = this.networkNode.blockchain;
        let allEntries;

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
          if (allEntries.length > 30) {
            allEntries = allEntries.slice(-30);
          }
        } else if (scope === "pending") {
          allEntries = blockchain.dataHandler.getPendingEntries();
          allEntries = allEntries.map((entry) => ({
            ...entry,
            blockIndex: "pending",
          }));
        } else {
          // scope === "all"
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
        };
        res.json({ entries, meta });
      } catch (error) {
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
