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
    this.websocketServer.on("connection", (ws) => {
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
    if (!this.peers.has(msg.senderId)) {
      console.log("Adding to my connected peers list:", msg.senderId);
      this.sendHandshake(ws);
    }
    this.connectPeer(ws, msg.senderId);
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
          this.networkNode.blockchain.dataHandler.addPendingEntry(msg.data);
          console.log("Received new entry:", msg.data);
          this.broadcast(msg);
          break;
        case "newBlock":
          const receivedBlock = msg.data;

          (async () => {
            try {
              const latestBlock = this.networkNode.blockchain.getLatestBlock();
              if (receivedBlock.index > latestBlock.index + 1) {
                console.log("Longer chain detected.");
                // TODO: Implement chain replacement: request full chain from peer, validate, stop any mining that was underway, replace, and broadcast new block.
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
      senderId: this.config.id,
      messageId: nanoid(),
    };
    ws.send(JSON.stringify(handshakeMessage));
  }

  connectPeer(ws, id) {
    if (!this.peers.has(id)) {
      this.peers.set(id, ws);
      console.log(
        `Connected to a new peer with ID ${id}. Total peers: ${this.peers.size}`
      );
    } else {
      this.peers.set(id, ws);
    }
    ws.on("close", () => {
      console.log(`Peer ${id} disconnected.`);
      this.peers.delete(id);
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
      senderId: this.config.id,
      messageId: nanoid(),
    });
    this.broadcast(message);
  }

  broadcastBlock(block) {
    const message = JSON.stringify({
      type: "newBlock",
      data: block.toSerializableObject(),
      senderId: this.config.id,
      messageId: nanoid(),
    });
    this.broadcast(message);
  }

  broadcast(msg) {
    this.peers.forEach((peer, id) => {
      if (id !== msg.senderId) {
        peer.send(JSON.stringify(msg));
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
}

export default P2PService;
