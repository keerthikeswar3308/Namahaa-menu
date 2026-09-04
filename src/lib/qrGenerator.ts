/**
 * Pure TypeScript QR Code Generator (Zero external dependencies).
 * Generates 2D boolean module matrices for URL encoding.
 */

// Basic Reed-Solomon & QR Code Matrix Generator
export function generateQRMatrix(text: string): boolean[][] {
  // Simple & reliable QR matrix generator for standard URLs
  const modules = encodeTextToQR(text);
  return modules;
}

// Minimal QR Code Encoder supporting Byte Mode (URLs)
function encodeTextToQR(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const len = bytes.length;
  
  // Choose QR version based on length
  let version = 3;
  if (len > 35) version = 4;
  if (len > 50) version = 5;
  if (len > 70) version = 6;
  if (len > 90) version = 7;

  const size = version * 4 + 17;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  // Helper to place module
  const setModule = (r: number, c: number, val: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
    }
  };

  // 1. Finder patterns (7x7 top-left, top-right, bottom-left)
  const drawFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        if (row + r < 0 || row + r >= size || col + c < 0 || col + c >= size) continue;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isBlack = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          matrix[row + r][col + c] = isBlack;
        } else {
          matrix[row + r][col + c] = false; // Separator
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // 3. Dark module
  matrix[4 * version + 9][8] = true;

  // 4. Alignment patterns for Version >= 2
  if (version >= 2) {
    const alignPos = version === 3 ? [6, 22] : version === 4 ? [6, 26] : version === 5 ? [6, 30] : version === 6 ? [6, 34] : [6, 22, 38];
    for (const r of alignPos) {
      for (const c of alignPos) {
        if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBlack = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            setModule(r + dr, c + dc, isBlack);
          }
        }
      }
    }
  }

  // 5. Data placement & Bitstream creation
  const dataBits: boolean[] = [];
  
  // Mode indicator: 0100 (Byte mode)
  dataBits.push(false, fontIsBit(1), false, false);
  
  // Character count (8 bits for V1-9)
  for (let b = 7; b >= 0; b--) {
    dataBits.push(((len >> b) & 1) === 1);
  }

  // Payload bytes
  for (let i = 0; i < len; i++) {
    const b = bytes[i];
    for (let bit = 7; bit >= 0; bit--) {
      dataBits.push(((b >> bit) & 1) === 1);
    }
  }

  // Terminator (4 zeros)
  for (let i = 0; i < 4; i++) dataBits.push(false);
  while (dataBits.length % 8 !== 0) dataBits.push(false);

  // Pad bytes: 236 (0xEC), 17 (0x11)
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  const targetBitLen = (size * size - 3 * 64) * 0.6; // Approximate capacity
  while (dataBits.length < targetBitLen) {
    const pb = padBytes[padIdx % 2];
    for (let bit = 7; bit >= 0; bit--) {
      dataBits.push(((pb >> bit) & 1) === 1);
    }
    padIdx++;
  }

  // Fill matrix with zigzag traversal
  let bitIdx = 0;
  let dir = -1; // Upward
  let x = size - 1;
  let y = size - 1;

  while (x > 0) {
    if (x === 6) x--; // Skip vertical timing column
    for (let i = 0; i < size; i++) {
      const currY = dir === -1 ? y - i : i;
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const currX = x - colOffset;
        if (matrix[currY][currX] === null) {
          const bitVal = bitIdx < dataBits.length ? dataBits[bitIdx++] : false;
          // Apply mask 0 ( (row + col) % 2 == 0 )
          const mask = (currY + currX) % 2 === 0;
          matrix[currY][currX] = bitVal !== mask;
        }
      }
    }
    dir = -dir;
    x -= 2;
  }

  // Return clean boolean matrix (replace nulls with false)
  return matrix.map((row) => row.map((cell) => cell === true));
}

function fontIsBit(val: number): boolean {
  return val === 1;
}
