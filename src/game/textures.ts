import * as THREE from 'three';
import { TeamColor } from '../types/game';

// Cache generated textures so we don't recreate them
const textureCache: Record<string, THREE.CanvasTexture> = {};

function createCanvas(width = 128, height = 128): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(canvas: HTMLCanvasElement, key: string): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  textureCache[key] = texture;
  return texture;
}

// Procedural Wool Texture - High detail stylized voxel knit with bevel
export function getWoolTexture(color: string, teamId?: TeamColor): THREE.CanvasTexture {
  const key = `wool_${color}_${teamId || 'def'}_v2`;
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  // Base saturated color
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);

  // Woven knit tile grid (16x16 pixel yarn patches)
  const tileSize = 8;
  for (let y = 0; y < 128; y += tileSize) {
    for (let x = 0; x < 128; x += tileSize) {
      const isAlt = (x / tileSize + y / tileSize) % 2 === 0;
      const noise = (Math.random() - 0.5) * 0.12;

      ctx.fillStyle = isAlt
        ? `rgba(255, 255, 255, ${0.12 + noise})`
        : `rgba(0, 0, 0, ${0.14 - noise})`;
      ctx.fillRect(x, y, tileSize, tileSize);

      // Thread highlight lines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x + 1, y + 1, tileSize - 2, 2);
    }
  }

  // 3D Voxel Bevel (Light top-left, Shadow bottom-right)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(0, 0, 128, 4); // Top edge
  ctx.fillRect(0, 0, 4, 128); // Left edge

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 124, 128, 4); // Bottom edge
  ctx.fillRect(124, 0, 4, 128); // Right edge

  // Inner inset border for classic BedWars block definition
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, 116, 116);

  return finalizeTexture(canvas, key);
}

// Procedural Wood Planks Texture - Golden Oak with grain and iron rivets
export function getWoodTexture(): THREE.CanvasTexture {
  const key = 'wood_planks_v2';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  // Rich warm oak background
  ctx.fillStyle = '#b3783a';
  ctx.fillRect(0, 0, 128, 128);

  const plankHeight = 32;

  for (let i = 0; i < 4; i++) {
    const y = i * plankHeight;

    // Plank base gradient
    const grad = ctx.createLinearGradient(0, y, 0, y + plankHeight);
    grad.addColorStop(0, '#c78a48');
    grad.addColorStop(0.5, '#ab6d32');
    grad.addColorStop(1, '#945b25');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, 128, plankHeight);

    // Deep groove shadow between planks
    ctx.fillStyle = '#42240b';
    ctx.fillRect(0, y + plankHeight - 3, 128, 3);
    // Plank top highlight
    ctx.fillStyle = 'rgba(255, 235, 190, 0.45)';
    ctx.fillRect(0, y, 128, 2);

    // Organic wood grain streaks
    for (let g = 0; g < 18; g++) {
      const gx = Math.random() * 110;
      const gw = 10 + Math.random() * 25;
      const gy = y + 4 + Math.random() * (plankHeight - 8);
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(60, 30, 10, 0.25)' : 'rgba(255, 220, 160, 0.2)';
      ctx.fillRect(gx, gy, gw, 1.5);
    }

    // Wood knot
    if (i % 2 === 1) {
      const kx = 35 + i * 22;
      const ky = y + 16;
      ctx.fillStyle = '#4a2608';
      ctx.beginPath();
      ctx.ellipse(kx, ky, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2b1402';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Iron rivets / nails at plank ends
    [10, 118].forEach((nx) => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(nx, y + 14, 4, 4);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(nx + 1, y + 14, 2, 1);
    });
  }

  // Outer block bevel
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(0, 0, 128, 3);
  ctx.fillRect(0, 0, 3, 128);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 125, 128, 3);
  ctx.fillRect(125, 0, 3, 128);

  return finalizeTexture(canvas, key);
}

