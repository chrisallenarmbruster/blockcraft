import Blockchain from "./Blockchain.js";
import ProofOfWorkConsensus from "./ProofOfWorkConsensus.js";
import StandardMiningReward from "./StandardMiningAward.js";

async function testBlockchain() {
  let testBlockchain = new Blockchain(
    new ProofOfWorkConsensus({ difficulty: 6 }),
    new StandardMiningReward({ fixedReward: 100 })
  );

  testBlockchain.onChainUpdate((chain) => {
    console.log("\nBlockchain Updated!");
    console.log("\nBlock added:\n", chain[chain.length - 1]);
  });

  console.log(
    "\nTest Blockchain created and seeded with Genesis Block:\n",
    testBlockchain.chain[0]
  );

  await testBlockchain.addBlock({ data: "Block 1" });
  await testBlockchain.addBlock({ data: "Block 2" });
  await testBlockchain.addBlock({ data: "Block 3" });
  await testBlockchain.addBlock({ data: "Block 4" });

  let isValid = testBlockchain.validateChain();
  console.log("\nIs the Blockchain valid?", isValid);

  let latestBlock = testBlockchain.getLatestBlock();
  console.log("\nLatest Block:", latestBlock);

  console.log("\nComplete Blockchain:\n", testBlockchain.chain);
}

testBlockchain();
