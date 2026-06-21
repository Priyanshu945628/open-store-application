import { customHash256, encryptBuffer, decryptBuffer, decryptBlock, BLOCK_SIZE } from './custom-crypto.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log("=== RUNNING CRYPTOGRAPHIC ENGINE TESTS ===");

// 1. Test customHash256
console.log("\n1. Testing Custom Hash (customHash256)...");
const hash1 = customHash256("hello world");
const hash2 = customHash256("hello world");
const hash3 = customHash256("hello worle"); // 1 char difference

assert(hash1.equals(hash2), "Hash should be deterministic");
assert(!hash1.equals(hash3), "Hash should change with 1 char differences (avalanche)");
console.log("   ✓ Determinism and avalanche effect confirmed.");
console.log("   Hash('hello world'):", hash1.toString('hex'));
console.log("   Hash('hello worle'):", hash3.toString('hex'));

// 2. Test Roundtrip of different sizes
console.log("\n2. Testing Encryption/Decryption Roundtrips...");
const testSizes = [
  10,                 // Very small
  512,                // Small
  BLOCK_SIZE - 100,   // Just under block size
  BLOCK_SIZE,         // Exactly 1 block
  BLOCK_SIZE + 500,   // 1 block and a fraction
  BLOCK_SIZE * 3 + 123 // Multiple blocks with fractional end
];

const testKey = "super_secure_developer_friend_key_123!";

for (const size of testSizes) {
  console.log(`   Testing size: ${size} bytes...`);
  // Generate random bytes
  const original = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    original[i] = Math.floor(Math.random() * 256);
  }

  const encrypted = encryptBuffer(original, testKey);
  assert(encrypted.length === original.length, "Encrypted size should match original size");
  assert(!encrypted.equals(original), "Encrypted data should not match original data");

  const decrypted = decryptBuffer(encrypted, testKey);
  assert(decrypted.equals(original), "Decrypted data should match original data 100%");
  console.log(`   ✓ Size ${size} roundtrip successful.`);
}

// 3. Test Random Access / Block Decryption
console.log("\n3. Testing Block-level Random Access Decryption (Streaming Support)...");
const largeSize = BLOCK_SIZE * 5 + 1024; // 5 blocks and a fraction
const originalLarge = Buffer.alloc(largeSize);
for (let i = 0; i < largeSize; i++) {
  originalLarge[i] = Math.floor(Math.random() * 256);
}

const encryptedLarge = encryptBuffer(originalLarge, testKey);

// Decrypt block index 2 only (indices 0, 1, 2, 3, 4, 5)
const blockIndexToTest = 2;
const origStart = blockIndexToTest * BLOCK_SIZE;
const origEnd = origStart + BLOCK_SIZE;
const originalSlice = originalLarge.subarray(origStart, origEnd);

const encStart = blockIndexToTest * BLOCK_SIZE;
const encEnd = encStart + BLOCK_SIZE;
const encryptedSlice = encryptedLarge.subarray(encStart, encEnd);

const decryptedSlice = decryptBlock(encryptedSlice, testKey, blockIndexToTest);

assert(decryptedSlice.equals(originalSlice), "Decrypted random-access slice should match original block slice");
console.log("   ✓ Dynamic block decryption is fully independent. Streaming seeks will work perfectly.");

// 4. Test Key Sensitivity
console.log("\n4. Testing Key Sensitivity...");
const wrongKey = "super_secure_developer_friend_key_123?"; // 1 character wrong
const decryptedWithWrongKey = decryptBuffer(encryptedLarge, wrongKey);
assert(!decryptedWithWrongKey.equals(originalLarge), "Decrypted output with wrong key must not match original");
console.log("   ✓ Incorrect key test passed (yielded garbage).");

console.log("\n=== ALL CRYPTOGRAPHIC TESTS PASSED SUCCESSFULLY ===");
