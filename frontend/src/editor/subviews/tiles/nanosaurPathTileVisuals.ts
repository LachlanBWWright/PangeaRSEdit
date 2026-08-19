export const NANOSAUR_PATH_CELL_SIZE = 8;
const SOLID_EDGES = [
  "trbl", "t", "r", "b", "l", "tb", "lr", "tr", "br", "bl", "tl",
  "trl", "trb", "brl", "tbl",
] as const;
const DIRECTIONS = [
  [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1],
] as const;

function drawArrow(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  directionX: number,
  directionY: number,
  size: number,
): void {
  const length = size * 0.32;
  const endX = centerX + directionX * length;
  const endY = centerY + directionY * length;
  const startX = centerX - directionX * length;
  const startY = centerY - directionY * length;
  const perpendicularX = -directionY;
  const perpendicularY = directionX;
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.moveTo(endX, endY);
  context.lineTo(
    endX - directionX * size * 0.22 + perpendicularX * size * 0.16,
    endY - directionY * size * 0.22 + perpendicularY * size * 0.16,
  );
  context.moveTo(endX, endY);
  context.lineTo(
    endX - directionX * size * 0.22 - perpendicularX * size * 0.16,
    endY - directionY * size * 0.22 - perpendicularY * size * 0.16,
  );
  context.stroke();
}

function drawEdges(
  context: CanvasRenderingContext2D,
  edges: string,
  x: number,
  y: number,
  size: number,
): void {
  const inset = size * 0.12;
  context.beginPath();
  if (edges.includes("t")) {
    context.moveTo(x + inset, y + inset);
    context.lineTo(x + size - inset, y + inset);
  }
  if (edges.includes("r")) {
    context.moveTo(x + size - inset, y + inset);
    context.lineTo(x + size - inset, y + size - inset);
  }
  if (edges.includes("b")) {
    context.moveTo(x + inset, y + size - inset);
    context.lineTo(x + size - inset, y + size - inset);
  }
  if (edges.includes("l")) {
    context.moveTo(x + inset, y + inset);
    context.lineTo(x + inset, y + size - inset);
  }
  context.stroke();
}

export function drawNanosaurPathTile(
  context: CanvasRenderingContext2D,
  value: number,
  x: number,
  y: number,
  size: number,
): void {
  if (value === 0) return;
  const primarySolidIndex = value >= 9 && value <= 23 ? value - 9 : null;
  const secondarySolidIndex = value >= 24 && value <= 38 ? value - 24 : null;
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = Math.max(1.5, size * 0.13);
  context.strokeStyle = "#ffffff";

  if (value >= 1 && value <= 8) {
    context.fillStyle = "#2563eb";
    context.fillRect(x, y, size, size);
    const direction = DIRECTIONS[value - 1];
    if (direction) drawArrow(context, x + size / 2, y + size / 2, direction[0], direction[1], size);
  } else if (primarySolidIndex !== null) {
    context.fillStyle = "#dc2626";
    context.fillRect(x, y, size, size);
    drawEdges(context, SOLID_EDGES[primarySolidIndex] ?? "", x, y, size);
  } else if (secondarySolidIndex !== null) {
    context.fillStyle = "#7c3aed";
    context.fillRect(x, y, size, size);
    drawEdges(context, SOLID_EDGES[secondarySolidIndex] ?? "", x, y, size);
  } else {
    const specialColors: Record<number, string> = {
      39: "#ea580c", 40: "#db2777", 41: "#ca8a04", 42: "#a16207", 43: "#16a34a",
    };
    context.fillStyle = specialColors[value] ?? "#475569";
    context.fillRect(x, y, size, size);
    context.font = `bold ${Math.round(size * 0.62)}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#ffffff";
    context.fillText(value === 39 ? "↔" : value === 40 ? "×" : value === 41 ? "A" : value === 42 ? "B" : "↗", x + size / 2, y + size / 2);
  }
  context.restore();
}

export function buildNanosaurPathCanvas(
  values: readonly number[],
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width * NANOSAUR_PATH_CELL_SIZE;
  canvas.height = height * NANOSAUR_PATH_CELL_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  values.forEach((value, index) => {
    if (index >= width * height) return;
    drawNanosaurPathTile(
      context,
      value,
      (index % width) * NANOSAUR_PATH_CELL_SIZE,
      Math.floor(index / width) * NANOSAUR_PATH_CELL_SIZE,
      NANOSAUR_PATH_CELL_SIZE,
    );
  });
  return canvas;
}

export function paintNanosaurPathCanvasCell(
  canvas: HTMLCanvasElement,
  value: number,
  x: number,
  z: number,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const canvasX = x * NANOSAUR_PATH_CELL_SIZE;
  const canvasY = z * NANOSAUR_PATH_CELL_SIZE;
  context.clearRect(
    canvasX,
    canvasY,
    NANOSAUR_PATH_CELL_SIZE,
    NANOSAUR_PATH_CELL_SIZE,
  );
  drawNanosaurPathTile(
    context,
    value,
    canvasX,
    canvasY,
    NANOSAUR_PATH_CELL_SIZE,
  );
}
