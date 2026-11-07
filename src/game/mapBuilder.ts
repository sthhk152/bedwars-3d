import * as THREE from 'three';
import {
  TeamColor,
  VoxelBlock,
  DroppedItem,
  ResourceType,
} from '../types/game';
import {
  INITIAL_TEAMS,
  DIAMOND_ISLANDS_POSITIONS,
  CENTER_ISLAND_POSITION,
  ISLAND_Y,
} from './constants';
import {
  getGrassTopTexture,
  getDirtSideTexture,
  getStoneTexture,
  getGeneratorPadTexture,
  getBedSheetTexture,
} from './textures';

export interface MapData {
  sceneGroup: THREE.Group;
  initialBlocks: Map<string, VoxelBlock>;
  generatorLocations: {
    type: ResourceType;
    position: [number, number, number];
    team?: TeamColor;
    mesh: THREE.Group;
  }[];
  shopkeeperLocations: {
    team: TeamColor;
    position: [number, number, number];
  }[];
  bedMeshes: Map<TeamColor, THREE.Group>;
}

// Convert (x, y, z) into a spatial voxel key
export function blockKey(x: number, y: number, z: number): string {
  return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
}

export function buildBedWarsMap(): MapData {
  const sceneGroup = new THREE.Group();
  const initialBlocks = new Map<string, VoxelBlock>();
  const generatorLocations: MapData['generatorLocations'] = [];
  const shopkeeperLocations: MapData['shopkeeperLocations'] = [];
  const bedMeshes = new Map<TeamColor, THREE.Group>();

  // Shared Materials
  const grassTopMat = new THREE.MeshStandardMaterial({
    map: getGrassTopTexture(),
    roughness: 0.8,
  });

  const dirtSideMat = new THREE.MeshStandardMaterial({
    map: getDirtSideTexture(),
    roughness: 0.9,
  });

  const stoneMat = new THREE.MeshStandardMaterial({
    map: getStoneTexture(),
    roughness: 0.7,
  });

  const woodTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x6d4c28,
    roughness: 0.8,
  });

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x3d7a22,
    roughness: 0.6,
  });

  // Helper to add voxel block to spatial dictionary & mesh group
  const islandBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const islandMaterials = [
    dirtSideMat, // right
    dirtSideMat, // left
    grassTopMat,  // top
    dirtSideMat, // bottom
    dirtSideMat, // front
    dirtSideMat, // back
  ];

  function placeIslandBlock(x: number, y: number, z: number, isTop = false) {
    const key = blockKey(x, y, z);
    if (initialBlocks.has(key)) return;

    const block: VoxelBlock = {
      id: key,
      x,
      y,
      z,
      type: 'island_base',
      hardness: 999, // Base island is indestructible
      maxHealth: 999,
      currentHealth: 999,
    };
    initialBlocks.set(key, block);

    const mesh = new THREE.Mesh(islandBoxGeo, isTop ? islandMaterials : stoneMat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = isTop;
    sceneGroup.add(mesh);
  }

  // Build a floating circular island with tapered rocky base
  function createFloatingIsland(cx: number, cy: number, cz: number, radius: number, depth = 3) {
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const distSq = x * x + z * z;
        if (distSq <= radius * radius) {
          // Top grass layer
          placeIslandBlock(cx + x, cy, cz + z, true);

          // Under-layers (taper down)
          const taper = Math.max(1, Math.floor(depth * (1 - Math.sqrt(distSq) / (radius + 0.5))));
          for (let d = 1; d <= taper; d++) {
            placeIslandBlock(cx + x, cy - d, cz + z, false);
          }
        }
      }
    }
  }

  // 1. Build Base Islands for 4 Teams
  (Object.keys(INITIAL_TEAMS) as TeamColor[]).forEach((teamKey) => {
    const team = INITIAL_TEAMS[teamKey];
    const [spawnX, , spawnZ] = team.spawnPosition;
    const baseCenterX = teamKey === 'red' ? 0 : teamKey === 'blue' ? 0 : teamKey === 'green' ? -36 : 36;
    const baseCenterZ = teamKey === 'red' ? 36 : teamKey === 'blue' ? -36 : teamKey === 'green' ? 0 : 0;

    // Create main base island (radius 7 blocks)
    createFloatingIsland(baseCenterX, ISLAND_Y, baseCenterZ, 7, 4);

    // Bed Model
    const [bedX, bedY, bedZ] = team.bedPosition;
    const bedGroup = createBedMesh(teamKey, bedX, bedY, bedZ);
    bedMeshes.set(teamKey, bedGroup);
    sceneGroup.add(bedGroup);

    // Register bed block in spatial map - BOTH halves of the 2-block bed!
    const bedOffsetZ = teamKey === 'red' ? 1 : teamKey === 'blue' ? -1 : 0;
    const bedOffsetX = teamKey === 'green' ? -1 : teamKey === 'yellow' ? 1 : 0;

    const bedBlock1: VoxelBlock = {
      id: `bed_${teamKey}`,
      x: bedX,
      y: bedY,
      z: bedZ,
      type: 'bed',
      team: teamKey,
      hardness: 1.2,
      maxHealth: 100,
      currentHealth: 100,
    };
    const bedBlock2: VoxelBlock = {
      id: `bed_${teamKey}`,
      x: bedX + bedOffsetX,
      y: bedY,
      z: bedZ + bedOffsetZ,
      type: 'bed',
      team: teamKey,
      hardness: 1.2,
      maxHealth: 100,
      currentHealth: 100,
    };

    initialBlocks.set(blockKey(bedX, bedY, bedZ), bedBlock1);
    initialBlocks.set(blockKey(bedX + bedOffsetX, bedY, bedZ + bedOffsetZ), bedBlock2);

    // Base Generator Pad (spawns Iron & Gold)
    const genX = baseCenterX;
    const genZ = baseCenterZ + (teamKey === 'red' ? 4 : teamKey === 'blue' ? -4 : 0);
    const genPad = createGeneratorPad('iron', genX, ISLAND_Y + 0.55, genZ);
    sceneGroup.add(genPad);
    generatorLocations.push({
      type: 'iron',
      position: [genX, ISLAND_Y + 1.2, genZ],
      team: teamKey,
      mesh: genPad,
    });

    // Shopkeeper NPC
    const [shopX, shopY, shopZ] = team.shopPosition;
    const shopkeeper = createShopkeeperNPC(shopX, shopY, shopZ, teamKey);
    sceneGroup.add(shopkeeper);
    shopkeeperLocations.push({
      team: teamKey,
      position: [shopX, shopY, shopZ],
    });

    // Decorative Voxel Trees on Base Island
    const treeX = baseCenterX + (teamKey === 'red' ? 4 : -4);
    const treeZ = baseCenterZ + (teamKey === 'blue' ? 4 : -4);
    createVoxelTree(treeX, ISLAND_Y + 1, treeZ, sceneGroup, woodTrunkMat, leafMat);
  });

  // 2. Build 4 Diamond Islands
  DIAMOND_ISLANDS_POSITIONS.forEach(([dx, dy, dz], idx) => {
    createFloatingIsland(dx, dy, dz, 4, 3);
    const genPad = createGeneratorPad('diamond', dx, dy + 0.55, dz);
    sceneGroup.add(genPad);
    generatorLocations.push({
      type: 'diamond',
      position: [dx, dy + 1.2, dz],
      mesh: genPad,
    });
  });

  // 3. Build Center Emerald Island (radius 10)
  const [cx, cy, cz] = CENTER_ISLAND_POSITION;
  createFloatingIsland(cx, cy, cz, 10, 5);

  // Center raised dais / platform
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      if (Math.abs(x) + Math.abs(z) <= 6) {
        placeIslandBlock(cx + x, cy + 1, cz + z, true);
      }
    }
  }

  // 2 Emerald Generators in Center Island
  const em1 = createGeneratorPad('emerald', cx - 3, cy + 1.55, cz);
  const em2 = createGeneratorPad('emerald', cx + 3, cy + 1.55, cz);
  sceneGroup.add(em1);
  sceneGroup.add(em2);
  generatorLocations.push({
    type: 'emerald',
    position: [cx - 3, cy + 2.2, cz],
    mesh: em1,
  });
  generatorLocations.push({
    type: 'emerald',
    position: [cx + 3, cy + 2.2, cz],
    mesh: em2,
  });

  // 4 Stone Pillars at Center for tactical cover
  const pillarMat = new THREE.MeshStandardMaterial({
    map: getStoneTexture(),
    roughness: 0.6,
  });
  const pillarGeo = new THREE.BoxGeometry(1.2, 4, 1.2);
  [
    [-5, -5],
    [5, -5],
    [-5, 5],
    [5, 5],
  ].forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(cx + px, cy + 3, cz + pz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    sceneGroup.add(pillar);
  });

  // Floating Procedural Voxel Clouds in the sky
  const cloudPositions: [number, number, number][] = [
    [-30, 32, -25],
    [35, 30, 20],
    [-20, 34, 35],
    [25, 33, -35],
    [0, 36, 0],
  ];
  cloudPositions.forEach(([clX, clY, clZ]) => {
    createVoxelCloud(clX, clY, clZ, sceneGroup);
  });

  return {
    sceneGroup,
    initialBlocks,
    generatorLocations,
    shopkeeperLocations,
    bedMeshes,
  };
}

