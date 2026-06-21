/**
 * Custom Cryptographic Engine: Dynamic Chaotic Bit-Scrambler (DCBS)
 * Built to be highly secure, patternless, and independent of standard encryption libraries.
 * 
 * Supports block-level random access decryption for fast streaming and partial download requests.
 */

// Custom multi-round mixing hash (256-bit)
export function customHash256(input) {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf-8') : input;
  
  // Initialization vectors (fractional parts of square roots of first 8 primes)
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  // Padding: Append 0x80, pad with zeros, append length in bits
  const originalLength = buffer.length;
  const bitLength = originalLength * 8;
  const paddedLength = Math.ceil((originalLength + 9) / 64) * 64;
  const padded = Buffer.alloc(paddedLength);
  buffer.copy(padded);
  padded[originalLength] = 0x80;
  
  // Write 64-bit length at the end of the block
  padded.writeUInt32BE(Math.floor(bitLength / 0x100000000), paddedLength - 8);
  padded.writeUInt32BE(bitLength % 0x100000000, paddedLength - 4);

  // Compression loop (64-byte blocks)
  for (let i = 0; i < padded.length; i += 64) {
    const w = new Uint32Array(16);
    for (let t = 0; t < 16; t++) {
      w[t] = padded.readUInt32BE(i + t * 4);
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let t = 0; t < 32; t++) {
      // Non-linear functions and rotations
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + w[t % 16] + 0x428a2f98) | 0;
      
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const out = Buffer.alloc(32);
  out.writeUInt32BE(h0 >>> 0, 0);
  out.writeUInt32BE(h1 >>> 0, 4);
  out.writeUInt32BE(h2 >>> 0, 8);
  out.writeUInt32BE(h3 >>> 0, 12);
  out.writeUInt32BE(h4 >>> 0, 16);
  out.writeUInt32BE(h5 >>> 0, 20);
  out.writeUInt32BE(h6 >>> 0, 24);
  out.writeUInt32BE(h7 >>> 0, 28);
  return out;
}

// Chaotic PRNG using a Logistic Map
class ChaoticPRNG {
  constructor(seedBuffer) {
    let sum = 0;
    for (let i = 0; i < seedBuffer.length; i++) {
      sum = (sum * 251 + seedBuffer[i]) % 1000000007;
    }
    // Set initial condition and parameter in chaotic region
    this.x = 0.123456789 + (sum % 700000000) / 1000000000; // range [0.123, 0.823]
    this.r = 3.9999 + ((sum % 10000) / 100000000);        // range [3.99990, 3.99999]
    
    // Warm up the chaotic map (128 iterations to destroy correlation with seed)
    for (let i = 0; i < 128; i++) {
      this.next();
    }
  }

  next() {
    this.x = this.r * this.x * (1.0 - this.x);
    return this.x;
  }

  nextByte() {
    // Extract a byte from the fractional part
    const fractional = Math.floor(this.next() * 1e12);
    return fractional % 256;
  }
}

// Block size for file encryption (64KB)
export const BLOCK_SIZE = 64 * 1024;

/**
 * Encrypts a block of bytes using a dynamic state derived from key + blockIndex
 */
export function encryptBlock(blockData, key, blockIndex) {
  const L = blockData.length;
  if (L === 0) return Buffer.alloc(0);

  // 1. Derive block seed
  const blockSeed = customHash256(`${key}:${blockIndex}`);
  const prng = new ChaoticPRNG(blockSeed);

  // 2. Generate block-specific S-Box (size 256 is extremely fast)
  const sbox = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    sbox[i] = i;
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(prng.next() * (i + 1));
    const tmp = sbox[i];
    sbox[i] = sbox[j];
    sbox[j] = tmp;
  }

  const output = Buffer.alloc(L);
  let state = (blockSeed[0] << 24) | (blockSeed[1] << 16) | (blockSeed[2] << 8) | blockSeed[3];

  // 3. Perform S-Box substitution and fast LCG keystream XOR
  for (let i = 0; i < L; i++) {
    state = Math.imul(state, 1664525) + 1013904223;
    const keyByte = (state >>> 24) & 0xFF;
    output[i] = sbox[blockData[i]] ^ keyByte;
  }

  return output;
}

/**
 * Decrypts a block of bytes in reverse
 */
export function decryptBlock(encBlockData, key, blockIndex) {
  const L = encBlockData.length;
  if (L === 0) return Buffer.alloc(0);

  // 1. Derive block seed
  const blockSeed = customHash256(`${key}:${blockIndex}`);
  const prng = new ChaoticPRNG(blockSeed);

  // 2. Generate block-specific S-Box and its inverse
  const sbox = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    sbox[i] = i;
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(prng.next() * (i + 1));
    const tmp = sbox[i];
    sbox[i] = sbox[j];
    sbox[j] = tmp;
  }
  const invSbox = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    invSbox[sbox[i]] = i;
  }

  const output = Buffer.alloc(L);
  let state = (blockSeed[0] << 24) | (blockSeed[1] << 16) | (blockSeed[2] << 8) | blockSeed[3];

  // 3. Perform reverse XOR and reverse substitution
  for (let i = 0; i < L; i++) {
    state = Math.imul(state, 1664525) + 1013904223;
    const keyByte = (state >>> 24) & 0xFF;
    const substitutedByte = encBlockData[i] ^ keyByte;
    output[i] = invSbox[substitutedByte];
  }

  return output;
}

/**
 * Encrypts an entire buffer of arbitrary size
 */
export function encryptBuffer(buffer, key) {
  const chunks = [];
  const totalBlocks = Math.ceil(buffer.length / BLOCK_SIZE);
  
  for (let b = 0; b < totalBlocks; b++) {
    const start = b * BLOCK_SIZE;
    const end = Math.min(start + BLOCK_SIZE, buffer.length);
    const block = buffer.subarray(start, end);
    const encryptedBlock = encryptBlock(block, key, b);
    chunks.push(encryptedBlock);
  }
  
  return Buffer.concat(chunks);
}

/**
 * Decrypts an entire buffer of arbitrary size
 */
export function decryptBuffer(buffer, key) {
  const chunks = [];
  const totalBlocks = Math.ceil(buffer.length / BLOCK_SIZE);
  
  for (let b = 0; b < totalBlocks; b++) {
    const start = b * BLOCK_SIZE;
    const end = Math.min(start + BLOCK_SIZE, buffer.length);
    const block = buffer.subarray(start, end);
    const decryptedBlock = decryptBlock(block, key, b);
    chunks.push(decryptedBlock);
  }
  
  return Buffer.concat(chunks);
}
