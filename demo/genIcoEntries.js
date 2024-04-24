import { keyPairs } from "./genKeyPairsForTesting.js";
import crypto from "crypto";

const timestamp2024 = Date.UTC(2024, 0, 1, 0, 0, 0, 0);

function hashEntry(entry) {
  const hash = crypto.createHash("SHA256");
  hash.update(JSON.stringify(entry));
  return hash.digest("hex");
}

const icoEntries = keyPairs.map((keyPair, index) => {
  return {
    from: "ICO",
    to: keyPair.publicKeyCompressed,
    amount: 100,
    type: "crypto ico",
    initiationTimestamp: timestamp2024,
    data: "Thank you for participating in the ICO!",
    hash: hashEntry({
      from: "ICO",
      to: keyPair.publicKeyCompressed,
      amount: 100,
      type: "crypto ico",
      initiationTimestamp: timestamp2024,
      data: "Thank you for participating in the ICO!",
    }),
    signature: null,
    entryId: "ICO-" + String(index).padStart(17, "0"),
  };
});

console.log(keyPairs);
console.log(JSON.stringify(icoEntries));
