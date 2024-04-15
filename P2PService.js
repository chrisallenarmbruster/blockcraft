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
    if (!this.peers.has(msg.senderConfig?.senderId)) {
      console.log(
        "Adding to my connected peers list:",
        msg.senderConfig?.senderId
      );
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
          this.sendFullChain(msg.senderConfig.senderId);
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
                this.requestFullChain(msg.senderConfig.senderId);
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
        senderId: this.config?.id,
        senderLabel: this.config?.label,
        senderIp: this.config?.ip,
        senderUrl: this.config?.url,
        senderP2PPort: this.config?.port,
        webServicePort: this.networkNode?.webService?.config?.port,
      },
      messageId: nanoid(),
    };
    ws.send(JSON.stringify(handshakeMessage));
  }

  connectPeer(ws, senderConfig) {
    if (!this.peers.has(senderConfig.senderId)) {
      this.peers.set(senderConfig.senderId, { ws: ws, config: senderConfig });
      console.log(
        `Connected to a new peer with ID ${senderConfig.senderId}. Total peers: ${this.peers.size}`
      );
    } else {
      this.peers.set(senderConfig.senderId, { ws: ws, config: senderConfig });
    }
    ws.on("close", () => {
      console.log(`Peer ${senderConfig.senderId} disconnected.`);
      this.peers.delete(senderConfig.senderId);
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
      senderConfig: { senderId: this.config.id },
      messageId: nanoid(),
    });
    this.broadcast(message);
  }

  broadcastBlock(block) {
    const message = JSON.stringify({
      type: "newBlock",
      data: block.toSerializableObject(),
      senderConfig: { senderId: this.config.id },
      messageId: nanoid(),
    });
    this.broadcast(message);
  }

  broadcast(msg) {
    this.peers.forEach((peer, id) => {
      if (id !== msg.senderConfig?.senderId) {
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
      senderConfig: { senderId: this.config.id },
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
        senderConfig: { senderId: this.config.id },
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
