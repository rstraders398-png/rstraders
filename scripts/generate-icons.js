import fs from 'fs';
import zlib from 'zlib';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, getPixel) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // standard filter
  ihdr[12] = 0; // non-interlaced

  const scanlines = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const offset = 1 + x * 4;
      row[offset] = r;
      row[offset + 1] = g;
      row[offset + 2] = b;
      row[offset + 3] = a;
    }
    scanlines.push(row);
  }

  const rawData = Buffer.concat(scanlines);
  const compressed = zlib.deflateSync(rawData);

  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, makeChunk('IHDR', ihdr), idat, iend]);
}

// Draw a modern ERP + Cheque Management icon
function iconRenderer(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Rounded rectangle check for icon corners
  const radius = 0.22;
  const dx = Math.max(0, Math.max(radius - nx, nx - (1 - radius)));
  const dy = Math.max(0, Math.max(radius - ny, ny - (1 - radius)));
  if (dx * dx + dy * dy > radius * radius) {
    return [0, 0, 0, 0]; // transparent outside rounded rect
  }

  // Deep Slate / Navy background gradient
  let r = Math.round(15 + ny * 20);
  let g = Math.round(23 + ny * 30);
  let b = Math.round(42 + ny * 45);

  // Outer border
  if (nx < 0.02 || nx > 0.98 || ny < 0.02 || ny > 0.98) {
    return [59, 130, 246, 255]; // Blue accent border
  }

  // Header band (0.12 to 0.26)
  if (ny >= 0.12 && ny <= 0.26 && nx >= 0.12 && nx <= 0.88) {
    return [37, 99, 235, 255]; // Royal Blue ERP banner
  }

  // Cheque card body (0.34 to 0.78, 0.14 to 0.86)
  if (ny >= 0.34 && ny <= 0.78 && nx >= 0.14 && nx <= 0.86) {
    // Card border
    if (
      nx <= 0.16 ||
      nx >= 0.84 ||
      ny <= 0.36 ||
      ny >= 0.76
    ) {
      return [16, 185, 129, 255]; // Emerald border
    }
    
    // Cheque Rupee badge (0.50 to 0.70, 0.52 to 0.80)
    if (ny >= 0.50 && ny <= 0.70 && nx >= 0.52 && nx <= 0.80) {
      return [5, 150, 105, 255]; // Emerald amount container
    }

    // Shield / Seal (center left: nx ~ 0.32, ny ~ 0.56)
    const distShield = Math.hypot(nx - 0.32, ny - 0.56);
    if (distShield < 0.10) {
      return [245, 158, 11, 255]; // Golden security seal
    }

    // Cheque writing lines
    if ((ny >= 0.42 && ny <= 0.44 && nx >= 0.20 && nx <= 0.80) ||
        (ny >= 0.48 && ny <= 0.50 && nx >= 0.48 && nx <= 0.80)) {
      return [100, 116, 139, 255]; // Slate line
    }

    return [30, 41, 59, 255]; // Dark inner card
  }

  return [r, g, b, 255];
}

fs.writeFileSync('public/icon-192.png', createPng(192, 192, iconRenderer));
fs.writeFileSync('public/icon-512.png', createPng(512, 512, iconRenderer));
fs.writeFileSync('public/icon-maskable-512.png', createPng(512, 512, (x, y, w, h) => {
  // Maskable: padded safe zone with full bleed background
  const nx = x / w;
  const ny = y / h;
  if (nx < 0.1 || nx > 0.9 || ny < 0.1 || ny > 0.9) {
    return [15, 23, 42, 255]; // Full bleed dark navy
  }
  const innerX = (nx - 0.1) / 0.8 * w;
  const innerY = (ny - 0.1) / 0.8 * h;
  return iconRenderer(innerX, innerY, w, h);
}));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180, iconRenderer));
fs.writeFileSync('public/favicon.ico', createPng(48, 48, iconRenderer));

console.log('Successfully generated all PWA icons!');
