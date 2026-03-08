/**
 * Pure-JS QR Code Encoder
 *
 * Supports QR versions 1-10 with byte-mode encoding and all 4 error correction levels.
 * No external dependencies - uses Reed-Solomon error correction over GF(256).
 */

// Primitive polynomial for GF(256): x^8 + x^4 + x^3 + x^2 + 1 (0x11D)
const PRIMITIVE_POLY = 0x11d;

// Precompute GF(256) exponent and log tables
const EXP_TABLE: number[] = new Array(256);
const LOG_TABLE: number[] = new Array(256);

(function initGfTables() {
  let x = 1;
  for (let i = 0; i < 256; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= PRIMITIVE_POLY;
    }
  }
})();

// GF(256) multiplication
function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

// GF(256) exponentiation
function gfExp(base: number, exp: number): number {
  if (exp === 0) return 1;
  if (base === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[base] * exp) % 255];
}

// Byte capacity for versions 1-10 at each error correction level (byte mode)
const BYTE_CAPACITY: Record<number, Record<"L" | "M" | "Q" | "H", number>> = {
  1: { L: 17, M: 14, Q: 11, H: 7 },
  2: { L: 32, M: 26, Q: 20, H: 14 },
  3: { L: 53, M: 42, Q: 32, H: 24 },
  4: { L: 78, M: 62, Q: 46, H: 34 },
  5: { L: 106, M: 84, Q: 60, H: 44 },
  6: { L: 134, M: 106, Q: 74, H: 58 },
  7: { L: 154, M: 122, Q: 86, H: 64 },
  8: { L: 192, M: 152, Q: 108, H: 84 },
  9: { L: 230, M: 180, Q: 130, H: 98 },
  10: { L: 271, M: 213, Q: 151, H: 119 },
};

// Error correction codewords per block for versions 1-10
const EC_CODEWORDS_PER_BLOCK: Record<number, Record<"L" | "M" | "Q" | "H", number>> = {
  1: { L: 7, M: 10, Q: 13, H: 17 },
  2: { L: 10, M: 16, Q: 22, H: 28 },
  3: { L: 15, M: 26, Q: 36, H: 44 },
  4: { L: 20, M: 36, Q: 52, H: 64 },
  5: { L: 26, M: 48, Q: 72, H: 88 },
  6: { L: 36, M: 64, Q: 96, H: 112 },
  7: { L: 40, M: 72, Q: 108, H: 130 },
  8: { L: 48, M: 88, Q: 132, H: 156 },
  9: { L: 60, M: 110, Q: 160, H: 192 },
  10: { L: 72, M: 130, Q: 192, H: 224 },
};

