import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const PALETTE = {
  bg0: [17, 15, 12],
  bg1: [68, 49, 28],
  bg2: [111, 78, 40],
  border: [169, 141, 99],
  accent0: [247, 213, 138],
  accent1: [200, 153, 71],
  accent2: [143, 190, 100],
  panel: [22, 17, 13],
  panelEdge: [92, 72, 44],
  shadow: [9, 7, 5],
};
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(a, b, t) {
  return [
    mix(a[0], b[0], t),
    mix(a[1], b[1], t),
    mix(a[2], b[2], t),
    255,
  ];
}

function rgba(r, g, b, a = 255) {
  return [r, g, b, a];
}

function createCanvas(size) {
  return {
    width: size,
    height: size,
    data: new Uint8ClampedArray(size * size * 4),
  };
}

function blendPixel(canvas, x, y, color) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;

  const index = (y * canvas.width + x) * 4;
  const srcA = clamp((color[3] ?? 255) / 255, 0, 1);
  if (srcA <= 0) return;

  const dstA = canvas.data[index + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  const srcR = color[0] / 255;
  const srcG = color[1] / 255;
  const srcB = color[2] / 255;
  const dstR = canvas.data[index] / 255;
  const dstG = canvas.data[index + 1] / 255;
  const dstB = canvas.data[index + 2] / 255;

  const outR = (srcR * srcA + dstR * dstA * (1 - srcA)) / outA;
  const outG = (srcG * srcA + dstG * dstA * (1 - srcA)) / outA;
  const outB = (srcB * srcA + dstB * dstA * (1 - srcA)) / outA;

  canvas.data[index] = Math.round(clamp(outR, 0, 1) * 255);
  canvas.data[index + 1] = Math.round(clamp(outG, 0, 1) * 255);
  canvas.data[index + 2] = Math.round(clamp(outB, 0, 1) * 255);
  canvas.data[index + 3] = Math.round(clamp(outA, 0, 1) * 255);
}

function insideRoundedRect(px, py, x, y, width, height, radius) {
  const cx = clamp(px, x + radius, x + width - radius);
  const cy = clamp(py, y + radius, y + height - radius);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function fillRoundedRect(canvas, x, y, width, height, radius, shader) {
  const minX = Math.floor(x);
  const maxX = Math.ceil(x + width);
  const minY = Math.floor(y);
  const maxY = Math.ceil(y + height);

  for (let py = minY; py < maxY; py += 1) {
    for (let px = minX; px < maxX; px += 1) {
      if (!insideRoundedRect(px + 0.5, py + 0.5, x, y, width, height, radius)) continue;
      blendPixel(canvas, px, py, shader(px + 0.5, py + 0.5));
    }
  }
}

function fillCircle(canvas, cx, cy, radius, shader) {
  const minX = Math.floor(cx - radius);
  const maxX = Math.ceil(cx + radius);
  const minY = Math.floor(cy - radius);
  const maxY = Math.ceil(cy + radius);
  const rr = radius * radius;

  for (let py = minY; py < maxY; py += 1) {
    for (let px = minX; px < maxX; px += 1) {
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      if (dx * dx + dy * dy > rr) continue;
      blendPixel(canvas, px, py, shader(px + 0.5, py + 0.5, dx, dy));
    }
  }
}

function fillEllipse(canvas, cx, cy, rx, ry, shader) {
  const minX = Math.floor(cx - rx);
  const maxX = Math.ceil(cx + rx);
  const minY = Math.floor(cy - ry);
  const maxY = Math.ceil(cy + ry);

  for (let py = minY; py < maxY; py += 1) {
    for (let px = minX; px < maxX; px += 1) {
      const dx = (px + 0.5 - cx) / rx;
      const dy = (py + 0.5 - cy) / ry;
      const distance = dx * dx + dy * dy;
      if (distance > 1) continue;
      blendPixel(canvas, px, py, shader(px + 0.5, py + 0.5, distance));
    }
  }
}

function pointInPolygon(px, py, points) {
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersects = ((yi > py) !== (yj > py))
      && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);

    if (intersects) inside = !inside;
  }

  return inside;
}

function fillPolygon(canvas, points, shader) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  for (let py = Math.floor(minY); py < Math.ceil(maxY); py += 1) {
    for (let px = Math.floor(minX); px < Math.ceil(maxX); px += 1) {
      if (!pointInPolygon(px + 0.5, py + 0.5, points)) continue;
      blendPixel(canvas, px, py, shader(px + 0.5, py + 0.5));
    }
  }
}

