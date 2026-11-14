import * as THREE from 'three';
import {
  TeamColor,
  VoxelBlock,
  ResourceType,
  MapThemeConfig,
} from '../types/game';
import {
  MAP_CONFIGS,
  createTeamsForMap,
  getDiamondIslandPositions,
} from './constants';
import {
  getGrassTopTexture,
  getDirtSideTexture,
  getStoneTexture,
  getGeneratorPadTexture,
  getBedSheetTexture,
  // Nether
  getNetherrackTopTexture,
  getBasaltSideTexture,
  getNetherBrickTexture,
  getMagmaTexture,
  // Frost
  getSnowTopTexture,
  getIceSideTexture,
  getFrostStoneTexture,
  // Desert
  getSandTopTexture,
  getSandstoneSideTexture,
  getSandstoneBrickTexture,
  // Cyber
  getCyberTopTexture,
  getCyberSideTexture,
  getCyberTileTexture,
} from './textures';

export interface MapData {
  config: MapThemeConfig;
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
  diamondPositions: [number, number, number][];
  centerPosition: [number, number, number];
}

// Convert (x, y, z) into a spatial voxel key
export function blockKey(x: number, y: number, z: number): string {
  return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
}

export function buildBedWarsMap(mapConfig: MapThemeConfig = MAP_CONFIGS.classic): MapData {
  const sceneGroup = new THREE.Group();
  const initialBlocks = new Map<string, VoxelBlock>();
  const generatorLocations: MapData['generatorLocations'] = [];
  const shopkeeperLocations: MapData['shopkeeperLocations'] = [];
  const bedMeshes = new Map<TeamColor, THREE.Group>();

  const islandY = mapConfig.islandY;
  const teams = createTeamsForMap(mapConfig.baseIslandDistance, islandY);
  const diamondPositions = getDiamondIslandPositions(mapConfig.diamondIslandDistance, islandY);
  const centerPosition: [number, number, number] = [0, islandY + 1, 0];

  // ==================== MATERIAL SELECTOR PER MAP THEME ====================
  let topMat: THREE.Material;
  let sideMat: THREE.Material;
  let stoneMat: THREE.Material;

  if (mapConfig.id === 'nether') {
    topMat = new THREE.MeshStandardMaterial({
      map: getNetherrackTopTexture(),
      roughness: 0.85,
    });
    sideMat = new THREE.MeshStandardMaterial({
      map: getBasaltSideTexture(),
      roughness: 0.9,
    });
    stoneMat = new THREE.MeshStandardMaterial({
      map: getNetherBrickTexture(),
      roughness: 0.7,
    });
  } else if (mapConfig.id === 'frost') {
    topMat = new THREE.MeshStandardMaterial({
      map: getSnowTopTexture(),
      roughness: 0.65,
    });
    sideMat = new THREE.MeshStandardMaterial({
      map: getIceSideTexture(),
      roughness: 0.4,
      metalness: 0.1,
    });
    stoneMat = new THREE.MeshStandardMaterial({
      map: getFrostStoneTexture(),
      roughness: 0.6,
    });
  } else if (mapConfig.id === 'desert') {
    topMat = new THREE.MeshStandardMaterial({
      map: getSandTopTexture(),
      roughness: 0.9,
    });
    sideMat = new THREE.MeshStandardMaterial({
      map: getSandstoneSideTexture(),
      roughness: 0.85,
    });
    stoneMat = new THREE.MeshStandardMaterial({
      map: getSandstoneBrickTexture(),
      roughness: 0.7,
    });
  } else if (mapConfig.id === 'cyber') {
    topMat = new THREE.MeshStandardMaterial({
      map: getCyberTopTexture(),
      roughness: 0.35,
      metalness: 0.7,
    });
    sideMat = new THREE.MeshStandardMaterial({
      map: getCyberSideTexture(),
      roughness: 0.4,
      metalness: 0.6,
    });
    stoneMat = new THREE.MeshStandardMaterial({
      map: getCyberTileTexture(),
      roughness: 0.3,
      metalness: 0.8,
    });
  } else {
    // Classic Sky Island
    topMat = new THREE.MeshStandardMaterial({
      map: getGrassTopTexture(),
      roughness: 0.8,
    });
    sideMat = new THREE.MeshStandardMaterial({
      map: getDirtSideTexture(),
      roughness: 0.9,
    });
    stoneMat = new THREE.MeshStandardMaterial({
      map: getStoneTexture(),
      roughness: 0.7,
    });
  }

  const islandMaterials = [
    sideMat, // right
    sideMat, // left
    topMat,  // top
    sideMat, // bottom
    sideMat, // front
    sideMat, // back
  ];

  const islandBoxGeo = new THREE.BoxGeometry(1, 1, 1);

  // Helper to place immutable map blocks
  function placeIslandBlock(x: number, y: number, z: number, isTop = false, customMat?: THREE.Material) {
    const key = blockKey(x, y, z);
    if (initialBlocks.has(key)) return;

    const block: VoxelBlock = {
      id: key,
      x,
      y,
      z,
      type: 'island_base',
      hardness: 999, // Base island cannot be mined
      maxHealth: 999,
      currentHealth: 999,
    };
    initialBlocks.set(key, block);

    const mat = customMat || (isTop ? islandMaterials : stoneMat);
    const mesh = new THREE.Mesh(islandBoxGeo, mat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = isTop;
    sceneGroup.add(mesh);
  }

  // Floating tapered circular island
  function createFloatingIsland(cx: number, cy: number, cz: number, radius: number, depth = 3) {
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const distSq = x * x + z * z;
        if (distSq <= radius * radius) {
          // Top surface block
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

  // ==================== 1. BUILD BASE ISLANDS (4 TEAMS) ====================
  const baseDist = mapConfig.baseIslandDistance;
  const baseRad = mapConfig.baseRadius;

  (Object.keys(teams) as TeamColor[]).forEach((teamKey) => {
    const team = teams[teamKey];
    const baseCenterX = teamKey === 'red' ? 0 : teamKey === 'blue' ? 0 : teamKey === 'green' ? -baseDist : baseDist;
    const baseCenterZ = teamKey === 'red' ? baseDist : teamKey === 'blue' ? -baseDist : teamKey === 'green' ? 0 : 0;

    // Create main base island
    createFloatingIsland(baseCenterX, islandY, baseCenterZ, baseRad, 4);

    // Bed Model & Registration
    const [bedX, bedY, bedZ] = team.bedPosition;
    const bedGroup = createBedMesh(teamKey, bedX, bedY, bedZ, islandY);
    bedMeshes.set(teamKey, bedGroup);
    sceneGroup.add(bedGroup);

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

    // Base Iron & Gold Generator Pad
    const genX = baseCenterX;
    const genZ = baseCenterZ + (teamKey === 'red' ? 4 : teamKey === 'blue' ? -4 : 0);
    const genPad = createGeneratorPad('iron', genX, islandY + 0.55, genZ);
    sceneGroup.add(genPad);
    generatorLocations.push({
      type: 'iron',
      position: [genX, islandY + 1.2, genZ],
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

    // ==================== BASE DECORATIONS PER MAP ====================
    const decorX = baseCenterX + (teamKey === 'red' ? 4 : -4);
    const decorZ = baseCenterZ + (teamKey === 'blue' ? 4 : -4);

    if (mapConfig.id === 'classic') {
      createVoxelTree(decorX, islandY + 1, decorZ, sceneGroup);
    } else if (mapConfig.id === 'nether') {
      createBasaltSpires(decorX, islandY + 1, decorZ, sceneGroup);
    } else if (mapConfig.id === 'frost') {
      createPineTree(decorX, islandY + 1, decorZ, sceneGroup);
    } else if (mapConfig.id === 'desert') {
      createPalmTree(decorX, islandY + 1, decorZ, sceneGroup);
      createCactus(baseCenterX + (teamKey === 'red' ? -4 : 4), islandY + 1, baseCenterZ, sceneGroup);
    } else if (mapConfig.id === 'cyber') {
      createCyberBeacon(decorX, islandY + 1, decorZ, sceneGroup);
    }
  });

  // ==================== 2. BUILD 4 DIAMOND ISLANDS ====================
  diamondPositions.forEach(([dx, dy, dz]) => {
    createFloatingIsland(dx, islandY, dz, 4, 3);
    const genPad = createGeneratorPad('diamond', dx, islandY + 0.55, dz);
    sceneGroup.add(genPad);
    generatorLocations.push({
      type: 'diamond',
      position: [dx, islandY + 1.2, dz],
      mesh: genPad,
    });

    // Theme specific diamond island feature
    if (mapConfig.id === 'frost') {
      createIceSpire(dx + 2, islandY + 1, dz + 2, 2.5, sceneGroup);
    } else if (mapConfig.id === 'desert') {
      createCactus(dx - 2, islandY + 1, dz - 2, sceneGroup);
    } else if (mapConfig.id === 'cyber') {
      createCyberNodeLight(dx, islandY + 1, dz, sceneGroup);
    }
  });

  // ==================== 3. BUILD CENTER EMERALD ISLAND ====================
  const [cx, cy, cz] = centerPosition;
  const centerRad = mapConfig.centerIslandRadius;
  createFloatingIsland(cx, islandY, cz, centerRad, 5);

  // Center raised dais / platform
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      if (Math.abs(x) + Math.abs(z) <= 6) {
        placeIslandBlock(cx + x, islandY + 1, cz + z, true);
      }
    }
  }

  // 2 Emerald Generators in Center Island
  const em1 = createGeneratorPad('emerald', cx - 3, islandY + 1.55, cz);
  const em2 = createGeneratorPad('emerald', cx + 3, islandY + 1.55, cz);
  sceneGroup.add(em1);
  sceneGroup.add(em2);
  generatorLocations.push({
    type: 'emerald',
    position: [cx - 3, islandY + 2.2, cz],
    mesh: em1,
  });
  generatorLocations.push({
    type: 'emerald',
    position: [cx + 3, islandY + 2.2, cz],
    mesh: em2,
  });

  // Center Pillars / Monoliths per Theme
  buildCenterMonoliths(mapConfig.id, cx, islandY, cz, sceneGroup);

  // ==================== 4. FLOATING SKY ELEMENTS ====================
  buildSkyAtmosphere(mapConfig.id, sceneGroup);

  return {
    config: mapConfig,
    sceneGroup,
    initialBlocks,
    generatorLocations,
    shopkeeperLocations,
    bedMeshes,
    diamondPositions,
    centerPosition,
  };
}

// ==================== THEME SPECIFIC BUILDERS & DECORATIONS ====================

// Center Island Monoliths
function buildCenterMonoliths(
  themeId: string,
  cx: number,
  islandY: number,
  cz: number,
  parent: THREE.Group
) {
  const pillarCoords = [
    [-5, -5],
    [5, -5],
    [-5, 5],
    [5, 5],
  ];

  if (themeId === 'nether') {
    // Obsidian Spire Towers with Magma Core
    const obsMat = new THREE.MeshStandardMaterial({
      color: 0x1a0b2e,
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0x4c1d95,
      emissiveIntensity: 0.35,
    });
    const magmaMat = new THREE.MeshStandardMaterial({
      map: getMagmaTexture(),
      emissive: 0xf97316,
      emissiveIntensity: 0.6,
      roughness: 0.5,
    });
    const spireGeo = new THREE.BoxGeometry(1.4, 5, 1.4);
    const crownGeo = new THREE.OctahedronGeometry(0.8, 0);

    pillarCoords.forEach(([px, pz]) => {
      const spire = new THREE.Mesh(spireGeo, obsMat);
      spire.position.set(cx + px, islandY + 3.5, cz + pz);
      spire.castShadow = true;
      parent.add(spire);

      const crown = new THREE.Mesh(crownGeo, magmaMat);
      crown.position.set(cx + px, islandY + 6.4, cz + pz);
      parent.add(crown);
    });
  } else if (themeId === 'frost') {
    // Ice Crystal Monoliths
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
      metalness: 0.3,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
    });
    const obeliskGeo = new THREE.CylinderGeometry(0.5, 0.9, 5, 6);

    pillarCoords.forEach(([px, pz]) => {
      const obelisk = new THREE.Mesh(obeliskGeo, iceMat);
      obelisk.position.set(cx + px, islandY + 3.5, cz + pz);
      obelisk.castShadow = true;
      parent.add(obelisk);
    });
  } else if (themeId === 'desert') {
    // Ancient Sandstone Obelisks with Golden Capstones
    const sandBrickMat = new THREE.MeshStandardMaterial({
      map: getSandstoneBrickTexture(),
      roughness: 0.75,
    });
    const goldCapMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xd97706,
      emissiveIntensity: 0.3,
    });

    const obeliskGeo = new THREE.BoxGeometry(1.2, 5, 1.2);
    const pyramidionGeo = new THREE.ConeGeometry(0.9, 1.2, 4);

    pillarCoords.forEach(([px, pz]) => {
      const col = new THREE.Mesh(obeliskGeo, sandBrickMat);
      col.position.set(cx + px, islandY + 3.5, cz + pz);
      col.castShadow = true;
      parent.add(col);

      const cap = new THREE.Mesh(pyramidionGeo, goldCapMat);
      cap.position.set(cx + px, islandY + 6.6, cz + pz);
      cap.rotation.y = Math.PI / 4;
      parent.add(cap);
    });
  } else if (themeId === 'cyber') {
    // Sci-fi Neon Quantum Beacons
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8,
    });
    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const columnGeo = new THREE.BoxGeometry(1.0, 5, 1.0);
    const ringGeo = new THREE.TorusGeometry(1.1, 0.15, 8, 16);

    pillarCoords.forEach(([px, pz]) => {
      const col = new THREE.Mesh(columnGeo, darkMetalMat);
      col.position.set(cx + px, islandY + 3.5, cz + pz);
      col.castShadow = true;
      parent.add(col);

      const ring1 = new THREE.Mesh(ringGeo, cyanGlowMat);
      ring1.position.set(cx + px, islandY + 4, cz + pz);
      ring1.rotation.x = Math.PI / 2;
      parent.add(ring1);

      const ring2 = new THREE.Mesh(ringGeo, cyanGlowMat);
      ring2.position.set(cx + px, islandY + 6, cz + pz);
      ring2.rotation.x = Math.PI / 2;
      parent.add(ring2);
    });
  } else {
    // Classic Stone Pillars
    const pillarMat = new THREE.MeshStandardMaterial({
      map: getStoneTexture(),
      roughness: 0.6,
    });
    const pillarGeo = new THREE.BoxGeometry(1.2, 4, 1.2);

    pillarCoords.forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(cx + px, islandY + 3, cz + pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      parent.add(pillar);
    });
  }
}

