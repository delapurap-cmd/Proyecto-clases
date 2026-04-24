import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { existsSync, createReadStream } from 'node:fs';
import http from 'node:http';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, '..');

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}



function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf'
  }[ext] || 'application/octet-stream';
}

async function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const rel = decodeURIComponent(url.pathname.replace(/^\/+/, '')) || 'index.html';
      const filePath = path.resolve(rootDir, rel);
      if (!filePath.startsWith(rootDir) || !existsSync(filePath)) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'content-type': contentType(filePath) });
      createReadStream(filePath).pipe(res);
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(String(e?.message || e));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

function detectChromiumExecutable() {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) return process.env.CHROMIUM_PATH;
  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ];
  return candidates.find(p => existsSync(p)) || undefined;
}

async function clickIfPresent(page, selector) {
  if (!selector) return;
  const loc = page.locator(selector).first();
  if (await loc.count()) await loc.click({ timeout: 2500 }).catch(() => {});
}


async function forceCloseBrowser(browser) {
  try {
    const proc = typeof browser.process === 'function' ? browser.process() : null;
    if (proc && !proc.killed) {
      proc.kill('SIGKILL');
      return;
    }
  } catch (_) {}
  try {
    await Promise.race([
      browser.close(),
      new Promise(resolve => setTimeout(resolve, 1500))
    ]);
  } catch (_) {}
}

async function captureTarget({ page, targetName, cfg, outPath }) {
  await clickIfPresent(page, cfg.preclick);
  await page.waitForTimeout(cfg.waitMs || 500);

  let locator;
  if (cfg.frame) {
    const frameElement = page.locator(cfg.frame).first();
    await frameElement.waitFor({ timeout: 8000 });
    const frame = await frameElement.contentFrame();
    if (!frame) throw new Error(`No pude leer el iframe para ${targetName}: ${cfg.frame}`);
    locator = frame.locator(cfg.selector).first();
    if (!(await locator.count()) && cfg.fallbackSelector) locator = frame.locator(cfg.fallbackSelector).first();
  } else {
    locator = page.locator(cfg.selector).first();
    if (!(await locator.count()) && cfg.fallbackSelector) locator = page.locator(cfg.fallbackSelector).first();
  }

  await locator.waitFor({ timeout: 8000 });
  await locator.screenshot({ path: outPath, animations: 'disabled' });
}