// Procedural Voxel Cloud
function createVoxelCloud(cx: number, cy: number, cz: number, parent: THREE.Group) {
  const cloudGroup = new THREE.Group();
  cloudGroup.position.set(cx, cy, cz);
  const cloudGeo = new THREE.BoxGeometry(2.5, 1.2, 2.5);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.88,
    roughness: 0.9,
  });

  for (let x = -3; x <= 3; x++) {
    for (let z = -2; z <= 2; z++) {
      if (Math.hypot(x / 3, z / 2) <= 1.0) {
        const mesh = new THREE.Mesh(cloudGeo, cloudMat);
        mesh.position.set(x * 2.5, (Math.random() > 0.6 ? 0.6 : 0), z * 2.5);
        cloudGroup.add(mesh);
      }
    }
  }
  parent.add(cloudGroup);
}

// 3D Bed Mesh (Wood Frame + Team Blanket + White Pillow)
function createBedMesh(team: TeamColor, x: number, y: number, z: number): THREE.Group {
  const bedGroup = new THREE.Group();

  // Shift center so it spans the 2 blocks
  const isAlongX = team === 'green' || team === 'yellow';
  const offsetX = team === 'green' ? -0.5 : team === 'yellow' ? 0.5 : 0;
  const offsetZ = team === 'red' ? 0.5 : team === 'blue' ? -0.5 : 0;

  // y is 11, grass surface is at 10.5
  bedGroup.position.set(x + offsetX, 10.5, z + offsetZ);
  if (isAlongX) {
    bedGroup.rotation.y = Math.PI / 2;
  }

  // Wood frame (1.15 wide, 0.35 high, 2.05 long)
  const frameGeo = new THREE.BoxGeometry(1.15, 0.35, 2.05);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.8 });
  const frameMesh = new THREE.Mesh(frameGeo, frameMat);
  frameMesh.position.y = 0.18;
  frameMesh.castShadow = true;
  bedGroup.add(frameMesh);

  // Mattress / Sheet
  const mattressGeo = new THREE.BoxGeometry(1.1, 0.25, 2.0);
  const sheetMat = new THREE.MeshStandardMaterial({
    map: getBedSheetTexture(team),
    roughness: 0.6,
  });
  const mattressMesh = new THREE.Mesh(mattressGeo, sheetMat);
  mattressMesh.position.y = 0.45;
  mattressMesh.castShadow = true;
  bedGroup.add(mattressMesh);

  // Pillow
  const pillowGeo = new THREE.BoxGeometry(0.95, 0.15, 0.55);
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const pillowMesh = new THREE.Mesh(pillowGeo, pillowMat);
  pillowMesh.position.set(0, 0.58, -0.65);
  bedGroup.add(pillowMesh);

  // Floating Bed Icon Label
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 54;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.roundRect(4, 4, 152, 46, 10);
  ctx.fill();
  ctx.strokeStyle = team === 'red' ? '#ef4444' : team === 'blue' ? '#3b82f6' : team === 'green' ? '#10b981' : '#eab308';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BED 🛏️', 80, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.y = 1.6;
  sprite.scale.set(1.6, 0.55, 1);
  bedGroup.add(sprite);

  return bedGroup;
}

