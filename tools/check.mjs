// Automated validation in headless Chromium:
//  - loads index.html from disk (offline), records console errors + failed requests
//  - checks slide count, navigation (keys, wheel, click zone, buttons), notes, QR decode
//  - saves a settled 1920×1080 screenshot of every slide to the given folder
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'shots'));
fs.mkdirSync(outDir, { recursive: true });
const exe = process.env.CHROME_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
const external = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
page.on('request', (r) => { const u = r.url(); if (/^https?:/.test(u)) external.push(u); });

await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
await page.waitForFunction(() => window.TC && window.TC.index === 0, null, { timeout: 15000 });

const results = [];
const ok = (name, pass, info = '') => { results.push({ name, pass, info }); };

ok('14 slides', (await page.evaluate(() => document.querySelectorAll('.slide').length)) === 14);
ok('LUMI WebGL mascot initialised', await page.evaluate(() => !document.querySelector('#lumi').classList.contains('no-gl')));

const idx = () => page.evaluate(() => window.TC.index);
const wait = (ms) => page.waitForTimeout(ms);

// keyboard
await page.keyboard.press('ArrowRight'); await wait(400); ok('ArrowRight → 2', (await idx()) === 1);
await page.keyboard.press('Space'); await wait(400); ok('Space → 3', (await idx()) === 2);
await page.keyboard.press('ArrowLeft'); await wait(400); ok('ArrowLeft → 2', (await idx()) === 1);
await page.keyboard.press('PageDown'); await wait(400); ok('PageDown → 3', (await idx()) === 2);
await page.keyboard.press('PageUp'); await wait(400); ok('PageUp → 2', (await idx()) === 1);
await page.keyboard.press('End'); await wait(400); ok('End → 14', (await idx()) === 13);
await page.keyboard.press('Home'); await wait(400); ok('Home → 1', (await idx()) === 0);

// wheel: a trackpad-like momentum burst (events every 16 ms, decaying) must advance exactly one slide.
// Dispatched in-page so timing is real-time even when headless rendering is slow.
const burst = (dir) => page.evaluate((dir) => new Promise((done) => {
  let i = 0;
  const id = setInterval(() => {
    const dy = dir * Math.max(2, 60 * Math.pow(0.93, i));
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true }));
    if (++i >= 70) { clearInterval(id); setTimeout(done, 400); }
  }, 16);
}), dir);
await wait(600);
await burst(1);
ok('wheel momentum burst → exactly +1', (await idx()) === 1, `index=${await idx()}`);
await burst(1);
ok('second wheel gesture → +1 again', (await idx()) === 2, `index=${await idx()}`);
await burst(-1); await burst(-1);
ok('two wheel-up gestures → back to 1', (await idx()) === 0, `index=${await idx()}`);

// click forward zone + arrows
await page.mouse.click(1700, 540); await wait(400); ok('click right zone → 2', (await idx()) === 1);
await page.mouse.click(300, 540); await wait(400); ok('click left area does not navigate', (await idx()) === 1);
await page.click('#prevBtn'); await wait(400); ok('prev arrow → 1', (await idx()) === 0);
await page.click('#nextBtn'); await wait(400); ok('next arrow → 2', (await idx()) === 1);
await page.click('.controls [data-act="next"]'); await wait(400); ok('toolbar next → 3', (await idx()) === 2);

// QR link must not navigate slides when clicked (we only check it is excluded)
await page.evaluate(() => window.TC.go(3)); await wait(300);
ok('QR link excluded from click-nav', await page.evaluate(() => !!document.querySelector('.s4 .qr-box').closest('[data-nonav]')));

// notes
await page.keyboard.press('n'); await wait(700);
const noteText = await page.textContent('#npText');
ok('notes toggle (N) shows slide 4 script', noteText.includes('ข้อมูลที่โรงเรียนควบคุมเอง'), noteText.slice(0, 40));
await page.keyboard.press('n'); await wait(300);
ok('notes hidden by default/after toggle', !(await page.evaluate(() => document.body.classList.contains('notes-open'))));

// notes correspond to slides
const notesMap = await page.evaluate(() => Array.from(document.querySelectorAll('.slide')).map((s) => s.querySelector('.notes')?.textContent.trim().slice(0, 30)));
ok('every slide has speaker notes', notesMap.every(Boolean));

// financial values
const fin = await page.evaluate(() => Array.from(document.querySelectorAll('.s10 [data-count]')).map((e) => e.dataset.count));
ok('financial data exact', JSON.stringify(fin) === JSON.stringify(['19200', '-1200', '37000', '3000', '54800', '7200']), fin.join(','));

// screenshots of each slide, settled
for (let i = 0; i < 14; i++) {
  await page.evaluate((n) => window.TC.go(n), i);
  await wait(i === 0 ? 6500 : i === 13 ? 8000 : 5600);
  await page.screenshot({ path: path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
}

// QR decode from the rendered slide 4
await page.evaluate(() => window.TC.go(3)); await wait(3500);
const qrEl = await page.$('.s4 .qr-box');
const buf = await qrEl.screenshot();
const png = PNG.sync.read(buf);
const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
ok('QR decodes to https://braincospace.com/school', code && code.data === 'https://braincospace.com/school', code ? code.data : 'no decode');

// overflow check: any text box overflowing the 1920×1080 stage on its slide
const overflow = await page.evaluate(async () => {
  const bad = [];
  for (let i = 0; i < 14; i++) {
    window.TC.go(i);
    await new Promise((r) => setTimeout(r, 50));
    const s = document.querySelectorAll('.slide')[i];
    s.querySelectorAll('h1,h2,h3,h4,p,li,td,th,.card,.chip,.cap,.tag,.lbl,.label').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') bad.push(`${i + 1}: ${el.className || el.tagName} (h-scroll)`);
    });
  }
  return bad;
});
ok('no clipped text boxes', overflow.length === 0, overflow.join(' | '));

ok('no console errors / failed requests', errors.length === 0, errors.join(' | '));
ok('no network requests (offline-safe)', external.length === 0, external.join(' | '));

await browser.close();
let fail = 0;
for (const r of results) { console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.info ? `  — ${r.info}` : ''}`); if (!r.pass) fail++; }
console.log(`\n${results.length - fail}/${results.length} checks passed · screenshots → ${outDir}`);
process.exit(fail ? 1 : 0);
