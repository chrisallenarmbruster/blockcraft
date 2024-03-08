/**
 * NetworkNode.js
 *
 * This file defines the NetworkNode class, a central component of the Blockcraft blockchain network.
 * The NetworkNode class integrates the blockchain logic with network functionalities, enabling node-to-node
 * communication and providing an HTTP API for external interaction.
 *
 * The class accepts instances of the Blockchain, P2PService, and WebService as parameters, facilitating
 * a modular and flexible architecture. Each of these components is responsible for a specific aspect of
 * the blockchain network operation, allowing for easy updates and maintenance.
 *
 * Usage:
 * const networkNode = new NetworkNode(blockchainInstance, p2pServiceInstance, webServiceInstance, config);
 *
 */

class NetworkNode {
  constructor(
    blockchainInstance,
    p2pServiceInstance,
    webServiceInstance,
    config
  ) {
    this.blockchain = blockchainInstance;
    this.p2pService = p2pServiceInstance;
    this.webService = webServiceInstance;
    this.config = config;

    this.blockchain?.setNetworkNode(this);
    this.p2pService?.setNetworkNode(this);
    this.webService?.setNetworkNode(this);

    if (this.blockchain && this.p2pService) {
      this.blockchain.on("entryAdded", (entry) => {
        this.p2pService.broadcastEntry(entry);
      });

      this.blockchain.on("blockCreated", (block) => {
        this.p2pService.broadcastBlock(block);
      });

      this.blockchain.on("peerBlockAdded", (block) => {
        console.log("Peer block added:", block);
      });
    }
  }

  config(newConfig) {
    this.config = newConfig;
  }
}

export default NetworkNode;