// Generator Pad with floating spinning diamond/ingot
function createGeneratorPad(type: ResourceType, x: number, y: number, z: number): THREE.Group {
  const padGroup = new THREE.Group();
  padGroup.position.set(x, y, z);

  // Base platform
  const baseGeo = new THREE.BoxGeometry(2, 0.2, 2);
  const padMat = new THREE.MeshStandardMaterial({
    map: getGeneratorPadTexture(type),
    roughness: 0.5,
  });
  const baseMesh = new THREE.Mesh(baseGeo, padMat);
  baseMesh.receiveShadow = true;
  padGroup.add(baseMesh);

  // Floating rotating gem/ingot
  const gemGroup = new THREE.Group();
  gemGroup.position.y = 1.2;

  const gemColors: Record<ResourceType, { color: number; emissive: number }> = {
    iron: { color: 0xf1f5f9, emissive: 0x94a3b8 },
    gold: { color: 0xfbbf24, emissive: 0xd97706 },
    diamond: { color: 0x38bdf8, emissive: 0x0284c7 },
    emerald: { color: 0x4ade80, emissive: 0x16a34a },
  };

  const gemMat = new THREE.MeshStandardMaterial({
    color: gemColors[type].color,
    emissive: gemColors[type].emissive,
    emissiveIntensity: 0.4,
    metalness: 0.8,
    roughness: 0.2,
  });

  const gemGeo = new THREE.OctahedronGeometry(0.45, 0);
  const gemMesh = new THREE.Mesh(gemGeo, gemMat);
  gemGroup.add(gemMesh);

  padGroup.add(gemGroup);
  padGroup.userData = { gemGroup };

  return padGroup;
}

