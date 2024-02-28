import P2PService from "./P2PService.js";

function createP2PNode(port, connectTo) {
  const p2pService = new P2PService({
    port: port,
    autoStart: true,
    id: "node1",
    seedPeers: ["ws://localhost:6002"],
  });

  setTimeout(() => {
    p2pService.broadcast({
      type: "message",
      data: "Hello from port " + port,
      senderId: "node1",
      messageId: Date.now(),
    });
  }, 7000);
}

const node1Port = 6001;
const node2Port = 6002;

createP2PNode(node1Port);