// Procedural Obsidian Texture - Deep cosmic crystalline lattice with purple/cyan glints
export function getObsidianTexture(): THREE.CanvasTexture {
  const key = 'obsidian_v2';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  // Cosmic dark purple/black gradient
  const bgGrad = ctx.createRadialGradient(64, 64, 10, 64, 64, 90);
  bgGrad.addColorStop(0, '#24143d');
  bgGrad.addColorStop(1, '#0e0817');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 128, 128);

  // Geometric crystal lattice lines
  ctx.strokeStyle = 'rgba(147, 51, 234, 0.35)';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(0, 32); ctx.lineTo(64, 0); ctx.lineTo(128, 32);
  ctx.moveTo(0, 96); ctx.lineTo(64, 128); ctx.lineTo(128, 96);
  ctx.moveTo(64, 0); ctx.lineTo(64, 128);
  ctx.moveTo(0, 32); ctx.lineTo(128, 96);
  ctx.moveTo(0, 96); ctx.lineTo(128, 32);
  ctx.stroke();

  // Vibrant neon crystalline speckles
  for (let i = 0; i < 280; i++) {
    const x = Math.floor(Math.random() * 124) + 2;
    const y = Math.floor(Math.random() * 124) + 2;
    const sz = Math.random() > 0.85 ? 3 : Math.random() > 0.5 ? 2 : 1;
    const r = Math.random();

    if (r > 0.75) {
      ctx.fillStyle = '#c084fc'; // Bright purple
    } else if (r > 0.45) {
      ctx.fillStyle = '#9333ea'; // Deep vibrant purple
    } else if (r > 0.2) {
      ctx.fillStyle = '#38bdf8'; // Shimmering cyan crystal
    } else {
      ctx.fillStyle = '#ffffff'; // Starlight glint
    }
    ctx.fillRect(x, y, sz, sz);
  }

  // Glowing gem facet at center
  ctx.save();
  ctx.translate(64, 64);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.strokeRect(-18, -18, 36, 36);
  ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
  ctx.fillRect(-18, -18, 36, 36);
  ctx.restore();

  // Heavy beveled crystal edges
  ctx.fillStyle = 'rgba(192, 132, 252, 0.4)';
  ctx.fillRect(0, 0, 128, 3);
  ctx.fillRect(0, 0, 3, 128);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 125, 128, 3);
  ctx.fillRect(125, 0, 3, 128);

  return finalizeTexture(canvas, key);
}

// Procedural Stone Brick Texture - Stylized castle cobblestone with chiseled depth
export function getStoneTexture(): THREE.CanvasTexture {
  const key = 'stone_brick_v2';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  ctx.fillStyle = '#78716c';
  ctx.fillRect(0, 0, 128, 128);

  // 4 rows of brickwork
  const rowHeight = 32;
  for (let row = 0; row < 4; row++) {
    const y = row * rowHeight;
    const isShifted = row % 2 === 1;
    const brickWidth = 64;
    const shift = isShifted ? 32 : 0;

    for (let col = -1; col < 3; col++) {
      const x = col * brickWidth + shift;

      // Individual brick face
      ctx.fillStyle = '#8a827d';
      ctx.fillRect(x + 2, y + 2, brickWidth - 4, rowHeight - 4);

      // Inner noise & rock grain
      for (let n = 0; n < 30; n++) {
        const nx = x + 4 + Math.random() * (brickWidth - 8);
        const ny = y + 4 + Math.random() * (rowHeight - 8);
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.18)';
        ctx.fillRect(nx, ny, 2, 2);
      }

      // Brick top-left highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(x + 2, y + 2, brickWidth - 4, 2);
      ctx.fillRect(x + 2, y + 2, 2, rowHeight - 4);

      // Brick bottom-right shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(x + 2, y + rowHeight - 4, brickWidth - 4, 2);
      ctx.fillRect(x + brickWidth - 4, y + 2, 2, rowHeight - 4);
    }

    // Mortar groove line
    ctx.fillStyle = '#292524';
    ctx.fillRect(0, y + rowHeight - 2, 128, 2);
  }

  // Perimeter shadow
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 126, 126);

  return finalizeTexture(canvas, key);
}

// Procedural Grass Top - Vibrant stylized BedWars turf with yellow daisies
export function getGrassTopTexture(): THREE.CanvasTexture {
  const key = 'grass_top_v2';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  // Lush vibrant emerald green
  ctx.fillStyle = '#4ea824';
  ctx.fillRect(0, 0, 128, 128);

  // Stylized mosaic pixel tiles
  const sz = 8;
  for (let y = 0; y < 128; y += sz) {
    for (let x = 0; x < 128; x += sz) {
      const r = Math.random();
      if (r > 0.65) {
        ctx.fillStyle = '#5ec22e'; // Bright lime
      } else if (r > 0.3) {
        ctx.fillStyle = '#44961e'; // Mid emerald
      } else {
        ctx.fillStyle = '#377a18'; // Dark grass shadow
      }
      ctx.fillRect(x, y, sz, sz);

      // Subtle grass blade streak
      if (Math.random() > 0.5) {
        ctx.fillStyle = '#74db3d';
        ctx.fillRect(x + 2, y + 1, sz - 4, 2);
      }
    }
  }

  // Scattered cute yellow daisies / flowers
  const flowers = [
    [24, 30],
    [88, 42],
    [48, 86],
    [100, 102],
    [20, 110],
  ];

  flowers.forEach(([fx, fy]) => {
    // White / yellow flower petals
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx - 2, fy - 1, 5, 3);
    ctx.fillRect(fx - 1, fy - 2, 3, 5);
    // Center yellow pistil
    ctx.fillStyle = '#facc15';
    ctx.fillRect(fx, fy, 1, 1);
  });

  // Soft edge border
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(0, 0, 128, 3);
  ctx.fillRect(0, 0, 3, 128);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(0, 125, 128, 3);
  ctx.fillRect(125, 0, 3, 128);

  return finalizeTexture(canvas, key);
}

