// Generate PNG icons for tray (16x16) and app (256x256)
const fs = require('fs');
const path = require('path');
const { deflateSync } = require('zlib');

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([len, typeB, data, crcVal]);
}

function generatePNG(size) {
  const rawData = Buffer.alloc((size * 4 + 1) * size);
  const r = 0.15 * size; // corner radius

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    rawData[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const i = rowStart + 1 + x * 4;

      // Check if pixel is in rounded rectangle
      let inShape = true;
      if (x < r && y < r && Math.sqrt((r-x)*(r-x) + (r-y)*(r-y)) > r) inShape = false;
      if (x >= size - r && y < r && Math.sqrt((x-(size-r-1))*(x-(size-r-1)) + (r-y)*(r-y)) > r) inShape = false;
      if (x < r && y >= size - r && Math.sqrt((r-x)*(r-x) + (y-(size-r-1))*(y-(size-r-1))) > r) inShape = false;
      if (x >= size - r && y >= size - r && Math.sqrt((x-(size-r-1))*(x-(size-r-1)) + (y-(size-r-1))*(y-(size-r-1))) > r) inShape = false;

      if (inShape) {
        // Light blue background (#64B5F6)
        rawData[i] = 100;
        rawData[i + 1] = 181;
        rawData[i + 2] = 246;
        rawData[i + 3] = 255;

        // Draw a simple clipboard shape (white rectangle inside)
        const margin = Math.floor(size * 0.2);
        const innerM = Math.floor(size * 0.3);
        if (x >= innerM && x < size - innerM && y >= margin && y < size - margin) {
          rawData[i] = 255;
          rawData[i + 1] = 255;
          rawData[i + 2] = 255;
          rawData[i + 3] = 255;
        }
        // Top bar (clipboard clip)
        if (x >= margin && x < size - margin && y >= Math.floor(size * 0.13) && y < Math.floor(size * 0.22)) {
          rawData[i] = 200;
          rawData[i + 1] = 220;
          rawData[i + 2] = 240;
          rawData[i + 3] = 255;
        }
      } else {
        rawData[i] = 0;
        rawData[i + 1] = 0;
        rawData[i + 2] = 0;
        rawData[i + 3] = 0; // transparent
      }
    }
  }

  const compressed = deflateSync(rawData);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const assetsDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

// Generate 16x16 tray icon
const trayIcon = generatePNG(16);
fs.writeFileSync(path.join(assetsDir, 'tray-icon.png'), trayIcon);
console.log('Tray icon (16x16):', trayIcon.length, 'bytes');

// Generate 256x256 app icon
const appIcon = generatePNG(256);
fs.writeFileSync(path.join(assetsDir, 'app-icon.png'), appIcon);
console.log('App icon (256x256):', appIcon.length, 'bytes');
