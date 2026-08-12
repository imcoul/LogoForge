/**
 * Generates the PWA icons referenced by the manifest in vite.config.ts.
 *
 * The manifest declared /icon-192.png and /icon-512.png but neither file existed, so the app
 * was not actually installable. Icons are generated rather than committed as opaque binaries
 * so the mark can be adjusted in one place and regenerated.
 *
 * Colours come from the brand tokens in src/index.css:
 *   --color-brand-lead    #800080  (purple)
 *   --color-brand-service #40e0d0  (turquoise)
 *
 * Usage: node scripts/generateIcons.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public');
mkdirSync(outDir, { recursive: true });

const PURPLE = '#800080';
const TURQUOISE = '#40e0d0';

/**
 * The mark: a stylised anvil/forge form in turquoise on a purple field.
 *
 * `inset` reserves the maskable safe area. Android may crop a maskable icon to a circle,
 * clipping roughly the outer 10% on each edge, so the artwork is drawn inside the middle 80%.
 */
function markSvg(size, { maskable = false } = {}) {
  const inset = maskable ? size * 0.1 : 0;
  const s = size - inset * 2;
  const u = s / 100; // 100-unit design grid
  const x = (n) => inset + n * u;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${PURPLE}"${maskable ? '' : ` rx="${size * 0.22}"`}/>
  <g fill="none" stroke="${TURQUOISE}" stroke-width="${9 * u}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M ${x(26)},${x(30)} L ${x(74)},${x(30)}"/>
    <path d="M ${x(26)},${x(30)} L ${x(26)},${x(72)}"/>
    <path d="M ${x(26)},${x(50)} L ${x(60)},${x(50)}"/>
  </g>
  <circle cx="${x(72)}" cy="${x(66)}" r="${7 * u}" fill="${TURQUOISE}"/>
</svg>`;
}

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-512-maskable.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const { file, size, maskable } of targets) {
  await sharp(Buffer.from(markSvg(size, { maskable })))
    .png({ compressionLevel: 9 })
    .toFile(resolve(outDir, file));
  console.log(`wrote public/${file} (${size}x${size}${maskable ? ', maskable' : ''})`);
}
