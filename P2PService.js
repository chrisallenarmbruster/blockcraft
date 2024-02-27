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

class P2PService {
  constructor(config = {}) {
    this.config = config;
    this.peers = [];
    this.websocketServer = null;
    this.messageHistory = new Set();
    this.messageTimeout = 30000;
    this.networkNode = null;

    if (this.config.autoStart) {
      this.initWebsocketServer();
    }
  }

  setNetworkNode(networkNode) {
    this.networkNode = networkNode;
  }

  setConfig(config) {
    this.config = config;
  }

  initWebsocketServer(port = this.config.port) {
    this.websocketServer = new WebSocket.Server({ port });
    this.websocketServer.on("connection", (ws) => {
      this.connectPeer(ws);
    });
    console.log(`P2PService WebSocket server started on port ${port}`);
  }

  connectToPeer(peerAddress) {
    const ws = new WebSocket(peerAddress);
    ws.on("open", () => {
      this.connectPeer(ws);
    });
  }

  connectPeer(ws) {
    this.peers.push(ws);
    console.log("Connected to a new peer.");

    ws.on("message", (message) => {
      const msg = JSON.parse(message);
      if (!this.messageHistory.has(msg.id)) {
        console.log("Received message:", message);
        this.addToMessageHistory(msg.id);
        this.broadcast(message, ws);
      }
    });

    ws.on("close", () => {
      console.log("Peer disconnected.");
      this.peers = this.peers.filter((peer) => peer !== ws);
    });
  }

  broadcast(message, sender) {
    this.peers.forEach((peer) => {
      if (peer !== sender) {
        peer.send(message);
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
