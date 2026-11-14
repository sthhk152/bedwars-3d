import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CameraMode,
  CharacterState,
  DroppedItem,
  InventorySlot,
  KillFeedEntry,
  Projectile,
  ResourceType,
  ShopItem,
  TeamColor,
  TeamInfo,
  TNTEntity,
  VoxelBlock,
  MapThemeConfig,
  MapId,
} from '../types/game';
import {
  INITIAL_TEAMS,
  WEAPON_DAMAGE,
  ARMOR_REDUCTION,
  VOID_KILL_Y,
  BLOCK_HARDNESS,
  getRandomMap,
  getMapById,
  createTeamsForMap,
  MAP_CONFIGS,
} from './constants';
import { buildBedWarsMap, blockKey, MapData } from './mapBuilder';
import { createCharacterAvatar, AvatarMeshObject } from './avatar';
import { physics } from './physics';
import { aiController } from './aiController';
import { sounds } from '../audio/soundEffects';
import { getWoolTexture, getWoodTexture, getObsidianTexture } from './textures';

// Software WebGL probe
export const isSoftwareGl = (() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

// Module-scope math helpers for zero GC
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _tempVec = new THREE.Vector3();

export interface GameEngineCallbacks {
  onUpdateState: (state: {
    player: CharacterState;
    teams: Record<TeamColor, TeamInfo>;
    killFeed: KillFeedEntry[];
    targetedBlock: VoxelBlock | null;
    miningProgress: number; // 0 to 1
    respawnTimer: number;
    matchEnded: boolean;
    isVictory: boolean;
    currentMap: MapThemeConfig;
  }) => void;
  onOpenShop: () => void;
}

export class BedWarsEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;

  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;

  public currentMap: MapThemeConfig = getRandomMap();
  private mapData!: MapData;
  public blocks: Map<string, VoxelBlock> = new Map();
  private blockMeshes: Map<string, THREE.Mesh> = new Map();

  // Entities
  public player!: CharacterState;
  public bots: CharacterState[] = [];
  public characterMeshes: Map<string, AvatarMeshObject> = new Map();
  public droppedItems: { item: DroppedItem; mesh: THREE.Mesh }[] = [];
  public projectiles: { data: Projectile; mesh: THREE.Mesh }[] = [];
  public tnts: { data: TNTEntity; mesh: THREE.Mesh }[] = [];
  public particles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];

  public teams: Record<TeamColor, TeamInfo> = JSON.parse(JSON.stringify(INITIAL_TEAMS));
  public killFeed: KillFeedEntry[] = [];

  // Controls & Camera
  public cameraMode: CameraMode = 'first';
  private keys: Record<string, boolean> = {};
  public mouseLocked = false;
  private isLeftMouseDown = false;
  private miningBlockKey: string | null = null;
  private miningProgress = 0;
  private targetedBlock: VoxelBlock | null = null;
  private placeTargetPos: [number, number, number] | null = null;

  // Outline box for targeted block
  private targetOutlineMesh!: THREE.LineSegments;
  // Holographic ghost block preview for bridging
  private ghostPreviewMesh!: THREE.Mesh;

  // Continuous auto-bridging
  private isRightMouseDown = false;
  private lastAutoBridgeTime = 0;

  // Generator timers
  private nextBaseGenTime = 0;
  private nextDiamondGenTime = 0;
  private nextEmeraldGenTime = 0;

  private isRunning = false;
  private clock = new THREE.Clock();
  private frameId = 0;
  private matchEnded = false;
  private isVictory = false;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.initThree();
    this.initGame();
    this.bindEvents();
    this.startLoop();
  }

  public applyMapTheme(config: MapThemeConfig) {
    if (this.scene) {
      this.scene.background = new THREE.Color(config.skyColor);
      if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
        this.scene.fog.color.set(config.fogColor);
        this.scene.fog.near = config.fogNear;
        this.scene.fog.far = config.fogFar;
      }
    }
    if (this.sunLight) {
      this.sunLight.color.set(config.sunColor);
      this.sunLight.intensity = config.sunIntensity;
    }
    if (this.hemiLight) {
      this.hemiLight.color.set(config.ambientColor);
      this.hemiLight.groundColor.set(config.ambientGroundColor);
      this.hemiLight.intensity = config.ambientIntensity;
    }
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.currentMap.skyColor);
    this.scene.fog = new THREE.Fog(this.currentMap.fogColor, this.currentMap.fogNear, this.currentMap.fogFar);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 500);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // Studio Environment Lighting via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Key Light (Sun)
    this.sunLight = new THREE.DirectionalLight(this.currentMap.sunColor, this.currentMap.sunIntensity);
    this.sunLight.position.set(45, 80, 30);
    this.sunLight.castShadow = !isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 160;
    const d = 50;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Fill Light (Atmospheric hemisphere bounce)
    this.hemiLight = new THREE.HemisphereLight(
      this.currentMap.ambientColor,
      this.currentMap.ambientGroundColor,
      this.currentMap.ambientIntensity
    );
    this.scene.add(this.hemiLight);

    // Block Outline Helper
    const outlineGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02));
    const outlineMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    this.targetOutlineMesh = new THREE.LineSegments(outlineGeo, outlineMat);
    this.targetOutlineMesh.visible = false;
    this.scene.add(this.targetOutlineMesh);

    // Holographic Ghost Block Preview for Bridging
    const ghostGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      roughness: 0.3,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
    });
    this.ghostPreviewMesh = new THREE.Mesh(ghostGeo, ghostMat);
    this.ghostPreviewMesh.visible = false;
    this.scene.add(this.ghostPreviewMesh);
  }

  private initGame() {
    // 0. Initialize teams configuration based on randomly selected map
    this.teams = createTeamsForMap(this.currentMap.baseIslandDistance, this.currentMap.islandY);

    // 1. Build map
    this.mapData = buildBedWarsMap(this.currentMap);
    this.scene.add(this.mapData.sceneGroup);
    this.blocks = new Map(this.mapData.initialBlocks);

    // 2. Initialize Player (Red Team)
    const redSpawn = this.teams.red.spawnPosition;
    this.player = {
      id: 'player',
      name: 'You (Player)',
      team: 'red',
      isBot: false,
      position: [redSpawn[0], redSpawn[1], redSpawn[2]],
      velocity: [0, 0, 0],
      yaw: 0,
      pitch: 0,
      health: 100,
      maxHealth: 100,
      isGrounded: true,
      selectedSlotIndex: 0,
      inventory: this.getInitialInventory('red'),
      currencies: { iron: 0, gold: 0, diamond: 0, emerald: 0 },
      armorTier: 0,
      swordTier: 1, // Wooden sword
      pickaxeTier: 1, // Wooden pickaxe
      hasShears: false,
      isSwinging: false,
      swingProgress: 0,
      isDead: false,
      respawnTimer: 0,
      kills: 0,
      finalKills: 0,
      bedsBroken: 0,
      blocksPlaced: 0,
    };

    const playerMesh = createCharacterAvatar('red', this.player.name, true);
    this.characterMeshes.set('player', playerMesh);
    this.scene.add(playerMesh);

    // 3. Initialize AI Bots (1 teammate for Red, 2 for Blue, 2 for Green, 2 for Yellow)
    const botConfigs: { id: string; name: string; team: TeamColor }[] = [
      { id: 'bot_red_1', name: 'RedKnight_01', team: 'red' },
      { id: 'bot_blue_1', name: 'BlueStriker', team: 'blue' },
      { id: 'bot_blue_2', name: 'AquaVoid', team: 'blue' },
      { id: 'bot_green_1', name: 'GreenCrafter', team: 'green' },
      { id: 'bot_green_2', name: 'JadePhantom', team: 'green' },
      { id: 'bot_yellow_1', name: 'YellowThunder', team: 'yellow' },
      { id: 'bot_yellow_2', name: 'SolarBlade', team: 'yellow' },
    ];

    this.bots = botConfigs.map((cfg) => {
      const spawn = this.teams[cfg.team].spawnPosition;
      const botState: CharacterState = {
        id: cfg.id,
        name: cfg.name,
        team: cfg.team,
        isBot: true,
        position: [spawn[0] + (Math.random() - 0.5) * 2, spawn[1], spawn[2] + (Math.random() - 0.5) * 2],
        velocity: [0, 0, 0],
        yaw: Math.random() * Math.PI * 2,
        pitch: 0,
        health: 100,
        maxHealth: 100,
        isGrounded: true,
        selectedSlotIndex: 0,
        inventory: this.getInitialInventory(cfg.team),
        currencies: { iron: 0, gold: 0, diamond: 0, emerald: 0 },
        armorTier: 0,
        swordTier: 1,
        pickaxeTier: 1,
        hasShears: false,
        isSwinging: false,
        swingProgress: 0,
        isDead: false,
        respawnTimer: 0,
        kills: 0,
        finalKills: 0,
        bedsBroken: 0,
        blocksPlaced: 0,
      };

      const mesh = createCharacterAvatar(cfg.team, cfg.name, false);
      this.characterMeshes.set(cfg.id, mesh);
      this.scene.add(mesh);
      return botState;
    });

    this.updateActiveHeldItems();
  }

  private getInitialInventory(team: TeamColor): (InventorySlot | null)[] {
    return [
      {
        id: 'wood_sword',
        name: 'Wooden Sword',
        nameZh: '木劍',
        icon: 'wood_sword',
        category: 'weapon',
        count: 1,
        damage: 8,
      },
      {
        id: 'wool_blocks',
        name: 'Wool',
        nameZh: '羊毛',
        icon: 'wool',
        category: 'block',
        count: 32,
        blockType: 'wool',
      },
      {
        id: 'wood_pickaxe',
        name: 'Wooden Pickaxe',
        nameZh: '木鎬',
        icon: 'pickaxe_wood',
        category: 'tool',
        count: 1,
      },
      null,
      null,
      null,
      null,
      null,
    ];
  }

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('wheel', this.onWheel);
  }

  public unbind() {
    this.isRunning = false;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('wheel', this.onWheel);
    this.renderer.dispose();
  }

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    // Hotbar 1-8
    if (e.code >= 'Digit1' && e.code <= 'Digit8') {
      const idx = parseInt(e.code.replace('Digit', '')) - 1;
      this.selectSlot(idx);
    }

    // Toggle camera perspective
    if (e.code === 'KeyV') {
      this.toggleCameraMode();
    }

    // Open shop
    if (e.code === 'KeyE') {
      this.callbacks.onOpenShop();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.mouseLocked) return;
    const sens = 0.0022;
    this.player.yaw -= e.movementX * sens;
    this.player.pitch -= e.movementY * sens;
    this.player.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.player.pitch));
  };

  private onMouseDown = (e: MouseEvent) => {
    if (!this.mouseLocked) return;

    if (e.button === 0) {
      // Left click: Attack / Mine block
      this.isLeftMouseDown = true;
      this.startPlayerAction('attack');
    } else if (e.button === 2) {
      // Right click: Place block / Throw item / Eat
      e.preventDefault();
      this.isRightMouseDown = true;
      this.executePlayerRightClick();
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isLeftMouseDown = false;
      this.miningBlockKey = null;
      this.miningProgress = 0;
    } else if (e.button === 2) {
      this.isRightMouseDown = false;
    }
  };

  private onWheel = (e: WheelEvent) => {
    if (e.deltaY > 0) {
      this.selectSlot((this.player.selectedSlotIndex + 1) % 8);
    } else {
      this.selectSlot((this.player.selectedSlotIndex + 7) % 8);
    }
  };

  public requestPointerLock() {
    this.container.requestPointerLock?.();
    this.mouseLocked = true;
  }

  public exitPointerLock() {
    document.exitPointerLock?.();
    this.mouseLocked = false;
  }

  public selectSlot(idx: number) {
    this.player.selectedSlotIndex = idx;
    this.updateActiveHeldItems();
  }

  public toggleCameraMode() {
    this.cameraMode = this.cameraMode === 'first' ? 'third' : 'first';
  }

  // Update what the character mesh is holding in their hand
  private updateActiveHeldItems() {
    const pSlot = this.player.inventory[this.player.selectedSlotIndex];
    const pMesh = this.characterMeshes.get('player');
    if (pMesh) {
      pMesh.setHeldItem(pSlot ? pSlot.icon : null);
    }

    this.bots.forEach((bot) => {
      const bSlot = bot.inventory[bot.selectedSlotIndex];
      const bMesh = this.characterMeshes.get(bot.id);
      if (bMesh) {
        bMesh.setHeldItem(bSlot ? bSlot.icon : null);
      }
    });
  }

  // Execute Player Melee Attack or Block Mining
  public startPlayerAction(action: 'attack' | 'mine') {
    if (this.player.isDead) return;

    this.player.isSwinging = true;
    this.player.swingProgress = 0;
    sounds.playSwing();

    // Priority 1: If targeting an enemy bed, start mining it immediately!
    if (this.targetedBlock && this.targetedBlock.type === 'bed') {
      if (this.targetedBlock.team !== this.player.team) {
        this.miningBlockKey = this.targetedBlock.id;
        return;
      }
    }

    // Priority 2: Check hit against enemies
    const forward = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    let hitEnemy = false;

    for (const bot of this.bots) {
      if (bot.team !== this.player.team && !bot.isDead) {
        const dx = bot.position[0] - this.player.position[0];
        const dy = bot.position[1] - this.player.position[1];
        const dz = bot.position[2] - this.player.position[2];
        const dist = Math.hypot(dx, dz);

        if (dist < 3.2 && Math.abs(dy) < 2.0) {
          // Check dot product to ensure target is in front of player
          const toEnemy = new THREE.Vector3(dx, 0, dz).normalize();
          if (forward.dot(toEnemy) > 0.4) {
            this.applyDamage(this.player, bot);
            hitEnemy = true;
            break;
          }
        }
      }
    }

    // Priority 3: Mine other targeted blocks
    if (!hitEnemy && this.targetedBlock) {
      this.miningBlockKey = this.targetedBlock.id;
    }
  }

  // Player right click action (Block placement / Item use)
  public executePlayerRightClick() {
    if (this.player.isDead) return;

    const currentSlot = this.player.inventory[this.player.selectedSlotIndex];
    if (!currentSlot) return;

    // 1. Place Block (including bridging!)
    if (currentSlot.category === 'block' && currentSlot.count > 0 && this.placeTargetPos) {
      const [tx, ty, tz] = this.placeTargetPos;
      const [px, py, pz] = this.player.position;

      // Only reject if placing directly inside player's upper body / head
      const isInsideTorso =
        Math.abs(tx - px) < 0.45 &&
        Math.abs(tz - pz) < 0.45 &&
        ty >= py + 0.3 &&
        ty <= py + 1.8;

      if (!isInsideTorso) {
        this.placeBlock(
          tx,
          ty,
          tz,
          currentSlot.blockType as 'wool' | 'wood' | 'obsidian',
          this.player.team
        );
        currentSlot.count--;
        if (currentSlot.count <= 0) {
          this.player.inventory[this.player.selectedSlotIndex] = null;
        }
        this.player.blocksPlaced++;
        this.updateActiveHeldItems();

        // Tower-up / jump-bridging: if placing directly under feet, boost player smoothly
        if (
          Math.abs(tx - px) < 0.55 &&
          Math.abs(tz - pz) < 0.55 &&
          ty <= py + 0.2 &&
          ty >= py - 1.2
        ) {
          if (this.player.velocity[1] > -2) {
            this.player.position[1] = ty + 0.5;
            this.player.isGrounded = true;
          }
        }
      }
      return;
    }

    // 2. Throw Fireball
    if (currentSlot.id === 'fireball' && currentSlot.count > 0) {
      currentSlot.count--;
      if (currentSlot.count <= 0) this.player.inventory[this.player.selectedSlotIndex] = null;
      this.throwFireball(this.player);
      return;
    }

    // 3. Throw Telepearl
    if (currentSlot.id === 'telepearl' && currentSlot.count > 0) {
      currentSlot.count--;
      if (currentSlot.count <= 0) this.player.inventory[this.player.selectedSlotIndex] = null;
      this.throwTelepearl(this.player);
      return;
    }

    // 4. Place TNT
    if (currentSlot.id === 'tnt' && currentSlot.count > 0 && this.placeTargetPos) {
      currentSlot.count--;
      if (currentSlot.count <= 0) this.player.inventory[this.player.selectedSlotIndex] = null;
      this.spawnTNT(this.placeTargetPos, this.player.team);
      return;
    }

    // 5. Eat Golden Apple
    if (currentSlot.id === 'golden_apple' && currentSlot.count > 0) {
      currentSlot.count--;
      if (currentSlot.count <= 0) this.player.inventory[this.player.selectedSlotIndex] = null;
      this.player.health = Math.min(100, this.player.health + 35);
      sounds.playEat();
      return;
    }
  }

  // Place a voxel block into the world
  public placeBlock(
    x: number,
    y: number,
    z: number,
    type: 'wool' | 'wood' | 'obsidian',
    team: TeamColor
  ) {
    const key = blockKey(x, y, z);
    if (this.blocks.has(key)) return;

    const block: VoxelBlock = {
      id: key,
      x,
      y,
      z,
      type,
      team,
      hardness: BLOCK_HARDNESS[type] || 1.0,
      maxHealth: 100,
      currentHealth: 100,
    };
    this.blocks.set(key, block);

    // Create block mesh
    const geo = new THREE.BoxGeometry(1, 1, 1);
    let mat: THREE.Material;
    if (type === 'wool') {
      const teamHex: Record<TeamColor, string> = {
        red: '#ef4444',
        blue: '#3b82f6',
        green: '#10b981',
        yellow: '#eab308',
      };
      mat = new THREE.MeshStandardMaterial({
        map: getWoolTexture(teamHex[team], team),
        roughness: 0.7,
      });
    } else if (type === 'wood') {
      mat = new THREE.MeshStandardMaterial({
        map: getWoodTexture(),
        roughness: 0.7,
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        map: getObsidianTexture(),
        roughness: 0.3,
        metalness: 0.5,
      });
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.blockMeshes.set(key, mesh);

    sounds.playPlaceBlock();
  }

  // Break a voxel block
  public breakBlock(key: string, breaker: CharacterState) {
    const block = this.blocks.get(key);
    if (!block || block.type === 'island_base') return;

    if (block.type === 'bed') {
      const bedTeam = block.team;
      if (!bedTeam) return;

      // Friendly bed protection: cannot break own bed!
      if (bedTeam === breaker.team) return;

      if (this.teams[bedTeam].bedAlive) {
        this.teams[bedTeam].bedAlive = false;
        breaker.bedsBroken++;
        sounds.playBedDestroy();

        // Remove bed 3D mesh
        const bedMesh = this.mapData.bedMeshes.get(bedTeam);
        if (bedMesh) {
          this.scene.remove(bedMesh);
        }

        // Add to kill feed
        this.killFeed.unshift({
          id: `bed_${Date.now()}_${Math.random()}`,
          killerName: breaker.name,
          killerTeam: breaker.team,
          victimName: `${this.teams[bedTeam].nameZh}床位`,
          victimTeam: bedTeam,
          isFinalKill: true,
          reason: 'sword',
          timestamp: Date.now(),
        });
      }

      // Remove ALL voxel keys belonging to this bed (both halves of the bed)
      const bedKeysToRemove: string[] = [];
      this.blocks.forEach((b, k) => {
        if (b.type === 'bed' && b.team === bedTeam) {
          bedKeysToRemove.push(k);
        }
      });
      bedKeysToRemove.forEach((k) => this.blocks.delete(k));

      // Spawn break particles
      this.spawnBreakParticles(block.x, block.y, block.z);
      return;
    } else {
      sounds.playBreakBlock();
    }

    // Remove block mesh
    const mesh = this.blockMeshes.get(key);
    if (mesh) {
      this.scene.remove(mesh);
      this.blockMeshes.delete(key);
    }
    this.blocks.delete(key);

    // Spawn break particles
    this.spawnBreakParticles(block.x, block.y, block.z);
  }

  // Damage & Knockback
  public applyDamage(attacker: CharacterState, target: CharacterState, baseDamage?: number) {
    // Damage cooldown / i-frames: entities cannot take damage more than once every 0.4s
    const nowSec = performance.now() / 1000;
    if (target.lastDamagedTime && nowSec - target.lastDamagedTime < 0.4) {
      return;
    }
    target.lastDamagedTime = nowSec;

    const weaponDmg = baseDamage || WEAPON_DAMAGE[attacker.swordTier] || 8;
    const teamBonus = 1 + (this.teams[attacker.team].sharpnessLevel || 0) * 0.15;
    const armorMitigation = ARMOR_REDUCTION[target.armorTier] || 0;
    const teamDefBonus = 1 - (this.teams[target.team].armorProtectionLevel || 0) * 0.1;

    const finalDmg = Math.max(1, Math.round(weaponDmg * teamBonus * (1 - armorMitigation) * teamDefBonus));
    target.health = Math.max(0, target.health - finalDmg);

    sounds.playHit();
    sounds.playOof();

    // Apply Knockback (moderate, not instant catapult)
    const kbAngle = attacker.yaw;
    const kbForce = 7.5;
    target.velocity[0] += -Math.sin(kbAngle) * kbForce;
    target.velocity[1] += 4.5; // Upward knockback pop
    target.velocity[2] += -Math.cos(kbAngle) * kbForce;

    // Update avatar tag
    const targetMesh = this.characterMeshes.get(target.id);
    if (targetMesh) {
      targetMesh.updateHealthTag(target.health, target.maxHealth);
    }

    // Check death
    if (target.health <= 0) {
      this.handleDeath(target, attacker, 'sword');
    }
  }

  // Death & Respawn
  public handleDeath(
    victim: CharacterState,
    killer: CharacterState | null,
    reason: 'sword' | 'void' | 'fireball' | 'fall'
  ) {
    if (victim.isDead) return;
    victim.isDead = true;

    const team = this.teams[victim.team];
    const isFinalKill = !team.bedAlive;

    if (killer) {
      killer.kills++;
      if (isFinalKill) killer.finalKills++;
    }

    // Add entry to feed
    this.killFeed.unshift({
      id: `kill_${Date.now()}_${Math.random()}`,
      killerName: killer ? killer.name : 'The Void',
      killerTeam: killer ? killer.team : victim.team,
      victimName: victim.name,
      victimTeam: victim.team,
      isFinalKill,
      reason,
      timestamp: Date.now(),
    });

    if (isFinalKill) {
      team.playersAlive = Math.max(0, team.playersAlive - 1);
      // Remove mesh permanently
      const mesh = this.characterMeshes.get(victim.id);
      if (mesh) mesh.visible = false;
      this.checkVictoryCondition();
    } else {
      // 5-second respawn timer
      victim.respawnTimer = 5.0;
      const mesh = this.characterMeshes.get(victim.id);
      if (mesh) mesh.visible = false;
    }
  }

  private respawnCharacter(char: CharacterState) {
    const team = this.teams[char.team];
    char.isDead = false;
    char.health = 100;
    char.velocity = [0, 0, 0];
    char.position = [team.spawnPosition[0], team.spawnPosition[1], team.spawnPosition[2]];

    const mesh = this.characterMeshes.get(char.id);
    if (mesh) {
      mesh.visible = true;
      mesh.updateHealthTag(100, 100);
    }
  }

  // Throw Fireball
  public throwFireball(owner: CharacterState) {
    sounds.playSwing();
    const yaw = owner.yaw;
    const pitch = owner.pitch;
    const speed = 25;

    const vx = -Math.sin(yaw) * Math.cos(pitch) * speed;
    const vy = Math.sin(pitch) * speed;
    const vz = -Math.cos(yaw) * Math.cos(pitch) * speed;

    const geo = new THREE.SphereGeometry(0.35, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(owner.position[0], owner.position[1] + 1.2, owner.position[2]);
    this.scene.add(mesh);

    this.projectiles.push({
      data: {
        id: `fb_${Date.now()}`,
        type: 'fireball',
        ownerId: owner.id,
        position: [mesh.position.x, mesh.position.y, mesh.position.z],
        velocity: [vx, vy, vz],
        createdAt: Date.now(),
      },
      mesh,
    });
  }

  // Throw Telepearl
  public throwTelepearl(owner: CharacterState) {
    sounds.playSwing();
    const yaw = owner.yaw;
    const pitch = owner.pitch;
    const speed = 20;

    const vx = -Math.sin(yaw) * Math.cos(pitch) * speed;
    const vy = (Math.sin(pitch) + 0.35) * speed; // arc
    const vz = -Math.cos(yaw) * Math.cos(pitch) * speed;

    const geo = new THREE.SphereGeometry(0.2, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(owner.position[0], owner.position[1] + 1.2, owner.position[2]);
    this.scene.add(mesh);

    this.projectiles.push({
      data: {
        id: `tp_${Date.now()}`,
        type: 'telepearl',
        ownerId: owner.id,
        position: [mesh.position.x, mesh.position.y, mesh.position.z],
        velocity: [vx, vy, vz],
        createdAt: Date.now(),
      },
      mesh,
    });
  }

  // Spawn TNT
  public spawnTNT(pos: [number, number, number], team: TeamColor) {
    sounds.playPlaceBlock();
    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const mat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    this.scene.add(mesh);

    this.tnts.push({
      data: {
        id: `tnt_${Date.now()}`,
        position: pos,
        fuseTimer: 3.0,
        ownerTeam: team,
      },
      mesh,
    });
  }

  // Explode at position (Fireball / TNT blast)
  private explodeAt(pos: [number, number, number], radius = 3.5, knockbackForce = 18) {
    sounds.playExplosion();

    // Damage and knockback characters
    const allChars = [this.player, ...this.bots];
    allChars.forEach((c) => {
      if (c.isDead) return;
      const dist = Math.hypot(c.position[0] - pos[0], c.position[1] - pos[1], c.position[2] - pos[2]);
      if (dist < radius) {
        const falloff = 1 - dist / radius;
        c.health = Math.max(0, c.health - Math.round(40 * falloff));
        const dx = c.position[0] - pos[0];
        const dz = c.position[2] - pos[2];
        const angle = Math.atan2(dx, dz);
        c.velocity[0] += Math.sin(angle) * knockbackForce * falloff;
        c.velocity[1] += knockbackForce * 0.6 * falloff;
        c.velocity[2] += Math.cos(angle) * knockbackForce * falloff;

        if (c.health <= 0) {
          this.handleDeath(c, null, 'fireball');
        }
      }
    });

    // Destroy weak blocks (wool and wood) in radius
    const minX = Math.floor(pos[0] - radius);
    const maxX = Math.ceil(pos[0] + radius);
    const minY = Math.floor(pos[1] - radius);
    const maxY = Math.ceil(pos[1] + radius);
    const minZ = Math.floor(pos[2] - radius);
    const maxZ = Math.ceil(pos[2] + radius);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const k = blockKey(x, y, z);
          const blk = this.blocks.get(k);
          if (blk && (blk.type === 'wool' || blk.type === 'wood')) {
            const d = Math.hypot(x - pos[0], y - pos[1], z - pos[2]);
            if (d <= radius) {
              this.breakBlock(k, this.player);
            }
          }
        }
      }
    }
  }

  // Break particle explosion
  private spawnBreakParticles(x: number, y: number, z: number) {
    const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    for (let i = 0; i < 8; i++) {
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(x + (Math.random() - 0.5) * 0.5, y + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * 0.5);
      this.scene.add(pMesh);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 5
      );
      this.particles.push({ mesh: pMesh, vel, life: 0.6 });
    }
  }

  // Dropped Resource Items Spawning & Pickup
  private spawnResource(type: ResourceType, pos: [number, number, number]) {
    const geo = new THREE.DodecahedronGeometry(0.18, 0);
    const colors: Record<ResourceType, number> = {
      iron: 0xf1f5f9,
      gold: 0xfbbf24,
      diamond: 0x38bdf8,
      emerald: 0x4ade80,
    };
    const mat = new THREE.MeshStandardMaterial({
      color: colors[type],
      roughness: 0.3,
      metalness: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0] + (Math.random() - 0.5) * 0.4, pos[1], pos[2] + (Math.random() - 0.5) * 0.4);
    this.scene.add(mesh);

    this.droppedItems.push({
      item: {
        id: `res_${Date.now()}_${Math.random()}`,
        type,
        position: [mesh.position.x, mesh.position.y, mesh.position.z],
        velocity: [(Math.random() - 0.5) * 1.5, 2.5, (Math.random() - 0.5) * 1.5],
        createdAt: Date.now(),
        amount: 1,
      },
      mesh,
    });
  }

  // Main Game Loop Tick
  private startLoop() {
    this.isRunning = true;

    const tick = () => {
      if (!this.isRunning) return;

      const delta = Math.min(this.clock.getDelta(), 0.1);
      const now = performance.now() / 1000;

      // 1. Spawners tick
      this.tickGenerators(now);

      // 2. Player movement & physics
      this.tickPlayer(delta);

      // 3. AI Bots movement & logic
      this.tickBots(delta, now);

      // 4. Projectiles & TNT
      this.tickProjectiles(delta);
      this.tickTNT(delta);

      // 5. Dropped Items & Pickups
      this.tickDroppedItems(delta);

      // 6. Particles
      this.tickParticles(delta);

      // 7. Raycast for block targeting & mining progress
      this.tickVoxelRaycast(delta);

      // 8. Rotate generator gems
      this.mapData.generatorLocations.forEach((gen) => {
        const gem = gen.mesh.userData.gemGroup;
        if (gem) {
          gem.rotation.y += delta * 1.8;
          gem.position.y = 1.2 + Math.sin(now * 3 + gen.position[0]) * 0.1;
        }
      });

      // 9. Camera update
      this.updateCamera();

      // 10. Render
      this.renderer.render(this.scene, this.camera);

      // Send UI state update to React
      this.callbacks.onUpdateState({
        player: this.player,
        teams: this.teams,
        killFeed: this.killFeed,
        targetedBlock: this.targetedBlock,
        miningProgress: this.miningProgress,
        respawnTimer: this.player.respawnTimer,
        matchEnded: this.matchEnded,
        isVictory: this.isVictory,
        currentMap: this.currentMap,
      });

      this.frameId = requestAnimationFrame(tick);
    };

    this.frameId = requestAnimationFrame(tick);
  }

  private tickGenerators(now: number) {
    // Base Iron & Gold generator (every 1.5s for iron, 6s for gold)
    if (now > this.nextBaseGenTime) {
      this.nextBaseGenTime = now + 1.6;
      (Object.keys(INITIAL_TEAMS) as TeamColor[]).forEach((team) => {
        const gen = this.mapData.generatorLocations.find((g) => g.team === team);
        if (gen) {
          this.spawnResource('iron', gen.position);
          if (Math.random() > 0.6) {
            this.spawnResource('gold', gen.position);
          }
        }
      });
    }

    // Diamond generators (every 20s)
    if (now > this.nextDiamondGenTime) {
      this.nextDiamondGenTime = now + 20.0;
      this.mapData.generatorLocations
        .filter((g) => g.type === 'diamond')
        .forEach((gen) => {
          this.spawnResource('diamond', gen.position);
        });
    }

    // Emerald generators (every 30s)
    if (now > this.nextEmeraldGenTime) {
      this.nextEmeraldGenTime = now + 30.0;
      this.mapData.generatorLocations
        .filter((g) => g.type === 'emerald')
        .forEach((gen) => {
          this.spawnResource('emerald', gen.position);
        });
    }
  }

  private tickPlayer(delta: number) {
    if (this.player.isDead) {
      this.player.respawnTimer -= delta;
      if (this.player.respawnTimer <= 0) {
        this.respawnCharacter(this.player);
      }
      return;
    }

    // Input vector: forward/backward and strafe left/right
    let fwdInput = 0;
    let strafeInput = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) fwdInput += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) fwdInput -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) strafeInput -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) strafeInput += 1;

    const inputLen = Math.hypot(fwdInput, strafeInput);
    if (inputLen > 0) {
      fwdInput /= inputLen;
      strafeInput /= inputLen;
    }

    const sinYaw = Math.sin(this.player.yaw);
    const cosYaw = Math.cos(this.player.yaw);

    // Camera forward vector in horizontal XZ plane: exactly where camera looks!
    const fwdX = -sinYaw;
    const fwdZ = -cosYaw;

    // Camera right vector (90 deg clockwise from forward):
    const rightX = cosYaw;
    const rightZ = -sinYaw;

    const isSneaking = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speed = isSneaking ? 3.8 : 7.5;

    this.player.velocity[0] = (fwdX * fwdInput + rightX * strafeInput) * speed;
    this.player.velocity[2] = (fwdZ * fwdInput + rightZ * strafeInput) * speed;

    // Continuous auto-bridging while holding right click
    if (this.isRightMouseDown) {
      const nowMs = performance.now();
      if (nowMs - this.lastAutoBridgeTime > 130) {
        this.lastAutoBridgeTime = nowMs;
        this.executePlayerRightClick();
      }
    }

    // Jump
    if (this.keys['Space'] && this.player.isGrounded) {
      this.player.velocity[1] = 9.8;
      this.player.isGrounded = false;
    }

    // Physics integration with sneak edge guard
    const sim = physics.updateCharacterMovement(
      this.player.position,
      this.player.velocity,
      this.blocks,
      delta,
      isSneaking
    );
    this.player.position = sim.newPos;
    this.player.velocity = sim.newVel;
    this.player.isGrounded = sim.isGrounded;

    // Void death check
    if (this.player.position[1] < VOID_KILL_Y) {
      this.handleDeath(this.player, null, 'void');
    }

    // Swing animation
    if (this.player.isSwinging) {
      this.player.swingProgress += delta * 6;
      if (this.player.swingProgress >= 1) {
        this.player.isSwinging = false;
        this.player.swingProgress = 0;
      }
    }

    // Update avatar mesh
    const pMesh = this.characterMeshes.get('player');
    if (pMesh) {
      pMesh.position.set(this.player.position[0], this.player.position[1], this.player.position[2]);
      pMesh.rotation.y = this.player.yaw;
      pMesh.updateAnimation(this.player, delta);
      // Hide body in first person, show in third person
      pMesh.visible = this.cameraMode === 'third' && !this.player.isDead;
    }
  }

  private tickBots(delta: number, now: number) {
    const allChars = [this.player, ...this.bots];

    this.bots.forEach((bot) => {
      if (bot.isDead) {
        if (this.teams[bot.team].bedAlive) {
          bot.respawnTimer -= delta;
          if (bot.respawnTimer <= 0) {
            this.respawnCharacter(bot);
          }
        }
        return;
      }

      // AI decision
      const aiInput = aiController.updateBot(
        bot,
        allChars,
        this.teams,
        this.blocks,
        delta,
        now,
        (b, pos) => this.placeBlock(pos[0], pos[1], pos[2], 'wool', b.team),
        (b) => {
          b.isSwinging = true;
          b.swingProgress = 0;
          sounds.playSwing();
          // Find nearby target
          const target = allChars.find(
            (c) => c.team !== b.team && !c.isDead && Math.hypot(c.position[0] - b.position[0], c.position[2] - b.position[2]) < 3.0
          );
          if (target) {
            this.applyDamage(b, target);
          }
        },
        (b, bKey) => this.breakBlock(bKey, b),
        this.mapData.diamondPositions,
        this.mapData.centerPosition
      );

      // Rotate towards target yaw
      bot.yaw = THREE.MathUtils.damp(bot.yaw, aiInput.targetYaw, 8, delta);

      // Bot movement velocity
      const botSpeed = 5.8;
      bot.velocity[0] = Math.sin(bot.yaw) * aiInput.moveForward * botSpeed;
      bot.velocity[2] = Math.cos(bot.yaw) * aiInput.moveForward * botSpeed;

      if (aiInput.jump && bot.isGrounded) {
        bot.velocity[1] = 9.5;
        bot.isGrounded = false;
      }

      // Physics
      const sim = physics.updateCharacterMovement(bot.position, bot.velocity, this.blocks, delta);
      bot.position = sim.newPos;
      bot.velocity = sim.newVel;
      bot.isGrounded = sim.isGrounded;

      // Void death
      if (bot.position[1] < VOID_KILL_Y) {
        this.handleDeath(bot, null, 'void');
      }

      // Swing animation
      if (bot.isSwinging) {
        bot.swingProgress += delta * 6;
        if (bot.swingProgress >= 1) {
          bot.isSwinging = false;
          bot.swingProgress = 0;
        }
      }

      // Update Mesh
      const bMesh = this.characterMeshes.get(bot.id);
      if (bMesh) {
        bMesh.position.set(bot.position[0], bot.position[1], bot.position[2]);
        bMesh.rotation.y = bot.yaw;
        bMesh.updateAnimation(bot, delta);
      }
    });
  }

  private tickProjectiles(delta: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.data.position[0] += p.data.velocity[0] * delta;
      p.data.position[1] += p.data.velocity[1] * delta;
      p.data.position[2] += p.data.velocity[2] * delta;

      // Gravity on pearl
      if (p.data.type === 'telepearl') {
        p.data.velocity[1] -= 20 * delta;
      }

      p.mesh.position.set(p.data.position[0], p.data.position[1], p.data.position[2]);

      // Check collision with blocks
      const cx = Math.round(p.data.position[0]);
      const cy = Math.round(p.data.position[1]);
      const cz = Math.round(p.data.position[2]);

      if (this.blocks.has(blockKey(cx, cy, cz)) || p.data.position[1] < VOID_KILL_Y + 5) {
        if (p.data.type === 'fireball') {
          this.explodeAt(p.data.position, 4.0, 20);
        } else if (p.data.type === 'telepearl') {
          sounds.playTeleport();
          this.player.position = [p.data.position[0], p.data.position[1] + 1.0, p.data.position[2]];
          this.player.velocity = [0, 0, 0];
        }

        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private tickTNT(delta: number) {
    for (let i = this.tnts.length - 1; i >= 0; i--) {
      const t = this.tnts[i];
      t.data.fuseTimer -= delta;

      // Flashing animation
      const flash = Math.sin(t.data.fuseTimer * 20) > 0;
      (t.mesh.material as THREE.MeshStandardMaterial).color.setHex(flash ? 0xffffff : 0xdc2626);

      if (t.data.fuseTimer <= 0) {
        this.explodeAt(t.data.position, 5.0, 25);
        this.scene.remove(t.mesh);
        this.tnts.splice(i, 1);
      }
    }
  }

  private tickDroppedItems(delta: number) {
    const allChars = [this.player, ...this.bots];

    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const drop = this.droppedItems[i];
      const [dx, dy, dz] = drop.item.position;

      // Small bounce/float physics
      drop.item.velocity[1] -= 15 * delta;
      drop.item.position[1] += drop.item.velocity[1] * delta;
      drop.mesh.position.set(drop.item.position[0], drop.item.position[1], drop.item.position[2]);
      drop.mesh.rotation.y += delta * 3;

      // Ground resting
      const underBlock = this.blocks.get(blockKey(Math.round(dx), Math.floor(dy), Math.round(dz)));
      if (underBlock && drop.item.position[1] <= underBlock.y + 0.6) {
        drop.item.position[1] = underBlock.y + 0.6;
        drop.item.velocity[1] = 0;
      }

      // Check pickup radius
      allChars.forEach((char) => {
        if (char.isDead) return;
        const dist = Math.hypot(char.position[0] - dx, char.position[2] - dz);
        if (dist < 1.8 && Math.abs(char.position[1] - dy) < 2.0) {
          // Collect!
          char.currencies[drop.item.type] += drop.item.amount;
          if (!char.isBot) {
            sounds.playPickup(drop.item.type);
          }
          this.scene.remove(drop.mesh);
          this.droppedItems.splice(i, 1);
        }
      });
    }
  }

  private tickParticles(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.vel.y -= 20 * delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.scale.multiplyScalar(0.92);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  private tickVoxelRaycast(delta: number) {
    if (this.player.isDead) {
      this.targetOutlineMesh.visible = false;
      this.ghostPreviewMesh.visible = false;
      this.targetedBlock = null;
      this.placeTargetPos = null;
      return;
    }

    const eyePos = new THREE.Vector3(
      this.player.position[0],
      this.player.position[1] + 1.5,
      this.player.position[2]
    );

    const dir = new THREE.Vector3(
      -Math.sin(this.player.yaw) * Math.cos(this.player.pitch),
      Math.sin(this.player.pitch),
      -Math.cos(this.player.yaw) * Math.cos(this.player.pitch)
    ).normalize();

    const hit = physics.raycastBlock(eyePos, dir, this.blocks, 5.2);
    const activeSlot = this.player.inventory[this.player.selectedSlotIndex];
    const isHoldingBlock = Boolean(activeSlot && activeSlot.category === 'block' && activeSlot.count > 0);

    if (hit) {
      this.targetedBlock = hit.block;
      this.placeTargetPos = hit.placePos;

      this.targetOutlineMesh.position.set(hit.block.x, hit.block.y, hit.block.z);
      this.targetOutlineMesh.visible = true;

      // Show holographic block preview
      if (isHoldingBlock && this.placeTargetPos) {
        this.ghostPreviewMesh.position.set(this.placeTargetPos[0], this.placeTargetPos[1], this.placeTargetPos[2]);
        this.ghostPreviewMesh.visible = true;
      } else {
        this.ghostPreviewMesh.visible = false;
      }

      // Handle ongoing mining
      if (this.isLeftMouseDown && hit.block.type !== 'island_base') {
        // Friendly bed guard: cannot break own team's bed
        if (hit.block.type === 'bed' && hit.block.team === this.player.team) {
          this.miningProgress = 0;
        } else {
          // If targeting a different block, reset progress
          if (this.miningBlockKey !== hit.block.id) {
            this.miningBlockKey = hit.block.id;
            this.miningProgress = 0;
          }

          let speed = 1.0;
          const currentSlot = this.player.inventory[this.player.selectedSlotIndex];
          if (hit.block.type === 'wool' && this.player.hasShears) speed = 5.0;
          if (hit.block.type === 'obsidian' && this.player.pickaxeTier >= 3) speed = 2.5;
          if (hit.block.type === 'bed') speed = 1.6; // Rapid bed destruction (~0.8s)

          this.miningProgress += (delta / (hit.block.hardness || 1.0)) * speed;
          this.player.isSwinging = true;

          if (this.miningProgress >= 1.0) {
            const hitKey = blockKey(hit.targetPos[0], hit.targetPos[1], hit.targetPos[2]);
            this.breakBlock(hitKey, this.player);
            this.miningBlockKey = null;
            this.miningProgress = 0;
          }
        }
      } else {
        this.miningProgress = 0;
        if (!this.isLeftMouseDown) {
          this.miningBlockKey = null;
        }
      }
    } else {
      this.targetedBlock = null;
      this.targetOutlineMesh.visible = false;
      this.miningProgress = 0;

      // BedWars Void Edge Bridging Assist!
      if (isHoldingBlock) {
        const bridgeSpot = physics.findBridgingTarget(
          this.player.position,
          this.player.yaw,
          this.player.pitch,
          this.blocks
        );
        if (bridgeSpot) {
          this.placeTargetPos = bridgeSpot;
          this.ghostPreviewMesh.position.set(bridgeSpot[0], bridgeSpot[1], bridgeSpot[2]);
          this.ghostPreviewMesh.visible = true;
        } else {
          this.placeTargetPos = null;
          this.ghostPreviewMesh.visible = false;
        }
      } else {
        this.placeTargetPos = null;
        this.ghostPreviewMesh.visible = false;
      }
    }
  }

  private updateCamera() {
    const eyeHeight = 1.6;
    const px = this.player.position[0];
    const py = this.player.position[1] + eyeHeight;
    const pz = this.player.position[2];

    const sinYaw = Math.sin(this.player.yaw);
    const cosYaw = Math.cos(this.player.yaw);
    const sinPitch = Math.sin(this.player.pitch);
    const cosPitch = Math.cos(this.player.pitch);

    if (this.cameraMode === 'first') {
      this.camera.position.set(px, py, pz);
      _lookTarget.set(px - sinYaw * cosPitch, py + sinPitch, pz - cosYaw * cosPitch);
      this.camera.lookAt(_lookTarget);
    } else {
      // Third Person (over the shoulder / behind)
      const dist = 4.2;
      const camX = px + sinYaw * cosPitch * dist;
      const camY = py - sinPitch * dist + 0.6;
      const camZ = pz + cosYaw * cosPitch * dist;

      this.camera.position.set(camX, camY, camZ);
      _lookTarget.set(px, py + 0.5, pz);
      this.camera.lookAt(_lookTarget);
    }
  }

  // Buy Shop Item
  public buyItem(item: ShopItem): boolean {
    const cost = item.cost;
    const currency = item.currency;

    if (this.player.currencies[currency] < cost) {
      return false;
    }

    this.player.currencies[currency] -= cost;
    sounds.playBuy();

    if (item.category === 'weapon' && item.tier) {
      this.player.swordTier = Math.max(this.player.swordTier, item.tier);
      // Replace sword in inventory slot 0
      this.player.inventory[0] = {
        id: item.id,
        name: item.name,
        nameZh: item.nameZh,
        icon: item.icon,
        category: 'weapon',
        count: 1,
        tier: item.tier,
      };
    } else if (item.category === 'armor' && item.tier) {
      this.player.armorTier = Math.max(this.player.armorTier, item.tier);
    } else if (item.category === 'tool') {
      if (item.id === 'shears') this.player.hasShears = true;
      if (item.tier) this.player.pickaxeTier = Math.max(this.player.pickaxeTier, item.tier);
    } else if (item.category === 'block') {
      // Find matching block slot or empty slot
      const existing = this.player.inventory.find(
        (s) => s && s.blockType === item.icon
      );
      if (existing) {
        existing.count += item.amount || 16;
      } else {
        const emptyIdx = this.player.inventory.findIndex((s) => s === null);
        if (emptyIdx !== -1) {
          this.player.inventory[emptyIdx] = {
            id: item.id,
            name: item.name,
            nameZh: item.nameZh,
            icon: item.icon,
            category: 'block',
            count: item.amount || 16,
            blockType: item.icon,
          };
        }
      }
    } else if (item.category === 'utility') {
      const existing = this.player.inventory.find((s) => s && s.id === item.id);
      if (existing) {
        existing.count += item.amount || 1;
      } else {
        const emptyIdx = this.player.inventory.findIndex((s) => s === null);
        if (emptyIdx !== -1) {
          this.player.inventory[emptyIdx] = {
            id: item.id,
            name: item.name,
            nameZh: item.nameZh,
            icon: item.icon,
            category: 'utility',
            count: item.amount || 1,
          };
        }
      }
    }

    this.updateActiveHeldItems();
    return true;
  }

  // Buy Team Upgrade
  public buyUpgrade(upgradeId: 'sharpness' | 'protection' | 'forge'): boolean {
    const team = this.teams[this.player.team];
    let cost = 4;
    if (upgradeId === 'sharpness') {
      cost = team.sharpnessLevel === 0 ? 4 : 8;
      if (this.player.currencies.diamond >= cost && team.sharpnessLevel < 2) {
        this.player.currencies.diamond -= cost;
        team.sharpnessLevel++;
        sounds.playBuy();
        return true;
      }
    } else if (upgradeId === 'protection') {
      cost = team.armorProtectionLevel === 0 ? 3 : 6;
      if (this.player.currencies.diamond >= cost && team.armorProtectionLevel < 2) {
        this.player.currencies.diamond -= cost;
        team.armorProtectionLevel++;
        sounds.playBuy();
        return true;
      }
    } else if (upgradeId === 'forge') {
      cost = team.forgeLevel === 0 ? 2 : 4;
      if (this.player.currencies.diamond >= cost && team.forgeLevel < 2) {
        this.player.currencies.diamond -= cost;
        team.forgeLevel++;
        sounds.playBuy();
        return true;
      }
    }
    return false;
  }

  // Check Victory / Defeat
  private checkVictoryCondition() {
    if (this.matchEnded) return;

    // Check if other 3 teams have 0 alive players
    const enemyLiving = (['blue', 'green', 'yellow'] as TeamColor[]).reduce(
      (sum, t) => sum + this.teams[t].playersAlive,
      0
    );

    if (enemyLiving === 0) {
      this.matchEnded = true;
      this.isVictory = true;
      sounds.playVictory();
    } else if (this.teams.red.playersAlive === 0) {
      this.matchEnded = true;
      this.isVictory = false;
    }
  }

  public restartGame(preferredMapId?: MapId) {
    // 1. Pick a new map (randomly selected, avoiding immediate duplicate if possible)
    const nextMap = preferredMapId
      ? getMapById(preferredMapId)
      : getRandomMap(this.currentMap.id);
    this.currentMap = nextMap;
    this.applyMapTheme(this.currentMap);

    // 2. Remove previous map scene group from scene
    if (this.mapData && this.mapData.sceneGroup) {
      this.scene.remove(this.mapData.sceneGroup);
    }

    // 3. Clear player-placed blocks
    this.blockMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.blockMeshes.clear();

    // 4. Clear entities
    this.droppedItems.forEach(({ mesh }) => this.scene.remove(mesh));
    this.droppedItems = [];

    this.projectiles.forEach(({ mesh }) => this.scene.remove(mesh));
    this.projectiles = [];

    this.tnts.forEach(({ mesh }) => this.scene.remove(mesh));
    this.tnts = [];

    this.particles.forEach(({ mesh }) => this.scene.remove(mesh));
    this.particles = [];

    // 5. Reset match state & teams for the new map
    this.matchEnded = false;
    this.isVictory = false;
    this.teams = createTeamsForMap(this.currentMap.baseIslandDistance, this.currentMap.islandY);
    this.killFeed = [];
    this.nextBaseGenTime = 0;
    this.nextDiamondGenTime = 0;
    this.nextEmeraldGenTime = 0;

    // 6. Build the newly selected map
    this.mapData = buildBedWarsMap(this.currentMap);
    this.scene.add(this.mapData.sceneGroup);
    this.blocks = new Map(this.mapData.initialBlocks);

    // 7. Reset player to Red Team spawn on the new map
    const redSpawn = this.teams.red.spawnPosition;
    this.player.position = [redSpawn[0], redSpawn[1], redSpawn[2]];
    this.player.velocity = [0, 0, 0];
    this.player.health = 100;
    this.player.currencies = { iron: 0, gold: 0, diamond: 0, emerald: 0 };
    this.player.inventory = this.getInitialInventory('red');
    this.player.armorTier = 0;
    this.player.swordTier = 1;
    this.player.pickaxeTier = 1;
    this.player.hasShears = false;
    this.player.isDead = false;
    this.player.kills = 0;
    this.player.finalKills = 0;
    this.player.bedsBroken = 0;
    this.player.blocksPlaced = 0;

    // 8. Reset bots to their respective new team spawns
    this.bots.forEach((bot) => {
      const spawn = this.teams[bot.team].spawnPosition;
      bot.position = [spawn[0], spawn[1], spawn[2]];
      bot.velocity = [0, 0, 0];
      bot.health = 100;
      bot.isDead = false;
      bot.currencies = { iron: 0, gold: 0, diamond: 0, emerald: 0 };
      bot.inventory = this.getInitialInventory(bot.team);
      bot.armorTier = 0;
      bot.swordTier = 1;
      bot.aiState = {
        action: 'gather',
        nextDecisionTime: 0,
      };
      const bMesh = this.characterMeshes.get(bot.id);
      if (bMesh) {
        bMesh.visible = true;
        bMesh.updateHealthTag(100, 100);
      }
    });

    const pMesh = this.characterMeshes.get('player');
    if (pMesh) {
      pMesh.visible = this.cameraMode === 'third';
      pMesh.updateHealthTag(100, 100);
    }

    this.updateActiveHeldItems();
  }
}