// Number of data codewords per block for versions 1-10
// Format: { c1: count of block1, k1: data codewords in block1, c2?: count of block2, k2?: data codewords in block2 }
const NUM_BLOCKS: Record<number, Record<"L" | "M" | "Q" | "H", { c1: number; k1: number; c2?: number; k2?: number }>> = {
  1: { L: { c1: 1, k1: 19 }, M: { c1: 1, k1: 16 }, Q: { c1: 1, k1: 13 }, H: { c1: 1, k1: 9 } },
  2: { L: { c1: 1, k1: 34 }, M: { c1: 1, k1: 28 }, Q: { c1: 1, k1: 22 }, H: { c1: 1, k1: 16 } },
  3: { L: { c1: 1, k1: 55 }, M: { c1: 2, k1: 22 }, Q: { c1: 2, k1: 17 }, H: { c1: 2, k1: 13 } },
  4: { L: { c1: 1, k1: 80 }, M: { c1: 2, k1: 32 }, Q: { c1: 2, k1: 24 }, H: { c1: 4, k1: 9 } },
  5: { L: { c1: 1, k1: 108 }, M: { c1: 2, k1: 43 }, Q: { c1: 2, k1: 15, c2: 2, k2: 16 }, H: { c1: 2, k1: 11, c2: 2, k2: 12 } },
  6: { L: { c1: 2, k1: 68 }, M: { c1: 4, k1: 27 }, Q: { c1: 4, k1: 19 }, H: { c1: 4, k1: 15 } },
  7: { L: { c1: 2, k1: 78 }, M: { c1: 4, k1: 31 }, Q: { c1: 2, k1: 14, c2: 4, k2: 15 }, H: { c1: 4, k1: 13, c2: 1, k2: 14 } },
  8: { L: { c1: 2, k1: 97 }, M: { c1: 2, k1: 38, c2: 2, k2: 39 }, Q: { c1: 4, k1: 18, c2: 2, k2: 19 }, H: { c1: 4, k1: 14, c2: 2, k2: 15 } },
  9: { L: { c1: 2, k1: 116 }, M: { c1: 3, k1: 36, c2: 2, k2: 37 }, Q: { c1: 4, k1: 16, c2: 4, k2: 17 }, H: { c1: 4, k1: 15, c2: 3, k2: 16 } },
  10: { L: { c1: 2, k1: 68, c2: 2, k2: 69 }, M: { c1: 4, k1: 43, c2: 1, k2: 44 }, Q: { c1: 1, k1: 19, c2: 4, k2: 20 }, H: { c1: 2, k1: 14, c2: 6, k2: 15 } },
};

// Alignment pattern center positions for versions 2-10 (version 1 has no alignment patterns)
const ALIGNMENT_PATTERNS: Record<number, number[]> = {
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

// QR code size (modules) for each version
const VERSION_SIZE: Record<number, number> = {
  1: 21, 2: 25, 3: 29, 4: 33, 5: 37, 6: 41,
  7: 45, 8: 49, 9: 53, 10: 57,
};

// Format information bit patterns (15-bit, with BCH error correction, mask 0 applied)
const FORMAT_INFO: Record<string, number> = {
  "L-0": 0x77c4, "L-1": 0x72f3, "L-2": 0x7daa, "L-3": 0x789d,
  "L-4": 0x662f, "L-5": 0x6318, "L-6": 0x6c41, "L-7": 0x6976,
  "M-0": 0x5412, "M-1": 0x5125, "M-2": 0x5e7c, "M-3": 0x5b4b,
  "M-4": 0x45f9, "M-5": 0x40ce, "M-6": 0x4f97, "M-7": 0x4aa0,
  "Q-0": 0x355f, "Q-1": 0x3068, "Q-2": 0x3f31, "Q-3": 0x3a06,
  "Q-4": 0x24b4, "Q-5": 0x2183, "Q-6": 0x2eda, "Q-7": 0x2bed,
  "H-0": 0x1689, "H-1": 0x13be, "H-2": 0x1ce7, "H-3": 0x19d0,
  "H-4": 0x0762, "H-5": 0x0255, "H-6": 0x0d0c, "H-7": 0x083b,
};

/**
 * Generate Reed-Solomon generator polynomial for given error correction codeword count.
 */
function rsGeneratorPoly(ecCount: number): number[] {
  let poly = [1];
  for (let i = 0; i < ecCount; i++) {
    const newPoly: number[] = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      newPoly[j] ^= poly[j];
      newPoly[j + 1] = gfMul(poly[j], EXP_TABLE[i]);
    }
    poly = newPoly;
  }
  return poly;
}

/**
 * Compute Reed-Solomon error correction codewords.
 */
function rsEncode(data: number[], ecCount: number): number[] {
  const gen = rsGeneratorPoly(ecCount);
  const remainder = new Array(gen.length - 1).fill(0);

  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.shift();
    for (let i = 0; i < remainder.length; i++) {
      remainder[i] ^= gfMul(gen[i + 1], factor);
    }
  }

  return remainder;
}

/**
 * Find the minimum QR version that can hold the given data length.
 */