// Procedural Dirt Side - Rich soil with grass drip overhang fringe
export function getDirtSideTexture(): THREE.CanvasTexture {
  const key = 'dirt_side_v2';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  // Deep rich earth brown
  ctx.fillStyle = '#784d28';
  ctx.fillRect(0, 0, 128, 128);

  // Dirt strata and stone pebbles
  for (let i = 0; i < 240; i++) {
    const x = Math.floor(Math.random() * 128);
    const y = 20 + Math.floor(Math.random() * 108);
    const sz = Math.random() > 0.8 ? 4 : 2;
    const r = Math.random();
    ctx.fillStyle = r > 0.6 ? '#5c3819' : r > 0.3 ? '#8f6036' : '#9c6f44';
    ctx.fillRect(x, y, sz, sz);
  }

  // Top Grass layer (solid 16px)
  ctx.fillStyle = '#4ea824';
  ctx.fillRect(0, 0, 128, 16);

  // Jagged hanging grass overhang blades
  for (let x = 0; x < 128; x += 4) {
    const bladeLen = 6 + Math.floor(Math.sin(x * 0.2) * 5 + Math.random() * 8);
    ctx.fillStyle = Math.random() > 0.3 ? '#4ea824' : '#5ec22e';
    ctx.fillRect(x, 16, 4, bladeLen);

    // Tip shadow underneath grass
    ctx.fillStyle = '#2e1c0c';
    ctx.fillRect(x, 16 + bladeLen, 4, 2);
  }

  // Bottom edge shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 124, 128, 4);

  return finalizeTexture(canvas, key);
}

// Procedural Generator Pad Emblem
export function getGeneratorPadTexture(type: 'iron' | 'gold' | 'diamond' | 'emerald'): THREE.CanvasTexture {
  const key = `gen_pad_${type}_v2`;
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  // Sleek obsidian / slate base
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 128, 128);

  const colors: Record<string, { border: string; glow: string; text: string; bg: string }> = {
    iron: { border: '#f1f5f9', glow: '#94a3b8', text: 'IRON', bg: '#334155' },
    gold: { border: '#fbbf24', glow: '#f59e0b', text: 'GOLD', bg: '#78350f' },
    diamond: { border: '#38bdf8', glow: '#0284c7', text: 'DIAMOND', bg: '#075985' },
    emerald: { border: '#4ade80', glow: '#16a34a', text: 'EMERALD', bg: '#14532d' },
  };
  const cfg = colors[type];

  // Outer glowing runic circuit ring
  ctx.strokeStyle = cfg.border;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 112, 112);

  ctx.strokeStyle = cfg.glow;
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, 92, 92);

  ctx.fillStyle = cfg.bg;
  ctx.fillRect(24, 24, 80, 80);

  // Rotating central diamond rune
  ctx.save();
  ctx.translate(64, 64);
  ctx.rotate(Math.PI / 4);

  ctx.fillStyle = cfg.border;
  ctx.fillRect(-22, -22, 44, 44);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-10, -10, 20, 20);
  ctx.restore();

  // Corner tech bolts
  [
    [12, 12],
    [112, 12],
    [12, 112],
    [112, 112],
  ].forEach(([bx, by]) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx - 2, by - 2, 4, 4);
  });

  return finalizeTexture(canvas, key);
}

// Bed Sheet Texture with luxurious quilted diamond pattern
export function getBedSheetTexture(team: TeamColor): THREE.CanvasTexture {
  const key = `bed_sheet_${team}_v2`;
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  const teamColors: Record<TeamColor, { primary: string; dark: string; light: string }> = {
    red: { primary: '#dc2626', dark: '#991b1b', light: '#f87171' },
    blue: { primary: '#2563eb', dark: '#1e40af', light: '#60a5fa' },
    green: { primary: '#059669', dark: '#065f46', light: '#34d399' },
    yellow: { primary: '#d97706', dark: '#92400e', light: '#fbbf24' },
  };
  const tc = teamColors[team];

  // Blanket fill
  ctx.fillStyle = tc.primary;
  ctx.fillRect(0, 0, 128, 128);

  // Quilted diamond stitch grid on blanket
  ctx.strokeStyle = tc.dark;
  ctx.lineWidth = 2;
  for (let i = -128; i < 256; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 40);
    ctx.lineTo(i + 128, 128);
    ctx.moveTo(i + 128, 40);
    ctx.lineTo(i, 128);
    ctx.stroke();
  }

  // Golden embroidery border
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 42, 116, 80);

  // White plush pillow (top portion)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(10, 10, 108, 28);

  // Pillow shadow crease
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(12, 34, 104, 3);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(16, 14, 96, 4);

  // Blanket fold line
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 38, 128, 4);

  return finalizeTexture(canvas, key);
}
