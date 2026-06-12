import * as nodePath from 'path';
import * as fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createCanvas, loadImage } = require('@napi-rs/canvas') as typeof import('@napi-rs/canvas');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFDocument } = require('pdf-lib') as typeof import('pdf-lib');

async function getChromePath(): Promise<string> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const puppeteer = await import('puppeteer');
  return puppeteer.default.executablePath();
}

/** Prend un screenshot fullPage du HTML et retourne les tranches A4 en PNG. */
async function renderPagePngs(html: string): Promise<Buffer[]> {
  const SCALE    = 2;
  const A4_W_CSS = 794;
  const A4_H_CSS = 1123;

  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    executablePath: await getChromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  let screenshotBuf: Buffer;
  let totalHeightCSS: number;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: A4_W_CSS, height: A4_H_CSS, deviceScaleFactor: SCALE });
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'load' });
    totalHeightCSS = await page.evaluate(() => document.documentElement.scrollHeight);
    screenshotBuf  = Buffer.from(await page.screenshot({ type: 'png', fullPage: true }));
  } finally {
    await browser.close();
  }

  const imgW     = A4_W_CSS * SCALE;
  const pageH    = A4_H_CSS * SCALE;
  const numPages = Math.ceil((totalHeightCSS * SCALE) / pageH);
  const fullImg  = await loadImage(screenshotBuf);
  const pages: Buffer[] = [];

  for (let i = 0; i < numPages; i++) {
    const canvas = createCanvas(imgW, pageH);
    const ctx    = canvas.getContext('2d') as any;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, imgW, pageH);
    ctx.drawImage(fullImg, 0, i * pageH, imgW, pageH, 0, 0, imgW, pageH);
    pages.push(canvas.toBuffer('image/png'));
  }

  return pages;
}

/**
 * Viewer HTML sécurisé : chaque page = <img> + calque SVG opaque transparent
 * positionné au-dessus et capturant tous les événements souris.
 *
 * Le calque supérieur contient le motif filigrane et bloque la sélection :
 * • pointer-events: all  → absorbe les clics/survols, rien ne passe à l'image
 * • user-select: none    → pas de sélection de texte dans le calque non plus
 * Chrome ne lance pas son OCR PDF viewer sur des pages HTML normales.
 */
/** Viewer HTML sécurisé. Pages en images + overlay qui bloque les clics/sélection. */
export async function htmlToSecureViewerHtml(html: string, _watermarkText: string): Promise<string> {
  const pages = await renderPagePngs(html);

  const pageHtml = pages
    .map((png) => {
      const b64 = png.toString('base64');
      // Overlay transparent : capture les clics → empêche toute sélection
      return `<div style="position:relative;display:block;width:100%;max-width:794px;margin:0 auto 12px;">
  <img src="data:image/png;base64,${b64}" alt="" draggable="false"
    style="display:block;width:100%;box-shadow:0 2px 8px rgba(0,0,0,0.5);" />
  <div style="position:absolute;inset:0;pointer-events:all;user-select:none;-webkit-user-select:none;"></div>
</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{background:#525659;min-height:100%;padding:16px}
</style>
</head>
<body oncontextmenu="return false" onselectstart="return false">
${pageHtml}
</body>
</html>`;
}

/**
 * PDF téléchargeable : image (incopiable via OCR) + couche texte pdf-lib dense.
 * Chrome copie la couche texte PDF = le filigrane, pas le contenu du document.
 */
export async function htmlToPdfFlattened(html: string, watermarkText: string): Promise<Buffer> {
  const A4_W = 794;
  const A4_H = 1123;

  const pages  = await renderPagePngs(html);
  const outDoc = await PDFDocument.create();

  for (const png of pages) {
    const img     = await outDoc.embedPng(png);
    const outPage = outDoc.addPage([A4_W, A4_H]);
    outPage.drawImage(img, { x: 0, y: 0, width: A4_W, height: A4_H });
  }

  return Buffer.from(await outDoc.save());
}

/** Génère et stocke un PDF aplati. Retourne le chemin absolu du fichier. */
export async function generateAndStorePdf(
  html: string,
  watermarkText: string,
  filename: string,
): Promise<string> {
  const dir      = nodePath.join(process.cwd(), 'uploads', 'contracts');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = nodePath.join(dir, filename);
  const buffer   = await htmlToPdfFlattened(html, watermarkText);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}
