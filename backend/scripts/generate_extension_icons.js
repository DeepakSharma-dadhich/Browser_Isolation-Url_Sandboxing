"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// CRC32 implementation for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateShieldPng(size, destPath) {
  const width = size;
  const height = size;
  const scanlines = [];

  // Cyan-blue gradient cyber shield colors
  for (let y = 0; y < height; y++) {
    scanlines.push(0); // filter byte: none
    for (let x = 0; x < width; x++) {
      // Normalize coords to [-1, 1]
      const nx = (x / width) * 2 - 1;
      const ny = (y / height) * 2 - 1;

      // Shield shape: curved top, pointed bottom
      const inShield =
        Math.abs(nx) <= 0.85 &&
        ny >= -0.85 &&
        (ny <= 0 || Math.abs(nx) <= 0.85 * (1 - (ny * ny * 0.9)));

      if (inShield) {
        // Cyan gradient with dark navy core
        const r = 0;
        const g = Math.floor(180 + 75 * (1 - Math.abs(nx)));
        const b = 255;
        const a = 255;
        scanlines.push(r, g, b, a);
      } else {
        scanlines.push(0, 0, 0, 0); // transparent background
      }
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = createChunk("IHDR", ihdr);

  const compressedData = zlib.deflateSync(Buffer.from(scanlines));
  const idatChunk = createChunk("IDAT", compressedData);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, png);
  console.log(`Generated icon: ${destPath} (${size}x${size})`);
}

const iconsDir = path.resolve(__dirname, "../../extension/icons");
generateShieldPng(16, path.join(iconsDir, "icon16.png"));
generateShieldPng(48, path.join(iconsDir, "icon48.png"));
generateShieldPng(128, path.join(iconsDir, "icon128.png"));