// Sky Atmosphere per Theme
function buildSkyAtmosphere(themeId: string, sceneGroup: THREE.Group) {
  const cloudPositions: [number, number, number][] = [
    [-32, 32, -26],
    [36, 30, 22],
    [-22, 34, 36],
    [26, 33, -36],
    [0, 36, 0],
    [-38, 28, 15],
    [30, 31, -18],
  ];

  if (themeId === 'nether') {
    // Dark volcanic ash & crimson clouds
    cloudPositions.forEach(([clX, clY, clZ]) => {
      createVoxelCloud(clX, clY, clZ, sceneGroup, 0x3d1414, 0.85);
    });
  } else if (themeId === 'frost') {
    // Polar blizzard mist clouds
    cloudPositions.forEach(([clX, clY, clZ]) => {
      createVoxelCloud(clX, clY, clZ, sceneGroup, 0xe0f2fe, 0.82);
    });
  } else if (themeId === 'desert') {
    // Amber golden sunset clouds
    cloudPositions.forEach(([clX, clY, clZ]) => {
      createVoxelCloud(clX, clY, clZ, sceneGroup, 0xfef08a, 0.8);
    });
  } else if (themeId === 'cyber') {
    // Floating Holographic Tech Data Polyhedrons in the void
    const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
    const cubeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      wireframe: true,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
    });
    cloudPositions.forEach(([clX, clY, clZ]) => {
      const cube = new THREE.Mesh(cubeGeo, cubeMat);
      cube.position.set(clX, clY, clZ);
      cube.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      sceneGroup.add(cube);
    });
  } else {
    // Classic fluffy white clouds
    cloudPositions.forEach(([clX, clY, clZ]) => {
      createVoxelCloud(clX, clY, clZ, sceneGroup, 0xffffff, 0.88);
    });
  }
}

