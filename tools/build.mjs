// Builds the self-contained index.html from src/:
//  - inlines Thai + Latin fonts (base64 woff2) so nothing loads from the network
//  - bundles the Three.js LUMI mascot into an inline script
//  - renders a real, scannable QR code (SVG) for the demo URL
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import QRCode from 'qrcode';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fs_ = (p) => path.join(root, p);
const DEMO_URL = 'https://braincospace.com/school';

function fontCss(pkg, weights, subsets) {
  const dir = fs_(`node_modules/@fontsource/${pkg}`);
  let out = '';
  for (const w of weights) {
    const css = fs.readFileSync(path.join(dir, `${w}.css`), 'utf8');
    for (const block of css.split('/*').slice(1)) {
      const name = block.slice(0, block.indexOf('*/')).trim();
      if (!subsets.some((s) => name.endsWith(`-${s}-${w}-normal`))) continue;
      let face = block.slice(block.indexOf('@font-face'));
      face = face.replace(/src:[^;]+;/, (m) => {
        const file = m.match(/url\(\.\/files\/([^)]+\.woff2)\)/)[1];
        const b64 = fs.readFileSync(path.join(dir, 'files', file)).toString('base64');
        return `src: url(data:font/woff2;base64,${b64}) format('woff2');`;
      }).replace('font-display: swap', 'font-display: block');
      out += face.trim() + '\n';
    }
  }
  return out;
}

const fonts =
  fontCss('ibm-plex-sans-thai', [300, 400, 500, 600, 700], ['thai', 'latin']) +
  fontCss('space-grotesk', [300, 400, 500, 600, 700], ['latin']);

const bundle = await build({
  entryPoints: [fs_('src/mascot.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  write: false,
  target: ['chrome100', 'firefox100', 'safari15'],
  legalComments: 'none',
});
const mascotJs = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const qrSvg = (await QRCode.toString(DEMO_URL, {
  type: 'svg', errorCorrectionLevel: 'M', margin: 2,
  color: { dark: '#07111F', light: '#FFFFFF' },
})).replace('<svg ', `<svg role="img" aria-label="QR code: ${DEMO_URL}" `);

let html = fs.readFileSync(fs_('src/index.src.html'), 'utf8');
const swap = (token, value) => {
  if (!html.includes(token)) throw new Error(`missing token ${token}`);
  html = html.split(token).join(value);
};
swap('/*@@FONTS@@*/', fonts);
swap('/*@@CSS@@*/', fs.readFileSync(fs_('src/styles.css'), 'utf8'));
swap('/*@@APP@@*/', fs.readFileSync(fs_('src/app.js'), 'utf8'));
swap('/*@@MASCOT@@*/', mascotJs);
swap('<!--@@QR@@-->', qrSvg);

fs.writeFileSync(fs_('index.html'), html);
console.log(`index.html written: ${(html.length / 1024).toFixed(0)} KB`);
