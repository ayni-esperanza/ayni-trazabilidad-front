const sharp = require('sharp');
const potrace = require('potrace');
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '../public/aniayni.png');
const OUTPUT_DIR = path.join(__dirname, '../public');
const COLOR = '#009D45';
const VIEWBOX_W = 259;
const VIEWBOX_H = 169;

const LETTER_REGIONS = [
  { id: 'a', x: 30, y: 53, width: 58, height: 63 },
  { id: 'y', x: 91, y: 53, width: 56, height: 63 },
  { id: 'n', x: 156, y: 53, width: 62, height: 63 },
  { id: 'i', x: 227, y: 53, width: 28, height: 63 }
];

function traceBuffer(buffer, color = COLOR) {
  return new Promise((resolve, reject) => {
    potrace.trace(
      buffer,
      {
        threshold: 128,
        optTolerance: 0.35,
        turdSize: 8,
        turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
        alphaMax: 1,
        optCurve: true,
        color,
        background: 'transparent'
      },
      (err, svg) => {
        if (err) reject(err);
        else resolve(svg);
      }
    );
  });
}

function extractPathData(svgText) {
  const match = svgText.match(/<path[^>]*d="([^"]+)"[^>]*>/i);
  if (!match) {
    throw new Error('No se encontro un path en el SVG generado por potrace.');
  }
  return match[1];
}

function buildCombinedSvg(paths) {
  const letterGroups = paths.letters
    .map(
      (part) =>
        `  <path id="letter-${part.id}" d="${part.d}" fill="${COLOR}" fill-rule="evenodd" transform="translate(${part.x} ${part.y})"/>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_W} ${VIEWBOX_H}" width="${VIEWBOX_W}" height="${VIEWBOX_H}">
  <path id="frame" d="${paths.frame.d}" fill="${COLOR}" fill-rule="evenodd"/>
${letterGroups}
</svg>`;
}

async function toNormalizedBinary(inputPath) {
  return sharp(inputPath)
    .ensureAlpha()
    .resize(VIEWBOX_W, VIEWBOX_H, { fit: 'fill' })
    .extractChannel('alpha')
    .negate()
    .threshold(128)
    .raw()
    .toBuffer({ resolveWithObject: true });
}

function makeLettersMaskSvg() {
  const rects = LETTER_REGIONS.map(
    (r) => `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="white"/>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEWBOX_W}" height="${VIEWBOX_H}" viewBox="0 0 ${VIEWBOX_W} ${VIEWBOX_H}">${rects}</svg>`;
}

function toPngFromRaw(rawData, width, height) {
  return sharp(Buffer.from(rawData), {
    raw: { width, height, channels: 1 }
  })
    .png()
    .toBuffer();
}

function getConnectedComponents(data, width, height) {
  const visited = new Uint8Array(width * height);
  const components = [];
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  const idx = (x, y) => y * width + x;
  const isForeground = (value) => value < 128;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = idx(x, y);
      if (visited[start] || !isForeground(data[start])) {
        continue;
      }

      const queue = [[x, y]];
      visited[start] = 1;

      const pixels = [];
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let sumX = 0;
      let sumY = 0;

      while (queue.length > 0) {
        const [cx, cy] = queue.pop();
        const current = idx(cx, cy);
        pixels.push(current);
        sumX += cx;
        sumY += cy;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (const [dx, dy] of directions) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }

          const nIndex = idx(nx, ny);
          if (!visited[nIndex] && isForeground(data[nIndex])) {
            visited[nIndex] = 1;
            queue.push([nx, ny]);
          }
        }
      }

      components.push({
        pixels,
        area: pixels.length,
        bounds: { minX, maxX, minY, maxY },
        centroid: { x: sumX / pixels.length, y: sumY / pixels.length }
      });
    }
  }

  return components;
}

function overlapWithRegion(component, region, width) {
  let inside = 0;
  for (const pixelIndex of component.pixels) {
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (
      x >= region.x &&
      x < region.x + region.width &&
      y >= region.y &&
      y < region.y + region.height
    ) {
      inside++;
    }
  }
  return inside;
}

function buildComponentMask(width, height, component) {
  const mask = new Uint8Array(width * height);
  mask.fill(255);
  for (const i of component.pixels) {
    mask[i] = 0;
  }
  return mask;
}

