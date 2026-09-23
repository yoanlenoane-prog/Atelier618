/** Conversion d'une page de PDF en image (pour afficher un plan PDF et y poser des pastilles). */
export async function pdfPageCount(file: Blob): Promise<number> {
  const pdf = await load(file);
  return pdf.numPages;
}

async function load(file: Blob) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
}

/** Rend la page demandée en PNG (côté le plus long ≈ 3000 px pour rester lisible en zoom). */
export async function renderPdfPage(file: Blob, pageNumber = 1, target = 3000): Promise<{ blob: Blob; w: number; h: number }> {
  const pdf = await load(file);
  const page = await pdf.getPage(Math.min(Math.max(1, pageNumber), pdf.numPages));
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(6, target / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport } as any).promise;
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Conversion impossible'))), 'image/png'));
  return { blob, w: canvas.width, h: canvas.height };
}
