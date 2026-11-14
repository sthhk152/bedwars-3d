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

// ==================== NETHER / MAGMA THEME TEXTURES ====================

// Procedural Netherrack Top - Craggy dark crimson rock with fiery veins
export function getNetherrackTopTexture(): THREE.CanvasTexture {
  const key = 'netherrack_top_v1';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  ctx.fillStyle = '#5c1010';
  ctx.fillRect(0, 0, 128, 128);

  // Volcanic crags and porous noise
  const sz = 8;
  for (let y = 0; y < 128; y += sz) {
    for (let x = 0; x < 128; x += sz) {
      const r = Math.random();
      if (r > 0.7) {
        ctx.fillStyle = '#7a1919';
      } else if (r > 0.35) {
        ctx.fillStyle = '#450a0a';
      } else {
        ctx.fillStyle = '#2f0505';
      }
      ctx.fillRect(x, y, sz, sz);
    }
  }

  // Molten micro-veins glowing with lava
  for (let i = 0; i < 20; i++) {
    const vx = Math.random() * 110;
    const vy = Math.random() * 110;
    const vl = 6 + Math.random() * 12;
    ctx.fillStyle = Math.random() > 0.5 ? '#f97316' : '#ea580c';
    ctx.fillRect(vx, vy, vl, 2);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(vx + 2, vy, Math.max(2, vl - 4), 1);
  }

  // Charcoal bevel border
  ctx.fillStyle = 'rgba(255, 100, 50, 0.25)';
  ctx.fillRect(0, 0, 128, 3);
  ctx.fillRect(0, 0, 3, 128);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 125, 128, 3);
  ctx.fillRect(125, 0, 3, 128);

  return finalizeTexture(canvas, key);
}

// Procedural Basalt Side - Dark volcanic columnar rock
export function getBasaltSideTexture(): THREE.CanvasTexture {
  const key = 'basalt_side_v1';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  ctx.fillStyle = '#262626';
  ctx.fillRect(0, 0, 128, 128);

  // Vertical basalt columns
  const colWidth = 16;
  for (let x = 0; x < 128; x += colWidth) {
    const shade = (x / colWidth) % 2 === 0 ? '#1f1f1f' : '#2e2e2e';
    ctx.fillStyle = shade;
    ctx.fillRect(x, 0, colWidth, 128);

    // Column edge highlight & groove
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(x, 0, 2, 128);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x + colWidth - 2, 0, 2, 128);

    // Volcanic ash & soot specks
    for (let s = 0; s < 12; s++) {
      const sx = x + Math.random() * (colWidth - 2);
      const sy = Math.random() * 124;
      ctx.fillStyle = Math.random() > 0.4 ? '#404040' : '#141414';
      ctx.fillRect(sx, sy, 2, 3);
    }
  }

  // Top overhang crimson fringe
  ctx.fillStyle = '#6b1111';
  ctx.fillRect(0, 0, 128, 10);
  for (let x = 0; x < 128; x += 4) {
    const h = 4 + Math.floor(Math.sin(x * 0.3) * 3 + Math.random() * 5);
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(x, 10, 4, h);
  }

  return finalizeTexture(canvas, key);
}

// Procedural Nether Fortress Bricks
export function getNetherBrickTexture(): THREE.CanvasTexture {
  const key = 'nether_brick_v1';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  ctx.fillStyle = '#360909';
  ctx.fillRect(0, 0, 128, 128);

  const rowHeight = 32;
  for (let row = 0; row < 4; row++) {
    const y = row * rowHeight;
    const shift = (row % 2 === 1) ? 32 : 0;
    const brickWidth = 64;

    for (let col = -1; col < 3; col++) {
      const x = col * brickWidth + shift;
      ctx.fillStyle = '#541010';
      ctx.fillRect(x + 2, y + 2, brickWidth - 4, rowHeight - 4);

      // Crimson brick texture
      for (let n = 0; n < 20; n++) {
        const nx = x + 3 + Math.random() * (brickWidth - 6);
        const ny = y + 3 + Math.random() * (rowHeight - 6);
        ctx.fillStyle = Math.random() > 0.5 ? '#6d1818' : '#280606';
        ctx.fillRect(nx, ny, 2, 2);
      }

      // Brick highlight & shadow
      ctx.fillStyle = 'rgba(255, 120, 120, 0.2)';
      ctx.fillRect(x + 2, y + 2, brickWidth - 4, 2);
      ctx.fillRect(x + 2, y + 2, 2, rowHeight - 4);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(x + 2, y + rowHeight - 4, brickWidth - 4, 2);
      ctx.fillRect(x + brickWidth - 4, y + 2, 2, rowHeight - 4);
    }

    ctx.fillStyle = '#170303';
    ctx.fillRect(0, y + rowHeight - 2, 128, 2);
  }

  return finalizeTexture(canvas, key);
}

