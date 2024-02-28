import P2PService from "./P2PService.js";

function createP2PNode(port) {
  const p2pService = new P2PService({
    port: port,
    autoStart: true,
    id: "node2",
    seedPeers: ["ws://localhost:6001"],
  });

  setTimeout(() => {
    p2pService.broadcast({
      type: "message",
      data: "Hello from port " + port,
      senderId: "node2",
      messageId: Date.now(),
    });
  }, 5000);
}

const node1Port = 6001;
const node2Port = 6002;

createP2PNode(node2Port);