function findVersion(dataLength: number, ecLevel: "L" | "M" | "Q" | "H"): number {
  for (let v = 1; v <= 10; v++) {
    if (BYTE_CAPACITY[v][ecLevel] >= dataLength) {
      return v;
    }
  }
  return -1;
}

/**
 * Place finder patterns (7x7 with 1-module separator) at three corners.
 */
function placeFinderPatterns(matrix: (boolean | null)[][], size: number): void {
  const positions = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ];

  for (const [row, col] of positions) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBlack =
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        matrix[row + r][col + c] = isBlack;
      }
    }
    // Separator (1-module white border)
    for (let i = 0; i < 8; i++) {
      if (row + 7 < size && i < size) matrix[row + 7][col + i] = false;
      if (col + 7 < size && row + i < size) matrix[row + i][col + 7] = false;
      if (row > 0 && col - 1 + i >= 0 && col - 1 + i < size) matrix[row - 1][col - 1 + i] = false;
      if (col > 0 && row - 1 + i >= 0 && row - 1 + i < size) matrix[row - 1 + i][col - 1] = false;
    }
  }
}

/**
 * Place timing patterns (alternating modules along row 6 and column 6).
 */
function placeTimingPatterns(matrix: (boolean | null)[][], size: number): void {
  for (let i = 8; i < size - 8; i++) {
    const isBlack = i % 2 === 0;
    matrix[6][i] = isBlack;
    matrix[i][6] = isBlack;
  }
}

/**
 * Place alignment patterns for versions 2-10.
 */
function placeAlignmentPatterns(matrix: (boolean | null)[][], version: number): void {
  if (version === 1) return;

  const positions = ALIGNMENT_PATTERNS[version];
  if (!positions) return;

  for (const row of positions) {
    for (const col of positions) {
      // Skip if overlapping with finder patterns
      if (
        (row < 9 && col < 9) ||
        (row < 9 && col > matrix.length - 10) ||
        (row > matrix.length - 10 && col < 9)
      ) {
        continue;
      }

      // Place 5x5 alignment pattern
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const isBlack =
            r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
          matrix[row + r][col + c] = isBlack;
        }
      }
    }
  }
}

/**
 * Reserve format information areas (around finder patterns).
 */
function reserveFormatAreas(matrix: (boolean | null)[][], size: number): void {
  // Horizontal format area (row 8, columns 0-8 and size-8 to size-1)
  for (let c = 0; c < 9; c++) {
    if (matrix[8][c] === null) matrix[8][c] = false; // Reserve as white initially
  }
  for (let c = size - 8; c < size; c++) {
    if (matrix[8][c] === null) matrix[8][c] = false;
  }

  // Vertical format area (column 8, rows 0-8 and size-7 to size-1)
  for (let r = 0; r < 9; r++) {
    if (matrix[r][8] === null) matrix[r][8] = false;
  }
  for (let r = size - 7; r < size; r++) {
    if (matrix[r][8] === null) matrix[r][8] = false;
  }
}

/**
 * Place the dark module and reserve version info area (for versions 7+).
 */
function placeDarkModule(matrix: (boolean | null)[][], version: number): void {
  // Dark module at row 4*version+9, column 8
  const row = 4 * version + 9;
  if (row < matrix.length) {
    matrix[row][8] = true;
  }
}

/**
 * Place data bits in the QR matrix using zigzag pattern.
 */
function placeDataBits(matrix: (boolean | null)[][], dataBits: number[], size: number): void {
  let bitIndex = 0;
  let upward = true;

  // Iterate through columns right to left, skipping timing column
  for (let col = size - 1; col >= 0; col -= 2) {
    // Skip timing pattern column
    if (col === 6) col = 5;

    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const c of [col, col - 1]) {
        if (c < 0) continue;
        if (matrix[row][c] === null) {
          matrix[row][c] = bitIndex < dataBits.length ? dataBits[bitIndex] === 1 : false;
          bitIndex++;
        }
      }
    }
    upward = !upward;
  }
}

