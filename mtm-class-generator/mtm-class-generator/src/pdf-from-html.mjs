import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

function detectChromiumExecutable() {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) return process.env.CHROMIUM_PATH;
  const candidates = ['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome','/usr/bin/google-chrome-stable'];
  return candidates.find(p => existsSync(p)) || undefined;
}

const [htmlPath, pdfPath] = process.argv.slice(2);
if (!htmlPath || !pdfPath) {
  console.error('Uso: node src/pdf-from-html.mjs output/Dm.html output/Dm.pdf');
  process.exit(1);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: detectChromiumExecutable(),
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
try {
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
  const html = await fs.readFile(htmlPath, 'utf8');
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await page.close();
} finally {
  await browser.close().catch(() => {});
}
