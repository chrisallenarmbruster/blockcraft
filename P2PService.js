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
 * const p2pService = new P2PService({port: 6001, autoStart: true});
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
      console.log("Shaking hands with peer:", msg.senderId);
      this.handleHandshake(ws, msg);
    } else {
      this.handleNonHandshakeMessage(msg);
    }
  }

  handleHandshake(ws, msg) {
    if (!this.peers.has(msg.senderId)) {
      this.sendHandshake(ws);
    }
    this.connectPeer(ws, msg.senderId);
  }

  handleNonHandshakeMessage(msg) {
    if (!this.messageHistory.has(msg.messageId)) {
      console.log("Received message:", JSON.stringify(msg));
      this.addToMessageHistory(msg.messageId);
      this.broadcast(msg);
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
    this.peers.set(id, ws);
    console.log(
      `Connected to a new peer with ID ${id}. Total peers: ${this.peers.size}`
    );
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
      console.log(`Message ID ${messageId} removed from history.`);
    }, this.messageTimeout);
  }
}

export default P2PService;