// Procedural Glowing Magma Texture
export function getMagmaTexture(): THREE.CanvasTexture {
  const key = 'magma_glow_v1';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  // Fiery liquid base
  const bgGrad = ctx.createRadialGradient(64, 64, 10, 64, 64, 80);
  bgGrad.addColorStop(0, '#fef08a');
  bgGrad.addColorStop(0.3, '#f97316');
  bgGrad.addColorStop(0.7, '#dc2626');
  bgGrad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 128, 128);

  // Floating dark obsidian crust shards
  ctx.fillStyle = '#1c0a0a';
  for (let i = 0; i < 18; i++) {
    const cx = 16 + (i % 4) * 32 + (Math.random() - 0.5) * 10;
    const cy = 16 + Math.floor(i / 4) * 28 + (Math.random() - 0.5) * 8;
    const r = 8 + Math.random() * 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#360f0f';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Glowing fissure outlines
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, 30); ctx.lineTo(60, 64); ctx.lineTo(118, 40);
  ctx.moveTo(30, 110); ctx.lineTo(64, 64); ctx.lineTo(95, 115);
  ctx.stroke();

  return finalizeTexture(canvas, key);
}

// ==================== FROST / GLACIER THEME TEXTURES ====================

// Procedural Snow Top - Crisp powder snow with ice crystal glints
export function getSnowTopTexture(): THREE.CanvasTexture {
  const key = 'snow_top_v1';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 128, 128);

  // Soft snow crystalline mosaic
  const sz = 8;
  for (let y = 0; y < 128; y += sz) {
    for (let x = 0; x < 128; x += sz) {
      const r = Math.random();
      if (r > 0.7) {
        ctx.fillStyle = '#ffffff';
      } else if (r > 0.3) {
        ctx.fillStyle = '#f1f5f9';
      } else {
        ctx.fillStyle = '#e2e8f0';
      }
      ctx.fillRect(x, y, sz, sz);

      // Crystalline frost sparkles
      if (Math.random() > 0.88) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x + 2, y + 2, 2, 2);
      }
    }
  }

  // Bright frosted bevel
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 3);
  ctx.fillRect(0, 0, 3, 128);
  ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
  ctx.fillRect(0, 125, 128, 3);
  ctx.fillRect(125, 0, 3, 128);

  return finalizeTexture(canvas, key);
}

// Procedural Ice Side - Layered packed glacier ice with snow drip
export function getIceSideTexture(): THREE.CanvasTexture {
  const key = 'ice_side_v1';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  // Translucent glacier blue gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#7dd3fc');
  grad.addColorStop(0.5, '#38bdf8');
  grad.addColorStop(1, '#0284c7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  // Internal glacial fractures & ice veins
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const startX = Math.random() * 128;
    ctx.beginPath();
    ctx.moveTo(startX, 20);
    ctx.lineTo(startX + (Math.random() - 0.5) * 30, 70);
    ctx.lineTo(startX + (Math.random() - 0.5) * 40, 120);
    ctx.stroke();
  }

  // Frost bubbles
  for (let i = 0; i < 40; i++) {
    const bx = Math.random() * 124;
    const by = 20 + Math.random() * 100;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(bx, by, Math.random() * 3 + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Snow top overhang fringe
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 14);
  for (let x = 0; x < 128; x += 4) {
    const icicle = 4 + Math.floor(Math.sin(x * 0.25) * 4 + Math.random() * 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, 14, 4, icicle);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.fillRect(x, 14 + icicle, 4, 2);
  }

  return finalizeTexture(canvas, key);
}

// Procedural Frost Stone - Chiseled stone with frozen rime
export function getFrostStoneTexture(): THREE.CanvasTexture {
  const key = 'frost_stone_v1';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, 128, 128);

  const rowHeight = 32;
  for (let row = 0; row < 4; row++) {
    const y = row * rowHeight;
    const shift = (row % 2 === 1) ? 32 : 0;
    const brickWidth = 64;

    for (let col = -1; col < 3; col++) {
      const x = col * brickWidth + shift;
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x + 2, y + 2, brickWidth - 4, rowHeight - 4);

      // Icy noise
      for (let n = 0; n < 25; n++) {
        const nx = x + 3 + Math.random() * (brickWidth - 6);
        const ny = y + 3 + Math.random() * (rowHeight - 6);
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(224, 242, 254, 0.25)' : '#334155';
        ctx.fillRect(nx, ny, 2, 2);
      }

      // Frosted pale blue edges
      ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
      ctx.fillRect(x + 2, y + 2, brickWidth - 4, 2);
      ctx.fillRect(x + 2, y + 2, 2, rowHeight - 4);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
      ctx.fillRect(x + 2, y + rowHeight - 4, brickWidth - 4, 2);
      ctx.fillRect(x + brickWidth - 4, y + 2, 2, rowHeight - 4);
    }

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, y + rowHeight - 2, 128, 2);
  }

  return finalizeTexture(canvas, key);
}

