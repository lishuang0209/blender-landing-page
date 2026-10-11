export type StickerKind =
  | 'mushroom'
  | 'smile'
  | 'heart'
  | 'zap'
  | 'lips'
  | 'banana'
  | 'lolli'
  | 'skull'
  | 'star'
  | 'blob' | 'eyes' | 'planet' | 'popsicle' | 'flower' | 'ghost' | 'butterfly' | 'rocket' | 'comet';

export interface StickerSpec {
  kind: StickerKind;
  position: [number, number, number];
  scale: number;
  rot: number;
  speed: number;
  phase: number;
  drift: [number, number, number];
}

const KINDS: StickerKind[] = [
  'eyes', 'popsicle', 'planet', 'smile', 'butterfly', 'mushroom', 'rocket', 'flower', 'heart', 'ghost', 'zap', 'comet', 'lips', 'lolli', 'skull', 'star', 'blob', 'banana',
];

export function buildStickerField(count = 28): StickerSpec[] {
  const specs: StickerSpec[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.35;
    const radius = 1.35 + (i % 5) * 0.55 + (i % 2) * 0.25;
    const y = ((i % 7) - 3) * 0.42 + Math.sin(i * 1.7) * 0.2;
    const z = -0.8 - (i % 4) * 0.55 + Math.cos(i) * 0.2;
    // Keep a soft hole in the center so the character stays readable.
    const x = Math.cos(angle) * radius * (0.85 + (i % 3) * 0.12);
    const depthBias = (i % 2 === 0 ? 1 : -1) * (0.2 + (i % 5) * 0.08);
    specs.push({
      kind: KINDS[i % KINDS.length],
      position: [x + depthBias * 0.15, y, z - Math.abs(x) * 0.08],
      scale: 0.38 + (i % 5) * 0.07,
      rot: ((i * 37) % 60 - 30) * (Math.PI / 180),
      speed: 0.35 + (i % 6) * 0.08,
      phase: i * 0.73,
      drift: [
        0.08 + (i % 4) * 0.025,
        0.07 + (i % 3) * 0.02,
        0.05 + (i % 3) * 0.015,
      ],
    });
  }
  return specs;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function strokeFill(ctx: CanvasRenderingContext2D, fill: string, line = 14) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = line;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.fill();
  ctx.strokeStyle = '#18151c';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawKind(ctx: CanvasRenderingContext2D, kind: StickerKind) {
  const cx = 128;
  const cy = 128;
  ctx.clearRect(0, 0, 256, 256);

  ctx.translate(cx, cy);

  switch (kind) {
    case 'mushroom': {
      ctx.beginPath();
      ctx.ellipse(0, -18, 70, 52, 0, Math.PI, 0);
      ctx.lineTo(62, -10);
      ctx.quadraticCurveTo(0, 30, -62, -10);
      ctx.closePath();
      strokeFill(ctx, '#ef3b3b', 16);
      ctx.beginPath();
      ctx.arc(-28, -28, 12, 0, Math.PI * 2);
      ctx.arc(8, -40, 10, 0, Math.PI * 2);
      ctx.arc(34, -22, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      roundRect(ctx, -28, -8, 56, 70, 18);
      strokeFill(ctx, '#f4d7b0', 14);
      break;
    }
    case 'smile': {
      ctx.beginPath();
      ctx.arc(0, 0, 70, 0, Math.PI * 2);
      strokeFill(ctx, '#ff7ab8', 16);
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(-24, -12, 8, 0, Math.PI * 2);
      ctx.arc(24, -12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 10, 28, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 10;
      ctx.stroke();
      break;
    }
    case 'heart': {
      ctx.beginPath();
      ctx.moveTo(0, 48);
      ctx.bezierCurveTo(-70, 10, -60, -50, 0, -22);
      ctx.bezierCurveTo(60, -50, 70, 10, 0, 48);
      strokeFill(ctx, '#ff3355', 16);
      break;
    }
    case 'zap': {
      ctx.beginPath();
      ctx.moveTo(10, -70);
      ctx.lineTo(-20, 0);
      ctx.lineTo(8, 0);
      ctx.lineTo(-10, 70);
      ctx.lineTo(34, -8);
      ctx.lineTo(4, -8);
      ctx.closePath();
      strokeFill(ctx, '#ffe14a', 14);
      break;
    }
    case 'lips': {
      ctx.beginPath();
      ctx.moveTo(-70, 0);
      ctx.quadraticCurveTo(-20, -42, 0, -18);
      ctx.quadraticCurveTo(20, -42, 70, 0);
      ctx.quadraticCurveTo(20, 48, 0, 28);
      ctx.quadraticCurveTo(-20, 48, -70, 0);
      strokeFill(ctx, '#ff4d7a', 16);
      ctx.beginPath();
      ctx.moveTo(-56, 2);
      ctx.quadraticCurveTo(0, 10, 56, 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 8;
      ctx.stroke();
      break;
    }
    case 'banana': {
      ctx.beginPath();
      ctx.moveTo(-48, -40);
      ctx.quadraticCurveTo(-10, -70, 40, -20);
      ctx.quadraticCurveTo(70, 20, 20, 60);
      ctx.quadraticCurveTo(-10, 40, -20, 10);
      ctx.quadraticCurveTo(-40, -10, -48, -40);
      strokeFill(ctx, '#ffe566', 14);
      ctx.beginPath();
      ctx.moveTo(-48, -40);
      ctx.lineTo(-62, -55);
      ctx.lineTo(-40, -48);
      strokeFill(ctx, '#6b4a2b', 10);
      break;
    }
    case 'lolli': {
      ctx.beginPath();
      ctx.arc(0, -18, 52, 0, Math.PI * 2);
      strokeFill(ctx, '#7d5cff', 16);
      ctx.beginPath();
      ctx.arc(0, -18, 28, 0, Math.PI * 2);
      strokeFill(ctx, '#5ae07a', 12);
      ctx.beginPath();
      ctx.moveTo(0, 30);
      ctx.lineTo(0, 78);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 14;
      ctx.stroke();
      ctx.strokeStyle = '#f0c27a';
      ctx.lineWidth = 8;
      ctx.stroke();
      // eyes
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(-14, -24, 5, 0, Math.PI * 2);
      ctx.arc(14, -24, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'skull': {
      ctx.beginPath();
      ctx.ellipse(0, -8, 52, 48, 0, 0, Math.PI * 2);
      strokeFill(ctx, '#f2f2f2', 14);
      roundRect(ctx, -28, 20, 56, 34, 12);
      strokeFill(ctx, '#f2f2f2', 12);
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.ellipse(-18, -8, 12, 14, 0, 0, Math.PI * 2);
      ctx.ellipse(18, -8, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(i * 10 - 3, 28, 6, 16);
      }
      break;
    }
    case 'star': {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const b = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * 70, Math.sin(a) * 70);
        ctx.lineTo(Math.cos(b) * 30, Math.sin(b) * 30);
      }
      ctx.closePath();
      strokeFill(ctx, '#7cf0ff', 14);
      break;
    }
    case 'eyes': {
      for (const x of [-36, 36]) {
        ctx.beginPath(); ctx.ellipse(x, 0, 33, 53, -.13, 0, Math.PI * 2); strokeFill(ctx, '#fff', 18);
        ctx.beginPath(); ctx.ellipse(x + 7, 12, 18, 24, 0, 0, Math.PI * 2); ctx.fillStyle = '#12c9ef'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 10, 13, 9, 14, 0, 0, Math.PI * 2); ctx.fillStyle = '#17151c'; ctx.fill();
        ctx.beginPath(); ctx.arc(x + 6, 6, 4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      }
      break;
    }
    case 'planet': {
      ctx.beginPath(); ctx.arc(0, 0, 57, 0, Math.PI * 2); strokeFill(ctx, '#bdff09', 18);
      ctx.save(); ctx.rotate(-.38); ctx.beginPath(); ctx.ellipse(0, 0, 89, 23, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 19; ctx.stroke(); ctx.strokeStyle = '#17151c'; ctx.lineWidth = 10; ctx.stroke(); ctx.strokeStyle = '#bc7dff'; ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.arc(-13, -17, 27, Math.PI, Math.PI * 1.4); ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.stroke();
      break;
    }
    case 'popsicle': {
      roundRect(ctx, -10, 30, 20, 63, 9); strokeFill(ctx, '#eebb76', 17);
      ctx.beginPath(); ctx.moveTo(-42, -35); ctx.quadraticCurveTo(-42, -77, 0, -77);
      ctx.quadraticCurveTo(17, -77, 25, -66); ctx.quadraticCurveTo(2, -56, 25, -40);
      ctx.quadraticCurveTo(43, -47, 43, -24); ctx.lineTo(43, 36); ctx.quadraticCurveTo(0, 62, -42, 36); ctx.closePath(); strokeFill(ctx, '#ff4357', 19);
      ctx.beginPath(); ctx.moveTo(-24, -40); ctx.lineTo(-24, 17); ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke();
      break;
    }
    case 'flower': {
      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {const a = i / 64 * Math.PI * 2, r = 66 + Math.cos(a * 8) * 14; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (!i) ctx.moveTo(x,y); else ctx.lineTo(x,y);}
      ctx.closePath(); strokeFill(ctx, '#fff3fd', 19);
      ctx.beginPath(); ctx.arc(0, 0, 43, 0, Math.PI * 2); strokeFill(ctx, '#ffdf04', 5);
      ctx.fillStyle = '#17151c'; for (const x of [-14,14]) {ctx.beginPath(); ctx.ellipse(x, -5, 5, 10, 0, 0, Math.PI * 2); ctx.fill();}
      ctx.beginPath(); ctx.arc(0, 9, 17, .2 * Math.PI, .8 * Math.PI); ctx.strokeStyle = '#17151c'; ctx.lineWidth = 5; ctx.stroke(); break;
    }
    case 'ghost': {
      ctx.beginPath(); ctx.moveTo(-59, 65); ctx.lineTo(-59,-8); ctx.bezierCurveTo(-59,-88,59,-88,59,-8); ctx.lineTo(59,65);
      ctx.quadraticCurveTo(39,43,22,63); ctx.quadraticCurveTo(0,42,-20,64); ctx.quadraticCurveTo(-38,43,-59,65); ctx.closePath(); strokeFill(ctx, '#c892ff', 19);
      ctx.fillStyle = '#17151c'; for (const x of [-20,20]) {ctx.beginPath(); ctx.ellipse(x,-12,6,14,0,0,Math.PI*2); ctx.fill();}
      ctx.beginPath(); ctx.ellipse(0,24,10,14,0,0,Math.PI*2); ctx.fill(); break;
    }
    case 'butterfly': {
      for (const side of [-1,1]) {
        ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(side*85,-104,side*107,3,side*20,17); ctx.bezierCurveTo(side*90,5,side*71,101,0,26); ctx.closePath(); strokeFill(ctx, side < 0 ? '#11dfed' : '#ff5cb5', 18);
        ctx.beginPath(); ctx.arc(side*43,-20,13,0,Math.PI*2); ctx.fillStyle='#fff76d'; ctx.fill();
      }
      roundRect(ctx,-7,-30,14,86,7); ctx.fillStyle='#17151c'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2,-25); ctx.quadraticCurveTo(-4,-55,-23,-58); ctx.moveTo(2,-25); ctx.quadraticCurveTo(4,-55,23,-58); ctx.strokeStyle='#fff'; ctx.lineWidth=9; ctx.stroke(); break;
    }
    case 'rocket': {
      ctx.save(); ctx.rotate(.35);
      ctx.beginPath(); ctx.moveTo(-18,38); ctx.lineTo(0,91); ctx.lineTo(18,38); ctx.closePath(); strokeFill(ctx,'#ffdc23',14);
      ctx.beginPath(); ctx.moveTo(-24,5); ctx.lineTo(-53,52); ctx.lineTo(53,52); ctx.lineTo(24,5); ctx.closePath(); strokeFill(ctx,'#ff335b',16);
      ctx.beginPath(); ctx.moveTo(-26,40); ctx.quadraticCurveTo(-41,-32,0,-81); ctx.quadraticCurveTo(41,-32,26,40); ctx.closePath(); strokeFill(ctx,'#f7f2ff',18);
      ctx.beginPath(); ctx.arc(0,-15,17,0,Math.PI*2); strokeFill(ctx,'#704bff',5); ctx.restore(); break;
    }
    case 'comet': {
      ctx.beginPath(); ctx.moveTo(-55,45); ctx.lineTo(28,-82); ctx.lineTo(24,-24); ctx.lineTo(82,-55); ctx.lineTo(50,9); ctx.quadraticCurveTo(73,62,11,65); ctx.closePath(); strokeFill(ctx,'#ff8ad4',18);
      ctx.beginPath(); ctx.arc(4,24,28,0,Math.PI*2); strokeFill(ctx,'#ffe517',5);
      ctx.beginPath(); ctx.arc(-4,16,8,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill(); break;
    }
    case 'blob':
    default: {
      ctx.beginPath();
      ctx.moveTo(0, -60);
      ctx.bezierCurveTo(55, -70, 75, -10, 50, 30);
      ctx.bezierCurveTo(30, 70, -35, 70, -55, 25);
      ctx.bezierCurveTo(-75, -15, -50, -65, 0, -60);
      strokeFill(ctx, '#62e07a', 16);
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(-18, -8, 7, 0, Math.PI * 2);
      ctx.arc(18, -8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 14, 16, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 7;
      ctx.stroke();
      break;
    }
  }
}

export function stickerCanvas(kind: StickerKind): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) drawKind(ctx, kind);
  return canvas;
}
