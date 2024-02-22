import Blockchain from "./Blockchain.js";
import ProofOfWorkConsensus from "./ProofOfWorkConsensus.js";
import StandardMiningReward from "./StandardMiningAward.js";
import DataHandler from "./DataHandler.js";

async function testBlockchain() {
  let testBlockchain = new Blockchain(
    new ProofOfWorkConsensus({ difficulty: 5 }),
    new StandardMiningReward({ fixedReward: 100 }),
    new DataHandler({ maxEntriesPerBlock: 3 })
  );

  testBlockchain.onChainUpdate((chain) => {
    console.log("\nBlockchain Updated!");
    console.log("\nBlock added:\n", chain[chain.length - 1]);
  });

  console.log(
    "\nTest Blockchain created and seeded with Genesis Block:\n",
    testBlockchain.chain[0]
  );

  await testBlockchain.addEntry({ data: "Entry 1" });
  await testBlockchain.addEntry({ data: "Bogus Entry" });
  await testBlockchain.addEntry({ data: "Bogus Entry" });
  await testBlockchain.addEntry({ data: "Entry 2" });
  await testBlockchain.addEntry({ data: "Entry 3" });
  await testBlockchain.addEntry({ data: "Bogus Entry" });
  await testBlockchain.addEntry({ data: "Entry 4" });
  await testBlockchain.addEntry({ data: "Entry 5" });
  await testBlockchain.addEntry({ data: "Bogus Entry" });
  await testBlockchain.addEntry({ data: "Entry 6" });
  await testBlockchain.addEntry({ data: "Entry 7" });
  await testBlockchain.addEntry({ data: "Entry 8" });
  await testBlockchain.addEntry({ data: "Bogus Entry" });
  await testBlockchain.addEntry({ data: "Bogus Entry" });
  await testBlockchain.addEntry({ data: "Bogus Entry" });
  await testBlockchain.addEntry({ data: "Entry 9" });
  await testBlockchain.addEntry({ data: "Entry 10" });

  let isValid = testBlockchain.validateChain();
  console.log("\nIs the Blockchain valid?", isValid);

  let latestBlock = testBlockchain.getLatestBlock();
  console.log("\nLatest Block:", latestBlock);

  console.log("\nComplete Blockchain:\n", testBlockchain.chain);
}

testBlockchain();