async function buildLessonHtml({ data, captures, outHtml }) {
  const cards = (await Promise.all(captures.map(async c => {
    const b64 = await fs.readFile(c.path, 'base64');
    return `
    <section class="card ${c.name}">
      <h2>${c.label}</h2>
      <img src="data:image/png;base64,${b64}" alt="${c.label} - ${data.symbol}">
    </section>`;
  }))).join('\n');

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${data.symbol} - More Than Modes</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;900&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
<style>
  :root{--bg:#0a0a0a;--panel:#121212;--gold:#C9A84C;--gold2:#E8C97A;--text:#F5F0E8;--muted:#9a9488;}
  @page{size:A4;margin:0}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);font-family:Lato,sans-serif;}
  .page{width:210mm;min-height:297mm;padding:16mm 14mm;background:radial-gradient(circle at top,rgba(201,168,76,.13),transparent 34%),#0a0a0a;}
  header{border-bottom:1px solid rgba(201,168,76,.35);padding-bottom:8mm;margin-bottom:8mm;}
  .brand{font-family:Cinzel,serif;font-weight:900;letter-spacing:4px;color:var(--gold);font-size:12px;text-transform:uppercase;}
  h1{font-family:Cinzel,serif;font-size:34px;line-height:1;margin:8px 0 8px;color:var(--gold2);}
  .summary{font-size:13px;color:var(--muted);letter-spacing:.3px;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:7mm;align-items:start;}
  .card{background:linear-gradient(180deg,#141414,#090909);border:1px solid rgba(201,168,76,.28);border-radius:8px;padding:5mm;break-inside:avoid;box-shadow:0 8px 28px rgba(0,0,0,.38);}
  .card h2{font-family:Cinzel,serif;color:var(--gold);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4mm;}
  .card img{display:block;width:100%;height:auto;border-radius:5px;}
  .staff,.piano{grid-column:1 / -1;}
</style>
</head>
<body>
  <main class="page">
    <header>
      <div class="brand">More Than Modes</div>
      <h1>${data.copy?.headline || data.symbol}</h1>
      <div class="summary">${data.copy?.summary || `${data.symbol}: ${data.notes.join(' - ')}`}</div>
    </header>
    <div class="grid">${cards}</div>
  </main>
</body>
</html>`;
  await fs.writeFile(outHtml, html, 'utf8');
}

export async function renderClass({ dataPath, rootDir = DEFAULT_ROOT } = {}) {
  const dataArg = dataPath || process.argv[2] || 'class-data/Dm.json';
  const dataFile = path.isAbsolute(dataArg) ? dataArg : path.join(rootDir, dataArg);
  const sourceHtml = process.env.MTM_SOURCE_HTML
    ? path.resolve(rootDir, process.env.MTM_SOURCE_HTML)
    : path.join(rootDir, 'source', 'proyecto_clases_con_monitor.html');
  const targetsFile = process.env.MTM_TARGETS_JSON
    ? path.resolve(rootDir, process.env.MTM_TARGETS_JSON)
    : path.join(rootDir, 'adapter', 'targets.json');
  const bridgeFile = path.join(rootDir, 'src', 'mtm-export-bridge.js');

  if (!(await exists(dataFile))) throw new Error(`No existe el JSON de clase: ${dataFile}`);
  if (!(await exists(sourceHtml))) throw new Error(`Falta tu HTML base: ${sourceHtml}`);

  const data = await readJson(dataFile);
  const targets = await readJson(targetsFile);
  const outDir = path.join(rootDir, 'output');
  const assetsDir = path.join(outDir, 'assets');
  await fs.mkdir(assetsDir, { recursive: true });

  const executablePath = detectChromiumExecutable();
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });

  try {
    const sourceMarkup = await fs.readFile(sourceHtml, 'utf8');
    await page.setContent(sourceMarkup, { waitUntil: 'load' });
    await page.addScriptTag({ path: bridgeFile });
    await page.evaluate(async (classData) => {
      if (!window.MTM_EXPORT || typeof window.MTM_EXPORT.render !== 'function') {
        throw new Error('El HTML no tiene window.MTM_EXPORT.render(data).');
      }
      await window.MTM_EXPORT.render(classData);
    }, data);

    const captures = [];
    for (const name of data.modules || Object.keys(targets)) {
      const cfg = targets[name];
      if (!cfg) continue;
      const imgPath = path.join(assetsDir, `${data.id}-${name}.png`);
      await captureTarget({ page, targetName: name, cfg, outPath: imgPath });
      captures.push({ name, label: cfg.label || name, path: imgPath });
    }

    const outHtml = path.join(outDir, `${data.id}.html`);
    const outPdf = path.join(outDir, `${data.id}.pdf`);
    await buildLessonHtml({ data, captures, outHtml });

    // Cerrar el navegador de captura antes de imprimir evita conflictos con Chromium del sistema.
    await forceCloseBrowser(browser);

    // Imprimir el PDF en un proceso separado para evitar cierres raros de Chromium después de muchas capturas.
    const pdfRun = spawnSync(process.execPath, [path.join(rootDir, 'src', 'pdf-from-html.mjs'), outHtml, outPdf], {
      cwd: rootDir,
      env: process.env,
      stdio: 'inherit'
    });
    if (pdfRun.status !== 0) throw new Error(`Falló la impresión PDF desde HTML: ${outHtml}`);

    console.log(`OK: ${outPdf}`);
    return outPdf;
  } finally {
    await forceCloseBrowser(browser);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  renderClass().catch(err => {
    console.error('\nERROR:', err.message);
    process.exit(1);
  });
}