// Procedural Voxel Cloud
function createVoxelCloud(
  cx: number,
  cy: number,
  cz: number,
  parent: THREE.Group,
  color = 0xffffff,
  opacity = 0.88
) {
  const cloudGroup = new THREE.Group();
  cloudGroup.position.set(cx, cy, cz);
  const cloudGeo = new THREE.BoxGeometry(2.5, 1.2, 2.5);
  const cloudMat = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.9,
  });

  for (let x = -3; x <= 3; x++) {
    for (let z = -2; z <= 2; z++) {
      if (Math.hypot(x / 3, z / 2) <= 1.0) {
        const mesh = new THREE.Mesh(cloudGeo, cloudMat);
        mesh.position.set(x * 2.5, Math.random() > 0.6 ? 0.6 : 0, z * 2.5);
        cloudGroup.add(mesh);
      }
    }
  }
  parent.add(cloudGroup);
}

// Classic Oak Tree
function createVoxelTree(x: number, y: number, z: number, parent: THREE.Group) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4c28, roughness: 0.8 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d7a22, roughness: 0.6 });

  const trunkGeo = new THREE.BoxGeometry(1, 4, 1);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(x, y + 2, z);
  trunk.castShadow = true;
  parent.add(trunk);

  const canopyGeo = new THREE.BoxGeometry(3, 2.5, 3);
  const canopy = new THREE.Mesh(canopyGeo, leafMat);
  canopy.position.set(x, y + 4.5, z);
  canopy.castShadow = true;
  parent.add(canopy);
}