/**
 * Apply a mask pattern to the data area.
 */
function applyMask(matrix: (boolean | null)[][], mask: number): (boolean | null)[][] {
  const size = matrix.length;
  const masked = matrix.map(row => [...row]);

  const maskFunctions: ((r: number, c: number) => boolean)[] = [
    (r, c) => (r + c) % 2 === 0,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  const maskFn = maskFunctions[mask];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Only mask data areas (not function patterns)
      if (masked[r][c] !== null && !isReservedFunction(r, c, size)) {
        if (maskFn(r, c)) {
          masked[r][c] = !masked[r][c];
        }
      }
    }
  }

  return masked;
}

/**
 * Check if a position is a reserved function pattern (finder, timing, alignment, format).
 */
function isReservedFunction(row: number, col: number, size: number): boolean {
  // Finder patterns with separators
  if (row < 9 && col < 9) return true;
  if (row < 9 && col >= size - 8) return true;
  if (row >= size - 8 && col < 9) return true;

  // Timing patterns
  if (row === 6 || col === 6) return true;

  // Format info areas
  if (row === 8 || col === 8) return true;

  return false;
}

/**
 * Calculate penalty score for a masked QR code.
 * Lower is better.
 */
function calculatePenalty(matrix: boolean[][]): number {
  const size = matrix.length;
  let penalty = 0;

  // Rule 1: 5+ consecutive same-color modules in row/column
  for (let r = 0; r < size; r++) {
    let count = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) {
        count++;
      } else {
        if (count >= 5) penalty += count - 2;
        count = 1;
      }
    }
    if (count >= 5) penalty += count - 2;
  }

  for (let c = 0; c < size; c++) {
    let count = 1;
    for (let r = 1; r < size; r++) {
      if (matrix[r][c] === matrix[r - 1][c]) {
        count++;
      } else {
        if (count >= 5) penalty += count - 2;
        count = 1;
      }
    }
    if (count >= 5) penalty += count - 2;
  }

  // Rule 2: 2x2 blocks of same color
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = matrix[r][c];
      if (matrix[r][c + 1] === v && matrix[r + 1][c] === v && matrix[r + 1][c + 1] === v) {
        penalty += 3;
      }
    }
  }

  // Rule 3: Finder-pattern-like sequences
  const pattern1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pattern2 = [false, false, false, false, true, false, true, true, true, false, true];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      let match1 = true, match2 = true;
      for (let i = 0; i < 11; i++) {
        if (matrix[r][c + i] !== pattern1[i]) match1 = false;
        if (matrix[r][c + i] !== pattern2[i]) match2 = false;
      }
      if (match1 || match2) penalty += 40;
    }
  }

  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      let match1 = true, match2 = true;
      for (let i = 0; i < 11; i++) {
        if (matrix[r + i][c] !== pattern1[i]) match1 = false;
        if (matrix[r + i][c] !== pattern2[i]) match2 = false;
      }
      if (match1 || match2) penalty += 40;
    }
  }

  // Rule 4: Proportion of dark modules
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) darkCount++;
    }
  }
  const ratio = (darkCount * 100) / (size * size);
  const deviation = Math.abs(ratio - 50);
  penalty += Math.floor(deviation / 5) * 10;

  return penalty;
}

/**
 * Write format information after mask selection.
 */