function downsample(canvas, targetSize) {
  const factor = canvas.width / targetSize;
  if (!Number.isInteger(factor)) {
    throw new Error(`Cannot downsample ${canvas.width} to ${targetSize}`);
  }

  const next = createCanvas(targetSize);

  for (let y = 0; y < targetSize; y += 1) {
    for (let x = 0; x < targetSize; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let oy = 0; oy < factor; oy += 1) {
        for (let ox = 0; ox < factor; ox += 1) {
          const sx = x * factor + ox;
          const sy = y * factor + oy;
          const index = (sy * canvas.width + sx) * 4;
          r += canvas.data[index];
          g += canvas.data[index + 1];
          b += canvas.data[index + 2];
          a += canvas.data[index + 3];
        }
      }

      const samples = factor * factor;
      const index = (y * targetSize + x) * 4;
      next.data[index] = Math.round(r / samples);
      next.data[index + 1] = Math.round(g / samples);
      next.data[index + 2] = Math.round(b / samples);
      next.data[index + 3] = Math.round(a / samples);
    }
  }

  return next;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[index] = crc >>> 0;
  }

  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;

  for (let index = 0; index < buffer.length; index += 1) {
    crc = CRC32_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function encodePng(canvas) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvas.width, 0);
  ihdr.writeUInt32BE(canvas.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((canvas.width * 4 + 1) * canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    const rowStart = y * (canvas.width * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < canvas.width; x += 1) {
      const src = (y * canvas.width + x) * 4;
      const dst = rowStart + 1 + x * 4;
      raw[dst] = canvas.data[src];
      raw[dst + 1] = canvas.data[src + 1];
      raw[dst + 2] = canvas.data[src + 2];
      raw[dst + 3] = canvas.data[src + 3];
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    header,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodeIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

function readPngDimensions(buffer, fileLabel = "favicon.png") {
  const PNG_SIGNATURE = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) {
    throw new Error(`Custom ${fileLabel} must be a valid PNG.`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function drawMinibotIcon(size = 2048) {
  const canvas = createCanvas(size);
  const pad = size * 0.08;
  const bodySize = size - pad * 2;
  const radius = size * 0.22;
  const inset = size * 0.024;

  fillRoundedRect(canvas, pad, pad, bodySize, bodySize, radius, (px, py) => {
    const nx = (px - pad) / bodySize;
    const ny = (py - pad) / bodySize;
    const diagonal = clamp((nx * 0.62 + ny * 0.92), 0, 1);
    const base = mixColor(PALETTE.bg0, PALETTE.bg1, diagonal);
    const highlightDx = nx - 0.24;
    const highlightDy = ny - 0.16;
    const emberDx = nx - 0.72;
    const emberDy = ny - 0.78;
    const highlight = Math.exp(-((highlightDx ** 2 + highlightDy ** 2) / 0.06));
    const ember = Math.exp(-((emberDx ** 2 + emberDy ** 2) / 0.11));
    const vignette = clamp(((nx - 0.5) ** 2 + (ny - 0.52) ** 2) / 0.42, 0, 1);

    return rgba(
      clamp(base[0] + PALETTE.accent0[0] * highlight * 0.52 + PALETTE.bg2[0] * ember * 0.24 - vignette * 18, 0, 255),
      clamp(base[1] + PALETTE.accent0[1] * highlight * 0.34 + PALETTE.bg2[1] * ember * 0.18 - vignette * 16, 0, 255),
      clamp(base[2] + PALETTE.accent0[2] * highlight * 0.12 + PALETTE.bg2[2] * ember * 0.08 - vignette * 14, 0, 255),
      255,
    );
  });

  fillRoundedRect(canvas, pad, pad, bodySize, bodySize, radius, (px, py) => {
    if (insideRoundedRect(px, py, pad + inset, pad + inset, bodySize - inset * 2, bodySize - inset * 2, radius - inset)) {
      return rgba(0, 0, 0, 0);
    }

    const ny = (py - pad) / bodySize;
    const topGlow = Math.max(0, 1 - ny * 2.2);
    return rgba(
      mix(PALETTE.border[0], PALETTE.accent0[0], topGlow * 0.22),
      mix(PALETTE.border[1], PALETTE.accent0[1], topGlow * 0.22),
      mix(PALETTE.border[2], PALETTE.accent0[2], topGlow * 0.12),
      222,
    );
  });

  fillEllipse(canvas, size * 0.5, size * 0.73, size * 0.26, size * 0.11, (_px, _py, distance) => {
    const alpha = clamp((1 - distance) * 115, 0, 115);
    return rgba(PALETTE.shadow[0], PALETTE.shadow[1], PALETTE.shadow[2], alpha);
  });

  fillRoundedRect(canvas, size * 0.474, size * 0.17, size * 0.052, size * 0.12, size * 0.026, () => rgba(104, 82, 49, 255));
  fillRoundedRect(canvas, size * 0.484, size * 0.182, size * 0.032, size * 0.096, size * 0.016, () => rgba(208, 164, 82, 255));

  fillCircle(canvas, size * 0.5, size * 0.13, size * 0.05, (_px, _py, dx, dy) => {
    const distance = Math.sqrt(dx * dx + dy * dy) / (size * 0.05);
    const glow = Math.max(0, 1 - distance);
    return rgba(
      mix(PALETTE.accent1[0], PALETTE.accent0[0], glow * 0.85),
      mix(PALETTE.accent1[1], PALETTE.accent0[1], glow * 0.85),
      mix(PALETTE.accent1[2], PALETTE.accent0[2], glow * 0.7),
      255,
    );
  });

  const mPoints = [
    [0.18, 0.78],
    [0.18, 0.29],
    [0.315, 0.29],
    [0.405, 0.485],
    [0.5, 0.355],
    [0.595, 0.485],
    [0.685, 0.29],
    [0.82, 0.29],
    [0.82, 0.78],
    [0.675, 0.78],
    [0.675, 0.5],
    [0.545, 0.675],
    [0.455, 0.675],
    [0.325, 0.5],
    [0.325, 0.78],
  ].map(([x, y]) => [x * size, y * size]);

  const shadowPoints = mPoints.map(([x, y]) => [x + size * 0.012, y + size * 0.018]);
  fillPolygon(canvas, shadowPoints, () => rgba(8, 6, 4, 132));

  fillPolygon(canvas, mPoints, (_px, py) => {
    const t = clamp((py / size - 0.29) / 0.49, 0, 1);
    const base = mixColor(PALETTE.accent0, PALETTE.accent1, t);
    return rgba(base[0], base[1], base[2], 255);
  });

  fillRoundedRect(canvas, size * 0.298, size * 0.342, size * 0.404, size * 0.156, size * 0.078, (_px, py) => {
    const t = clamp((py / size - 0.342) / 0.156, 0, 1);
    return rgba(
      mix(PALETTE.panel[0], PALETTE.panelEdge[0], 1 - t * 0.3),
      mix(PALETTE.panel[1], PALETTE.panelEdge[1], 1 - t * 0.26),
      mix(PALETTE.panel[2], PALETTE.panelEdge[2], 1 - t * 0.22),
      242,
    );
  });

  fillRoundedRect(canvas, size * 0.31, size * 0.354, size * 0.38, size * 0.132, size * 0.064, (_px, py) => {
    const t = clamp((py / size - 0.354) / 0.132, 0, 1);
    return rgba(
      mix(28, 15, t),
      mix(21, 11, t),
      mix(17, 8, t),
      255,
    );
  });

  const eyeSpecs = [
    { x: 0.365, y: 0.397, width: 0.088 },
    { x: 0.547, y: 0.397, width: 0.088 },
  ];

  for (const eye of eyeSpecs) {
    fillRoundedRect(
      canvas,
      size * (eye.x - 0.014),
      size * (eye.y - 0.016),
      size * (eye.width + 0.028),
      size * 0.085,
      size * 0.038,
      (px, py) => {
        const nx = (px / size - eye.x) / eye.width;
        const ny = (py / size - eye.y) / 0.053;
        const glow = Math.max(0, 1 - (nx * nx + ny * ny));
        return rgba(247, 213, 138, 140 * glow);
      },
    );

    fillRoundedRect(
      canvas,
      size * eye.x,
      size * eye.y,
      size * eye.width,
      size * 0.053,
      size * 0.024,
      (px, py) => {
        const nx = (px / size - eye.x) / eye.width;
        const ny = (py / size - eye.y) / 0.053;
        const glow = Math.max(0, 1 - (nx * nx * 1.2 + ny * ny * 1.7));
        const accent = mixColor(PALETTE.accent1, PALETTE.accent0, glow * 0.95);
        return rgba(accent[0], accent[1], accent[2], 255);
      },
    );
  }

  fillRoundedRect(canvas, size * 0.405, size * 0.57, size * 0.19, size * 0.034, size * 0.017, () => rgba(PALETTE.accent2[0], PALETTE.accent2[1], PALETTE.accent2[2], 210));

  return canvas;
}

function writeFile(relativePath, buffer) {
  const targetPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, buffer);
}

function buildBrandAssets({
  master,
  customFaviconPath = "",
} = {}) {
  const icon512 = downsample(master, 512);
  const icon256 = downsample(master, 256);
  const favicon64 = downsample(master, 64);

  let iconPng = encodePng(icon512);
  let icon256Png = encodePng(icon256);
  let faviconPng = encodePng(favicon64);
  let iconIco = encodeIco(icon256Png, 256);

  if (customFaviconPath && fs.existsSync(customFaviconPath)) {
    const customPng = fs.readFileSync(customFaviconPath);
    const customFileLabel = path.basename(customFaviconPath);
    const { width, height } = readPngDimensions(customPng, customFileLabel);
    if (width !== height) {
      throw new Error(`Custom ${customFileLabel} must be square.`);
    }

    faviconPng = customPng;
    if (width >= 256) {
      iconPng = customPng;
      icon256Png = customPng;
      iconIco = encodeIco(customPng, width);
    }
  }

  return {
    iconPng,
    iconIco,
    faviconPng,
  };
}

function main() {
  const minibotAssets = buildBrandAssets({
    master: drawMinibotIcon(2048),
    customFaviconPath: path.join(projectRoot, "favicon.png"),
  });

  writeFile("desktop/assets/icon.png", minibotAssets.iconPng);
  writeFile("desktop/assets/icon.ico", minibotAssets.iconIco);
  writeFile("desktop/assets/favicon.png", minibotAssets.faviconPng);
}

main();