// Nether Basalt & Magma Spires
function createBasaltSpires(x: number, y: number, z: number, parent: THREE.Group) {
  const basaltMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.9 });
  const magmaMat = new THREE.MeshStandardMaterial({
    map: getMagmaTexture(),
    emissive: 0xf97316,
    emissiveIntensity: 0.5,
    roughness: 0.6,
  });

  const colGeo = new THREE.BoxGeometry(1.2, 4, 1.2);
  const col = new THREE.Mesh(colGeo, basaltMat);
  col.position.set(x, y + 2, z);
  col.castShadow = true;
  parent.add(col);

  const crownGeo = new THREE.BoxGeometry(1.6, 0.8, 1.6);
  const crown = new THREE.Mesh(crownGeo, magmaMat);
  crown.position.set(x, y + 4.4, z);
  parent.add(crown);
}

// Frost Pine Tree with Snow Layers
function createPineTree(x: number, y: number, z: number, parent: THREE.Group) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.85 });
  const needleMat = new THREE.MeshStandardMaterial({ color: 0x1e3a2b, roughness: 0.7 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });

  // Trunk
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.5, 0.8), trunkMat);
  trunk.position.set(x, y + 2.25, z);
  trunk.castShadow = true;
  parent.add(trunk);

  // 3 Layered Pine Foliage tiers with snow caps
  const tiers = [
    { size: 3.2, height: 1.0, yOffset: 3.2 },
    { size: 2.4, height: 1.0, yOffset: 4.2 },
    { size: 1.6, height: 1.0, yOffset: 5.2 },
  ];

  tiers.forEach((t) => {
    const fol = new THREE.Mesh(new THREE.BoxGeometry(t.size, t.height, t.size), needleMat);
    fol.position.set(x, y + t.yOffset, z);
    fol.castShadow = true;
    parent.add(fol);

    const snowCap = new THREE.Mesh(new THREE.BoxGeometry(t.size * 0.9, 0.25, t.size * 0.9), snowMat);
    snowCap.position.set(x, y + t.yOffset + t.height / 2 + 0.1, z);
    parent.add(snowCap);
  });
}

