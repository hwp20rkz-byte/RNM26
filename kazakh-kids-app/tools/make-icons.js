// Renders android/icon.svg into launcher PNGs for every density.
// Usage: node tools/make-icons.js   (needs Playwright + Chromium)
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'android/icon.svg'), 'utf8');
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [dpi, px] of Object.entries(sizes)) {
    await page.setViewportSize({ width: px, height: px });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${px}" height="${px}" `)}</body></html>`);
    const dir = path.join(root, `android/res/mipmap-${dpi}`);
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, 'ic_launcher.png'), omitBackground: true });
  }
  await page.setViewportSize({ width: 512, height: 512 });
  await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', '<svg width="512" height="512" ')}</body></html>`);
  await page.screenshot({ path: path.join(root, 'android/icon-512.png'), omitBackground: true });
  await browser.close();
  console.log('icons written');
})();
