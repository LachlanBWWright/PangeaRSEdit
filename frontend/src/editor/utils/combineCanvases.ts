export function combineCanvases(canvases: HTMLCanvasElement[]): HTMLCanvasElement {
  const collage = document.createElement("canvas");
  if (!canvases || canvases.length === 0) {
    collage.width = 1;
    collage.height = 1;
    return collage;
  }

  const tileW = canvases[0].width;
  const tileH = canvases[0].height;
  const count = canvases.length;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  collage.width = cols * tileW;
  collage.height = rows * tileH;

  const ctx = collage.getContext("2d");
  if (!ctx) return collage;

  canvases.forEach((cv, i) => {
    const x = (i % cols) * tileW;
    const y = Math.floor(i / cols) * tileH;
    ctx.drawImage(cv, x, y);
  });

  return collage;
}
