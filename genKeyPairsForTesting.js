import crypto from "crypto";
import elliptic from "elliptic";
const EC = elliptic.ec;

const ec = new EC("secp256k1");

function generateKeyPair() {
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate("hex");
  const publicKeyCompressed = keyPair.getPublic().encode("hex", true); // True for compressed
  return { privateKey, publicKeyCompressed };
}

function signDocument(privateKeyHex, docString) {
  const sign = crypto.createSign("SHA256");
  sign.update(docString);
  sign.end();
  const ecKeyPair = ec.keyFromPrivate(privateKeyHex);
  const signature = ecKeyPair.sign(docString).toDER("hex");
  return signature;
}

function verifySignature(publicKeyCompressedHex, docString, signature) {
  const keyPair = ec.keyFromPublic(publicKeyCompressedHex, "hex");
  const verifier = crypto.createVerify("SHA256");
  verifier.update(docString);
  verifier.end();
  return keyPair.verify(docString, signature);
}

// Example usage:
const { privateKey, publicKeyCompressed } = generateKeyPair();
console.log(`Public Key Compressed: ${publicKeyCompressed}`);

const documentString = "Hello, Blockcraft!";
const signature = signDocument(privateKey, documentString);
console.log(`Signature: ${signature}`);
console.log(`Signature Length: ${signature.length}`);

const isVerified = verifySignature(
  publicKeyCompressed,
  documentString,
  signature
);
console.log(`Is the signature valid? ${isVerified}`);

function generateKeyPairs(numPairs = 10) {
  let keyPairs = [];

  for (let i = 0; i < numPairs; i++) {
    const keyPair = generateKeyPair();
    keyPairs.push(keyPair);
  }

  return keyPairs;
}

// Example usage:
const keyPairs = generateKeyPairs(10);
console.log(keyPairs);