function buildComponentMaskClippedToRegion(width, height, component, region) {
  const mask = new Uint8Array(width * height);
  mask.fill(255);

  for (const i of component.pixels) {
    const x = i % width;
    const y = Math.floor(i / width);

    if (
      x >= region.x &&
      x < region.x + region.width &&
      y >= region.y &&
      y < region.y + region.height
    ) {
      mask[i] = 0;
    }
  }

  return mask;
}

async function vectorizeByParts() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`No se encontro la imagen de entrada: ${INPUT_PATH}`);
  }

  console.log('Iniciando vectorizacion letra por letra...');

  const normalizedRaw = await toNormalizedBinary(INPUT_PATH);
  const normalizedBinary = normalizedRaw.data;
  const width = normalizedRaw.info.width;
  const height = normalizedRaw.info.height;

  const normalizedPng = await toPngFromRaw(normalizedBinary, width, height);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'aniayni-normalized-binary.png'), normalizedPng);

  const lettersMaskSvg = makeLettersMaskSvg();
  const frameOnly = await sharp(normalizedPng)
    .composite([{ input: Buffer.from(lettersMaskSvg), blend: 'over' }])
    .png()
    .toBuffer();

  const frameSvg = await traceBuffer(frameOnly);
  const framePath = extractPathData(frameSvg);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'aniayni-frame.svg'), frameSvg);

  const lettersBinary = Uint8Array.from(normalizedBinary);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let inLetterRegion = false;
      for (const region of LETTER_REGIONS) {
        if (
          x >= region.x &&
          x < region.x + region.width &&
          y >= region.y &&
          y < region.y + region.height
        ) {
          inLetterRegion = true;
          break;
        }
      }

      if (!inLetterRegion) {
        lettersBinary[y * width + x] = 255;
      }
    }
  }

  const lettersDebugPng = await toPngFromRaw(lettersBinary, width, height);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'aniayni-letters-binary.png'), lettersDebugPng);

  const components = getConnectedComponents(lettersBinary, width, height)
    .filter((c) => c.area >= 20)
    .sort((a, b) => b.area - a.area);

  if (components.length < 4) {
    throw new Error(`Se esperaban al menos 4 componentes de letras, encontrados: ${components.length}`);
  }

  const letters = [];
  const used = new Set();

  for (const region of LETTER_REGIONS) {
    let bestIndex = -1;
    let bestOverlap = 0;

    for (let i = 0; i < components.length; i++) {
      if (used.has(i)) continue;
      const overlap = overlapWithRegion(components[i], region, width);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestIndex = i;
      }
    }

    if (bestIndex === -1 || bestOverlap === 0) {
      throw new Error(`No se pudo asignar componente para la letra ${region.id.toUpperCase()}`);
    }

    used.add(bestIndex);
    const letterComponent = components[bestIndex];
    const letterMask = buildComponentMaskClippedToRegion(
      width,
      height,
      letterComponent,
      region
    );
    const letterPng = await toPngFromRaw(letterMask, width, height);

    const letterSvg = await traceBuffer(letterPng);
    const letterPath = extractPathData(letterSvg);

    fs.writeFileSync(path.join(OUTPUT_DIR, `aniayni-letter-${region.id}.svg`), letterSvg);

    letters.push({
      id: region.id,
      d: letterPath,
      x: 0,
      y: 0
    });
  }

  const combinedSvg = buildCombinedSvg({
    frame: { d: framePath },
    letters
  });

  const combinedPath = path.join(OUTPUT_DIR, 'aniayni-letters-combined.svg');
  fs.writeFileSync(combinedPath, combinedSvg);

  const resvg = new Resvg(combinedSvg, {
    background: 'rgba(255,255,255,0)',
    fitTo: { mode: 'width', value: 1036 }
  });
  const pngBuffer = resvg.render().asPng();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'aniayni-letters-combined.png'), pngBuffer);

  console.log('Vectorizacion completada. Archivos generados:');
  console.log('- aniayni-frame.svg');
  console.log('- aniayni-letter-a.svg');
  console.log('- aniayni-letter-y.svg');
  console.log('- aniayni-letter-n.svg');
  console.log('- aniayni-letter-i.svg');
  console.log('- aniayni-letters-combined.svg');
  console.log('- aniayni-letters-combined.png');
}

vectorizeByParts().catch((error) => {
  console.error('Error en vectorizacion por partes:', error.message);
  process.exit(1);
});
