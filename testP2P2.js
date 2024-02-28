import P2PService from "./P2PService.js";

function createP2PNode(port, connectTo) {
  const p2pService = new P2PService({ port: port, autoStart: true });

  if (connectTo) {
    p2pService.connectToPeer(connectTo);
    console.log("Peers:", p2pService.peers);
  }

  p2pService.websocketServer.on("connection", (ws) => {
    ws.send(
      JSON.stringify({ type: "message", data: "Hello from port " + port })
    );
    console.log("Peers:", p2pService.peers);
  });
}

const node1Port = 6001;
const node2Port = 6002;

createP2PNode(node2Port, `ws://localhost:${node1Port}`);