// Frost Ice Spire
function createIceSpire(x: number, y: number, z: number, height: number, parent: THREE.Group) {
  const iceMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.8,
    roughness: 0.2,
    metalness: 0.4,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4,
  });
  const spireGeo = new THREE.ConeGeometry(0.6, height, 5);
  const spire = new THREE.Mesh(spireGeo, iceMat);
  spire.position.set(x, y + height / 2, z);
  spire.castShadow = true;
  parent.add(spire);
}

// Desert Palm Tree
function createPalmTree(x: number, y: number, z: number, parent: THREE.Group) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.85 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.6 });

  // Curved palm trunk
  const trunkGeo = new THREE.BoxGeometry(0.9, 4.5, 0.9);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(x, y + 2.25, z);
  trunk.rotation.z = 0.08;
  trunk.castShadow = true;
  parent.add(trunk);

  // Sprawling palm fronds
  const frondGeo = new THREE.BoxGeometry(3.2, 0.35, 1.2);
  const frond1 = new THREE.Mesh(frondGeo, frondMat);
  frond1.position.set(x + 0.2, y + 4.6, z);
  frond1.castShadow = true;
  parent.add(frond1);

  const frond2 = new THREE.Mesh(frondGeo, frondMat);
  frond2.position.set(x + 0.2, y + 4.6, z);
  frond2.rotation.y = Math.PI / 2;
  frond2.castShadow = true;
  parent.add(frond2);
}