function writeFormatInfo(matrix: (boolean | null)[][], ecLevel: "L" | "M" | "Q" | "H", mask: number): void {
  const formatBits = FORMAT_INFO[`${ecLevel}-${mask}`];
  if (formatBits === undefined) return;

  const size = matrix.length;
  const bits: number[] = [];
  for (let i = 14; i >= 0; i--) {
    bits.push((formatBits >> i) & 1);
  }

  // Write around top-left finder
  for (let i = 0; i < 6; i++) {
    matrix[8][i] = bits[i] === 1;
  }
  matrix[8][7] = bits[6] === 1;
  matrix[8][8] = bits[7] === 1;
  matrix[7][8] = bits[8] === 1;
  for (let i = 9; i < 15; i++) {
    matrix[14 - i][8] = bits[i] === 1;
  }

  // Write around bottom-left and top-right finders
  let bitIdx = 0;
  for (let r = size - 1; r >= size - 7; r--) {
    matrix[r][8] = bits[bitIdx++] === 1;
  }
  bitIdx = 8;
  for (let c = size - 8; c < size; c++) {
    matrix[8][c] = bits[bitIdx++] === 1;
  }
}

/**
 * Result of QR matrix generation.
 */
export interface QRResult {
  matrix: boolean[][];  // true = dark module, false = light module
  size: number;         // module count (e.g. 21 for version 1)
}

/**
 * Generate a QR code matrix from the given data string.
 *
 * @param data - The string to encode (URL, text, etc.)
 * @param ecLevel - Error correction level (L, M, Q, H)
 * @returns QRResult with matrix and size
 * @throws Error if data is too long for QR versions 1-10
 */
export function generateQRMatrix(data: string, ecLevel: "L" | "M" | "Q" | "H" = "M"): QRResult {
  // Convert data to bytes (UTF-8)
  const dataBytes = new TextEncoder().encode(data);

  // Find minimum version
  const version = findVersion(dataBytes.length, ecLevel);
  if (version === -1) {
    throw new Error(`Data too long for QR code. Reduce text or lower error correction level. (Length: ${dataBytes.length} bytes, Max at level ${ecLevel}: ${BYTE_CAPACITY[10][ecLevel]} bytes)`);
  }

  const size = VERSION_SIZE[version];
  const blockInfo = NUM_BLOCKS[version][ecLevel];
  const ecCodewordsPerBlock = EC_CODEWORDS_PER_BLOCK[version][ecLevel];

  // Encode data in byte mode
  const bits: number[] = [];

  // Mode indicator (byte mode = 0100)
  bits.push(0, 1, 0, 0);

  // Character count (8 bits for versions 1-9)
  const charCountBits = version <= 9 ? 8 : 16;
  for (let i = charCountBits - 1; i >= 0; i--) {
    bits.push((dataBytes.length >> i) & 1);
  }

  // Data bytes
  for (const byte of dataBytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }

  // Terminator (0000)
  for (let i = 0; i < 4 && bits.length < blockInfo.k1 * blockInfo.c1 * 8; i++) {
    bits.push(0);
  }

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad bytes (0xEC, 0x11 alternating)
  const totalDataBits = blockInfo.k1 * blockInfo.c1 * 8 +
    (blockInfo.c2 ? blockInfo.k2! * blockInfo.c2 * 8 : 0);
  let padByte = 0;
  while (bits.length < totalDataBits) {
    const pad = padByte % 2 === 0 ? 0xec : 0x11;
    for (let i = 7; i >= 0; i--) {
      bits.push((pad >> i) & 1);
    }
    padByte++;
  }

  // Convert bits to bytes
  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i + j] || 0);
    }
    dataCodewords.push(byte);
  }

  // Split into blocks
  const blocks: number[][] = [];
  let offset = 0;
  for (let i = 0; i < blockInfo.c1; i++) {
    blocks.push(dataCodewords.slice(offset, offset + blockInfo.k1));
    offset += blockInfo.k1;
  }
  if (blockInfo.c2 && blockInfo.k2) {
    for (let i = 0; i < blockInfo.c2; i++) {
      blocks.push(dataCodewords.slice(offset, offset + blockInfo.k2));
      offset += blockInfo.k2;
    }
  }

  // Generate EC codewords for each block
  const ecBlocks: number[][] = blocks.map(block => rsEncode(block, ecCodewordsPerBlock));

  // Interleave data codewords
  const interleavedData: number[] = [];
  const maxDataLen = Math.max(...blocks.map(b => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of blocks) {
      if (i < block.length) {
        interleavedData.push(block[i]);
      }
    }
  }

  // Interleave EC codewords
  for (let i = 0; i < ecCodewordsPerBlock; i++) {
    for (const ecBlock of ecBlocks) {
      interleavedData.push(ecBlock[i]);
    }
  }

  // Convert to bits
  const dataBits: number[] = [];
  for (const byte of interleavedData) {
    for (let i = 7; i >= 0; i--) {
      dataBits.push((byte >> i) & 1);
    }
  }

  // Initialize matrix
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );

  // Place function patterns
  placeFinderPatterns(matrix, size);
  placeTimingPatterns(matrix, size);
  placeAlignmentPatterns(matrix, version);
  reserveFormatAreas(matrix, size);
  placeDarkModule(matrix, version);

  // Place data
  placeDataBits(matrix, dataBits, size);

  // Find best mask
  let bestMask = 0;
  let bestPenalty = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    const masked = applyMask(matrix, mask);
    const boolMatrix = masked.map(row => row.map(v => v === true));
    const penalty = calculatePenalty(boolMatrix);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
    }
  }

  // Apply best mask
  const finalMatrix = applyMask(matrix, bestMask);

  // Write format info
  writeFormatInfo(finalMatrix, ecLevel, bestMask);

  // Convert to boolean matrix
  const result: boolean[][] = finalMatrix.map(row =>
    row.map(v => v === true)
  );

  return { matrix: result, size };
}

