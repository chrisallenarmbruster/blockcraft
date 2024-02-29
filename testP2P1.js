import P2PService from "./P2PService.js";

function createP2PNode(config) {
  console.clear();

  const p2pService = new P2PService({
    port: config.port,
    autoStart: config.autoStart,
    id: config.id,
    seedPeers: config.seedPeers,
  });

  setTimeout(() => {
    p2pService.broadcast({
      type: "message",
      data: `${config.messageData} from port ${config.port}`,
      senderId: config.id,
      messageId: Date.now(),
    });
  }, config.testMessageDelay);
}

let config = {};

for (let i = 2; i < process.argv.length; i += 2) {
  let key = process.argv[i];
  let value = process.argv[i + 1];
  if (key.startsWith("-")) {
    config[key.substring(1)] = value;
  }
}

"true" === config.autoStart
  ? (config.autoStart = true)
  : (config.autoStart = false);

config.port = parseInt(config.port);
config.seedPeers = JSON.parse(config.seedPeers);
config.testMessageDelay = parseInt(config.testMessageDelay);

createP2PNode(config);

// Run this file with the following command:
//   node testP2P1.js -id node1 -port 6001 -autoStart true -seedPeers '["ws://localhost:6002"]' -messageData "Hello!" -testMessageDelay 7000
// AND in another terminal run:
//   node testP2P1.js -id node2 -port 6002 -autoStart true -seedPeers '["ws://localhost:6001"]' -messageData "Hello!" -testMessageDelay 9000
// AND and in another terminal run:
//   node testP2P1.js -id node3 -port 6003 -autoStart true -seedPeers '["ws://localhost:6002"]' -messageData "Hello!" -testMessageDelay 11000