// Desert Saguaro Cactus
function createCactus(x: number, y: number, z: number, parent: THREE.Group) {
  const cactusMat = new THREE.MeshStandardMaterial({ color: 0x226b38, roughness: 0.75 });

  // Main stem
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.2, 0.8), cactusMat);
  stem.position.set(x, y + 1.6, z);
  stem.castShadow = true;
  parent.add(stem);

  // Side arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), cactusMat);
  arm.position.set(x + 0.7, y + 2.0, z);
  arm.castShadow = true;
  parent.add(arm);
}

// Cyber Neon Holographic Beacon
function createCyberBeacon(x: number, y: number, z: number, parent: THREE.Group) {
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
  const cyanGlowMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 0.8,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), darkMat);
  base.position.set(x, y + 0.3, z);
  parent.add(base);

  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.5, 0.4), cyanGlowMat);
  beam.position.set(x, y + 2.05, z);
  parent.add(beam);

  const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), cyanGlowMat);
  cap.position.set(x, y + 4.2, z);
  parent.add(cap);
}

// Cyber Node Light for Diamond Islands
function createCyberNodeLight(x: number, y: number, z: number, parent: THREE.Group) {
  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    emissive: 0xec4899,
    emissiveIntensity: 0.8,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.1, 6, 16), nodeMat);
  ring.position.set(x, y + 0.6, z);
  ring.rotation.x = Math.PI / 2;
  parent.add(ring);
}

// 3D Bed Mesh (Wood Frame + Team Blanket + White Pillow)
function createBedMesh(
  team: TeamColor,
  x: number,
  y: number,
  z: number,
  islandY = 10
): THREE.Group {
  const bedGroup = new THREE.Group();

  const isAlongX = team === 'green' || team === 'yellow';
  const offsetX = team === 'green' ? -0.5 : team === 'yellow' ? 0.5 : 0;
  const offsetZ = team === 'red' ? 0.5 : team === 'blue' ? -0.5 : 0;

  bedGroup.position.set(x + offsetX, islandY + 0.5, z + offsetZ);
  if (isAlongX) {
    bedGroup.rotation.y = Math.PI / 2;
  }

  // Wood frame
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
  ctx.strokeStyle =
    team === 'red' ? '#ef4444' : team === 'blue' ? '#3b82f6' : team === 'green' ? '#10b981' : '#eab308';
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