/**
 * Options for drawing QR code to canvas.
 */
export interface QRDrawOptions {
  foregroundColor: string;   // hex string
  backgroundColor: string;   // hex string or "transparent"
  padding: number;           // quiet zone in modules
  style: "square" | "rounded" | "dots";
  width: number;             // canvas pixel width
  height: number;            // canvas pixel height
}

/**
 * Draw a QR code matrix to a canvas context.
 *
 * @param result - QRResult from generateQRMatrix
 * @param options - Drawing options
 * @param ctx - Canvas 2D rendering context
 */
export function drawQRToCanvas(
  result: QRResult,
  options: QRDrawOptions,
  ctx: CanvasRenderingContext2D
): void {
  const { matrix, size } = result;
  const { foregroundColor, backgroundColor, padding, style, width, height } = options;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw background
  if (backgroundColor !== "transparent") {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Calculate module size with padding
  const moduleSize = Math.min(width, height) / (size + padding * 2);
  const offsetX = (width - size * moduleSize) / 2;
  const offsetY = (height - size * moduleSize) / 2;

  // Set foreground color
  ctx.fillStyle = foregroundColor;

  // Draw each dark module
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (matrix[row][col]) {
        const x = offsetX + col * moduleSize;
        const y = offsetY + row * moduleSize;

        switch (style) {
          case "dots":
            // Draw circle
            ctx.beginPath();
            ctx.arc(
              x + moduleSize / 2,
              y + moduleSize / 2,
              moduleSize / 2 * 0.85,
              0,
              Math.PI * 2
            );
            ctx.fill();
            break;

          case "rounded":
            // Draw rounded rectangle
            const radius = moduleSize * 0.25;
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + moduleSize - radius, y);
            ctx.quadraticCurveTo(x + moduleSize, y, x + moduleSize, y + radius);
            ctx.lineTo(x + moduleSize, y + moduleSize - radius);
            ctx.quadraticCurveTo(x + moduleSize, y + moduleSize, x + moduleSize - radius, y + moduleSize);
            ctx.lineTo(x + radius, y + moduleSize);
            ctx.quadraticCurveTo(x, y + moduleSize, x, y + moduleSize - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();
            break;

          case "square":
          default:
            // Draw square
            ctx.fillRect(x, y, moduleSize, moduleSize);
            break;
        }
      }
    }
  }
}