// ==================== DESERT / SANDSTONE THEME TEXTURES ====================

// Procedural Sand Top - Warm golden desert dune sand with ripples
export function getSandTopTexture(): THREE.CanvasTexture {
  const key = 'sand_top_v1';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 0, 128, 128);

  // Soft dune granule variation
  const sz = 8;
  for (let y = 0; y < 128; y += sz) {
    for (let x = 0; x < 128; x += sz) {
      const r = Math.random();
      if (r > 0.65) {
        ctx.fillStyle = '#facc15';
      } else if (r > 0.3) {
        ctx.fillStyle = '#ca8a04';
      } else {
        ctx.fillStyle = '#a16207';
      }
      ctx.fillRect(x, y, sz, sz);
    }
  }

  // Wind-carved dune ripple lines
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
  ctx.lineWidth = 2;
  for (let y = 16; y < 128; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(40, y - 4, 80, y + 4, 128, y);
    ctx.stroke();

    // Shadow under ripple
    ctx.strokeStyle = 'rgba(113, 63, 18, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y + 2);
    ctx.bezierCurveTo(40, y - 2, 80, y + 6, 128, y + 2);
    ctx.stroke();
  }

  // Soft bevel
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(0, 0, 128, 3);
  ctx.fillRect(0, 0, 3, 128);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 125, 128, 3);
  ctx.fillRect(125, 0, 3, 128);

  return finalizeTexture(canvas, key);
}

// Procedural Sandstone Side - Layered geological desert strata
export function getSandstoneSideTexture(): THREE.CanvasTexture {
  const key = 'sandstone_side_v1';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(0, 0, 128, 128);

  // Distinct geological strata layers
  const strataColors = ['#fde047', '#eab308', '#ca8a04', '#d97706', '#b45309', '#eab308', '#ca8a04'];
  const layerHeight = 128 / strataColors.length;

  strataColors.forEach((color, i) => {
    const y = i * layerHeight;
    ctx.fillStyle = color;
    ctx.fillRect(0, y, 128, layerHeight);

    // Weathering streaks
    for (let s = 0; s < 10; s++) {
      const sx = Math.random() * 110;
      const sw = 10 + Math.random() * 25;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
      ctx.fillRect(sx, y + Math.random() * layerHeight, sw, 1.5);
    }

    // Groove between strata
    ctx.fillStyle = 'rgba(69, 26, 3, 0.35)';
    ctx.fillRect(0, y + layerHeight - 2, 128, 2);
  });

  // Top sand overhang
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 128, 12);
  for (let x = 0; x < 128; x += 4) {
    const drop = 3 + Math.floor(Math.sin(x * 0.2) * 3 + Math.random() * 5);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(x, 12, 4, drop);
  }

  return finalizeTexture(canvas, key);
}

