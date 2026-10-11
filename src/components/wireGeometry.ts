export type Wire = {x1: number; x2: number; y: number};
export const WIRE_WIDTH = 1600;
export const WIRE_HEIGHT = 390;

/** Scan glyph coverage once; the resulting SVG contains strokes, never a filled text mask. */
export function makeWordWires(word: string): Wire[] {
  const canvas = document.createElement('canvas');
  canvas.width = WIRE_WIDTH; canvas.height = WIRE_HEIGHT;
  const context = canvas.getContext('2d', {willReadFrequently: true});
  if (!context) return [];
  context.font = '900 450px Arial, sans-serif';
  const width = context.measureText(word).width;
  context.save();
  context.translate(16, 0);
  context.scale((WIRE_WIDTH - 32) / width, 1);
  context.fillText(word, 0, 350);
  context.restore();
  const pixels = context.getImageData(0, 0, WIRE_WIDTH, WIRE_HEIGHT).data;
  const wires: Wire[] = [];
  for (let y = 15; y < 355; y += 5) {
    let start = -1;
    for (let x = 0; x <= WIRE_WIDTH; x++) {
      const covered = x < WIRE_WIDTH && pixels[(y * WIRE_WIDTH + x) * 4 + 3] > 127;
      if (covered && start < 0) start = x;
      if (!covered && start >= 0) {
        if (x - start >= 3) wires.push({x1: start, x2: x - 1, y});
        start = -1;
      }
    }
  }
  return wires;
}

export function wirePath(wire: Wire, amplitude = 0, phase = 0, cycles = 2.2) {
  if (amplitude < .015) return `M ${wire.x1} ${wire.y} L ${wire.x2} ${wire.y}`;
  let path = `M ${wire.x1} ${wire.y}`;
  for (let i = 1; i <= 26; i++) {
    const t = i / 26;
    const envelope = Math.sin(Math.PI * t);
    const y = wire.y + Math.sin(2 * Math.PI * cycles * t + phase) * amplitude * envelope;
    path += ` L ${(wire.x1 + (wire.x2 - wire.x1) * t).toFixed(2)} ${y.toFixed(2)}`;
  }
  return path;
}