// Shopkeeper NPC with greeting sign
function createShopkeeperNPC(x: number, y: number, z: number, team: TeamColor): THREE.Group {
  const shopGroup = new THREE.Group();
  shopGroup.position.set(x, y, z);

  // Stall / table
  const tableGeo = new THREE.BoxGeometry(1.6, 0.8, 0.8);
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.position.y = 0.4;
  shopGroup.add(table);

  // Shopkeeper Body
  const bodyGeo = new THREE.BoxGeometry(0.7, 1.0, 0.5);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.6 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 1.1, -0.6);
  shopGroup.add(body);

  // Shopkeeper Head (cute villager)
  const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcf33, roughness: 0.6 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 1.85, -0.6);
  shopGroup.add(head);

  // Overhead Floating Shop Marker
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 54;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
  ctx.roundRect(4, 4, 152, 46, 12);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 22px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ITEM SHOP 🛒', 80, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(0, 2.7, -0.6);
  sprite.scale.set(2.0, 0.65, 1);
  shopGroup.add(sprite);

  return shopGroup;
}

// Procedural Voxel Tree
function createVoxelTree(
  x: number,
  y: number,
  z: number,
  parent: THREE.Group,
  trunkMat: THREE.Material,
  leafMat: THREE.Material
) {
  // Trunk (1x1x4)
  const trunkGeo = new THREE.BoxGeometry(1, 4, 1);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(x, y + 2, z);
  trunk.castShadow = true;
  parent.add(trunk);

  // Leaves (3x3x3 blocky cluster)
  const canopyGeo = new THREE.BoxGeometry(3, 2.5, 3);
  const canopy = new THREE.Mesh(canopyGeo, leafMat);
  canopy.position.set(x, y + 4.5, z);
  canopy.castShadow = true;
  parent.add(canopy);
}
