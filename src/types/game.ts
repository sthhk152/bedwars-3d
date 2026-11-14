export type TeamColor = 'red' | 'blue' | 'green' | 'yellow';

export interface TeamInfo {
  id: TeamColor;
  name: string;
  nameZh: string;
  hex: string;
  bedAlive: boolean;
  playersAlive: number;
  bedPosition: [number, number, number];
  spawnPosition: [number, number, number];
  shopPosition: [number, number, number];
  sharpnessLevel: number;
  armorProtectionLevel: number;
  forgeLevel: number;
}

export type ResourceType = 'iron' | 'gold' | 'diamond' | 'emerald';

export interface CurrencyAmounts {
  iron: number;
  gold: number;
  diamond: number;
  emerald: number;
}

export type ItemCategory = 'weapon' | 'block' | 'armor' | 'tool' | 'utility';

export interface ShopItem {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  category: ItemCategory;
  cost: number;
  currency: ResourceType;
  icon: string;
  slotType?: 'weapon' | 'armor' | 'tool';
  tier?: number;
  amount?: number;
  maxStack?: number;
}

export interface InventorySlot {
  id: string;
  name: string;
  nameZh: string;
  icon: string;
  category: ItemCategory;
  count: number;
  tier?: number;
  blockType?: string;
  damage?: number;
  breakableBy?: string[];
  maxCount?: number;
}

export interface DroppedItem {
  id: string;
  type: ResourceType;
  position: [number, number, number];
  velocity: [number, number, number];
  createdAt: number;
  amount: number;
}

export interface VoxelBlock {
  id: string;
  x: number;
  y: number;
  z: number;
  type: 'wool' | 'wood' | 'obsidian' | 'stone' | 'bed' | 'island_base';
  team?: TeamColor;
  hardness: number; // seconds to mine
  maxHealth: number;
  currentHealth: number;
}

export interface Projectile {
  id: string;
  type: 'fireball' | 'telepearl';
  ownerId: string;
  position: [number, number, number];
  velocity: [number, number, number];
  createdAt: number;
}

export interface TNTEntity {
  id: string;
  position: [number, number, number];
  fuseTimer: number; // seconds left
  ownerTeam: TeamColor;
}

export interface CharacterState {
  id: string;
  name: string;
  team: TeamColor;
  isBot: boolean;
  position: [number, number, number];
  velocity: [number, number, number];
  yaw: number;
  pitch: number;
  health: number;
  maxHealth: number;
  isGrounded: boolean;
  selectedSlotIndex: number;
  inventory: (InventorySlot | null)[];
  currencies: CurrencyAmounts;
  armorTier: number; // 0: none, 1: chain, 2: iron, 3: diamond
  swordTier: number; // 1: wood, 2: stone, 3: iron, 4: diamond, 5: emerald
  pickaxeTier: number; // 0: none, 1: wood, 2: iron, 3: diamond
  hasShears: boolean;
  isSwinging: boolean;
  swingProgress: number;
  isDead: boolean;
  respawnTimer: number;
  kills: number;
  finalKills: number;
  bedsBroken: number;
  blocksPlaced: number;
  lastDamagedTime?: number;
  aiState?: {
    targetPosition?: [number, number, number];
    action: 'gather' | 'bridge' | 'attack' | 'retreat' | 'defend';
    targetPlayerId?: string;
    targetBedTeam?: TeamColor;
    nextDecisionTime: number;
    lastAttackTime?: number;
  };
}

export interface KillFeedEntry {
  id: string;
  killerName: string;
  killerTeam: TeamColor;
  victimName: string;
  victimTeam: TeamColor;
  isFinalKill: boolean;
  reason: 'sword' | 'void' | 'fireball' | 'fall';
  timestamp: number;
}

export interface BedBreakEntry {
  id: string;
  breakerName: string;
  breakerTeam: TeamColor;
  brokenTeam: TeamColor;
  timestamp: number;
}

export type CameraMode = 'first' | 'third';

export type MapId = 'classic' | 'nether' | 'frost' | 'desert' | 'cyber';

export interface MapThemeConfig {
  id: MapId;
  name: string;
  nameZh: string;
  nameEn: string;
  subtitle: string;
  description: string;
  icon: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  skyColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  sunColor: number;
  sunIntensity: number;
  ambientColor: number;
  ambientGroundColor: number;
  ambientIntensity: number;
  baseIslandDistance: number;
  baseRadius: number;
  diamondIslandDistance: number;
  centerIslandRadius: number;
  islandY: number;
  voidKillY: number;
}