// Procedural Sandstone Brick - Carved ancient Egyptian/desert temple blocks
export function getSandstoneBrickTexture(): THREE.CanvasTexture {
  const key = 'sandstone_brick_v1';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  ctx.fillStyle = '#b45309';
  ctx.fillRect(0, 0, 128, 128);

  const rowHeight = 32;
  for (let row = 0; row < 4; row++) {
    const y = row * rowHeight;
    const shift = (row % 2 === 1) ? 32 : 0;
    const brickWidth = 64;

    for (let col = -1; col < 3; col++) {
      const x = col * brickWidth + shift;
      ctx.fillStyle = '#d97706';
      ctx.fillRect(x + 2, y + 2, brickWidth - 4, rowHeight - 4);

      // Engraved geometric temple hieroglyph
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 12, y + 8, brickWidth - 24, rowHeight - 16);

      // Diamond motif
      ctx.beginPath();
      ctx.moveTo(x + brickWidth / 2, y + 6);
      ctx.lineTo(x + brickWidth / 2 + 8, y + rowHeight / 2);
      ctx.lineTo(x + brickWidth / 2, y + rowHeight - 6);
      ctx.lineTo(x + brickWidth / 2 - 8, y + rowHeight / 2);
      ctx.closePath();
      ctx.stroke();

      // Brick highlight & shadow
      ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
      ctx.fillRect(x + 2, y + 2, brickWidth - 4, 2);
      ctx.fillRect(x + 2, y + 2, 2, rowHeight - 4);
      ctx.fillStyle = 'rgba(69, 26, 3, 0.45)';
      ctx.fillRect(x + 2, y + rowHeight - 4, brickWidth - 4, 2);
      ctx.fillRect(x + brickWidth - 4, y + 2, 2, rowHeight - 4);
    }

    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, y + rowHeight - 2, 128, 2);
  }

  return finalizeTexture(canvas, key);
}

// ==================== CYBER / NEON THEME TEXTURES ====================

// Procedural Cyber Top - Dark carbon hex grid with luminous neon circuits
export function getCyberTopTexture(): THREE.CanvasTexture {
  const key = 'cyber_top_v1';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 128, 128);

  // Tech carbon grid
  const sz = 16;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 128; x += sz) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, 128);
    ctx.moveTo(0, x); ctx.lineTo(128, x);
    ctx.stroke();
  }

  // Glowing Neon Cyan circuitry
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, 16); ctx.lineTo(112, 16); ctx.lineTo(112, 112); ctx.lineTo(16, 112); ctx.closePath();
  ctx.moveTo(40, 40); ctx.lineTo(88, 40); ctx.lineTo(88, 88); ctx.lineTo(40, 88); ctx.closePath();
  ctx.stroke();

  // Corner circuit nodes
  [
    [16, 16], [112, 16], [16, 112], [112, 112],
    [40, 40], [88, 40], [40, 88], [88, 88]
  ].forEach(([nx, ny]) => {
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(nx, ny, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Center luminous quantum node
  ctx.fillStyle = '#ec4899';
  ctx.beginPath();
  ctx.arc(64, 64, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(64, 64, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Outer glowing bevel
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 124, 124);

  return finalizeTexture(canvas, key);
}

// Procedural Cyber Side - Industrial dark titanium plating with neon LED conduits
export function getCyberSideTexture(): THREE.CanvasTexture {
  const key = 'cyber_side_v1';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 128, 128);

  // Titanium panel division
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(4, 4, 120, 120);

  // Vertical neon LED power conduit
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(60, 0, 8, 128);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(62, 0, 4, 128);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(63, 0, 2, 128);

  // Status LED indicators
  [20, 50, 80, 110].forEach((y) => {
    ctx.fillStyle = '#10b981';
    ctx.fillRect(16, y, 6, 4);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(106, y, 6, 4);
  });

  // Corner industrial titanium hex bolts
  [
    [12, 12], [116, 12], [12, 116], [116, 116]
  ].forEach(([bx, by]) => {
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(bx, by, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Outer border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 126, 126);

  return finalizeTexture(canvas, key);
}

// Procedural Cyber Tile - Quantum neon matrix structure block
export function getCyberTileTexture(): THREE.CanvasTexture {
  const key = 'cyber_tile_v1';
  if (textureCache[key]) return textureCache[key];

  const [canvas, ctx] = createCanvas(128, 128);

  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, 128, 128);

  // Concentric diamond neon lattices
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, 112, 112);

  ctx.save();
  ctx.translate(64, 64);
  ctx.rotate(Math.PI / 4);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.strokeRect(-28, -28, 56, 56);

  ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
  ctx.fillRect(-28, -28, 56, 56);

  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 2;
  ctx.strokeRect(-14, -14, 28, 28);
  ctx.restore();

  // Edge neon pulses
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(0, 0, 128, 2);
  ctx.fillRect(0, 126, 128, 2);
  ctx.fillRect(0, 0, 2, 128);
  ctx.fillRect(126, 0, 2, 128);

  return finalizeTexture(canvas, key);
}
