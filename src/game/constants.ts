import { TeamColor, TeamInfo, ShopItem, ResourceType } from '../types/game';

// Map Dimensions & Positions
// Base Islands arranged in a diamond/square around the center
export const BASE_ISLAND_RADIUS = 36; // distance from (0,0)
export const DIAMOND_ISLAND_RADIUS = 26; // 45-deg diagonal
export const ISLAND_Y = 10;
export const VOID_KILL_Y = -12;

export const INITIAL_TEAMS: Record<TeamColor, TeamInfo> = {
  red: {
    id: 'red',
    name: 'Red Team',
    nameZh: '紅隊',
    hex: '#ef4444',
    bedAlive: true,
    playersAlive: 2, // 1 player + 1 friendly bot (or 1v1v1v1)
    bedPosition: [0, ISLAND_Y + 1, BASE_ISLAND_RADIUS - 5],
    spawnPosition: [0, ISLAND_Y + 1.5, BASE_ISLAND_RADIUS + 3],
    shopPosition: [-4, ISLAND_Y + 1.5, BASE_ISLAND_RADIUS],
    sharpnessLevel: 0,
    armorProtectionLevel: 0,
    forgeLevel: 0,
  },
  blue: {
    id: 'blue',
    name: 'Blue Team',
    nameZh: '藍隊',
    hex: '#3b82f6',
    bedAlive: true,
    playersAlive: 2,
    bedPosition: [0, ISLAND_Y + 1, -BASE_ISLAND_RADIUS + 5],
    spawnPosition: [0, ISLAND_Y + 1.5, -BASE_ISLAND_RADIUS - 3],
    shopPosition: [4, ISLAND_Y + 1.5, -BASE_ISLAND_RADIUS],
    sharpnessLevel: 0,
    armorProtectionLevel: 0,
    forgeLevel: 0,
  },
  green: {
    id: 'green',
    name: 'Green Team',
    nameZh: '綠隊',
    hex: '#10b981',
    bedAlive: true,
    playersAlive: 2,
    bedPosition: [-BASE_ISLAND_RADIUS + 5, ISLAND_Y + 1, 0],
    spawnPosition: [-BASE_ISLAND_RADIUS - 3, ISLAND_Y + 1.5, 0],
    shopPosition: [-BASE_ISLAND_RADIUS, ISLAND_Y + 1.5, 4],
    sharpnessLevel: 0,
    armorProtectionLevel: 0,
    forgeLevel: 0,
  },
  yellow: {
    id: 'yellow',
    name: 'Yellow Team',
    nameZh: '黃隊',
    hex: '#eab308',
    bedAlive: true,
    playersAlive: 2,
    bedPosition: [BASE_ISLAND_RADIUS - 5, ISLAND_Y + 1, 0],
    spawnPosition: [BASE_ISLAND_RADIUS + 3, ISLAND_Y + 1.5, 0],
    shopPosition: [BASE_ISLAND_RADIUS, ISLAND_Y + 1.5, -4],
    sharpnessLevel: 0,
    armorProtectionLevel: 0,
    forgeLevel: 0,
  },
};

export const DIAMOND_ISLANDS_POSITIONS: [number, number, number][] = [
  [DIAMOND_ISLAND_RADIUS, ISLAND_Y + 1, DIAMOND_ISLAND_RADIUS],
  [-DIAMOND_ISLAND_RADIUS, ISLAND_Y + 1, DIAMOND_ISLAND_RADIUS],
  [DIAMOND_ISLAND_RADIUS, ISLAND_Y + 1, -DIAMOND_ISLAND_RADIUS],
  [-DIAMOND_ISLAND_RADIUS, ISLAND_Y + 1, -DIAMOND_ISLAND_RADIUS],
];

export const CENTER_ISLAND_POSITION: [number, number, number] = [0, ISLAND_Y + 1, 0];

// Shop Items List
export const SHOP_ITEMS: ShopItem[] = [
  // Blocks
  {
    id: 'wool_16',
    name: 'Wool (x16)',
    nameZh: '羊毛 (16塊)',
    description: 'Fast bridging blocks. Easy to place and destroy.',
    category: 'block',
    cost: 4,
    currency: 'iron',
    icon: 'wool',
    amount: 16,
  },
  {
    id: 'wood_16',
    name: 'Wood Planks (x16)',
    nameZh: '木板 (16塊)',
    description: 'Solid defense against basic attacks. Immune to shears.',
    category: 'block',
    cost: 16,
    currency: 'iron',
    icon: 'wood',
    amount: 16,
  },
  {
    id: 'obsidian_4',
    name: 'Obsidian (x4)',
    nameZh: '黑曜石 (4塊)',
    description: 'Ultimate bed defense! Blast-proof and hard to break.',
    category: 'block',
    cost: 4,
    currency: 'emerald',
    icon: 'obsidian',
    amount: 4,
  },

  // Weapons
  {
    id: 'stone_sword',
    name: 'Stone Sword',
    nameZh: '石劍',
    description: '造成 12 點傷害。穩健開局武器。',
    category: 'weapon',
    cost: 10,
    currency: 'iron',
    icon: 'stone_sword',
    slotType: 'weapon',
    tier: 2,
  },
  {
    id: 'iron_sword',
    name: 'Iron Sword',
    nameZh: '鐵劍',
    description: '造成 16 點傷害。強化近戰擊退。',
    category: 'weapon',
    cost: 7,
    currency: 'gold',
    icon: 'iron_sword',
    slotType: 'weapon',
    tier: 3,
  },
  {
    id: 'diamond_sword',
    name: 'Diamond Sword',
    nameZh: '鑽石劍',
    description: '造成 22 點傷害。強大斬擊優勢。',
    category: 'weapon',
    cost: 4,
    currency: 'emerald',
    icon: 'diamond_sword',
    slotType: 'weapon',
    tier: 4,
  },

  // Armor (Persistent through respawns)
  {
    id: 'chainmail_armor',
    name: 'Chainmail Armor',
    nameZh: '鎖子甲套裝',
    description: 'Reduces damage taken by 15%. Keeps on respawn.',
    category: 'armor',
    cost: 40,
    currency: 'iron',
    icon: 'chain_armor',
    slotType: 'armor',
    tier: 1,
  },
  {
    id: 'iron_armor',
    name: 'Iron Armor',
    nameZh: '鐵甲套裝',
    description: 'Reduces damage taken by 30%. Keeps on respawn.',
    category: 'armor',
    cost: 12,
    currency: 'gold',
    icon: 'iron_armor',
    slotType: 'armor',
    tier: 2,
  },
  {
    id: 'diamond_armor',
    name: 'Diamond Armor',
    nameZh: '鑽石裝套裝',
    description: 'Reduces damage taken by 50%. Maximum protection!',
    category: 'armor',
    cost: 6,
    currency: 'emerald',
    icon: 'diamond_armor',
    slotType: 'armor',
    tier: 3,
  },

  // Tools
  {
    id: 'shears',
    name: 'Permanent Shears',
    nameZh: '防具剪刀',
    description: 'Instantly breaks wool blocks. Keeps on death.',
    category: 'tool',
    cost: 20,
    currency: 'iron',
    icon: 'shears',
    slotType: 'tool',
  },
  {
    id: 'wooden_pickaxe',
    name: 'Wood Pickaxe',
    nameZh: '木鎬',
    description: 'Basic mining tool for wood and stone.',
    category: 'tool',
    cost: 10,
    currency: 'iron',
    icon: 'pickaxe_wood',
    slotType: 'tool',
    tier: 1,
  },
  {
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    nameZh: '鐵鎬',
    description: 'Mines stone and obsidian faster. Upgradeable.',
    category: 'tool',
    cost: 10,
    currency: 'gold',
    icon: 'pickaxe_iron',
    slotType: 'tool',
    tier: 2,
  },
  {
    id: 'diamond_pickaxe',
    name: 'Diamond Pickaxe',
    nameZh: '鑽石鎬',
    description: 'Rapidly demolishes obsidian and all defenses.',
    category: 'tool',
    cost: 3,
    currency: 'emerald',
    icon: 'pickaxe_diamond',
    slotType: 'tool',
    tier: 3,
  },

  // Utilities
  {
    id: 'fireball',
    name: 'Fireball',
    nameZh: '烈焰彈',
    description: 'Right-click to throw! Causes an explosive knockback.',
    category: 'utility',
    cost: 40,
    currency: 'iron',
    icon: 'fireball',
    amount: 1,
  },
  {
    id: 'tnt',
    name: 'TNT Explosive',
    nameZh: 'TNT 炸藥',
    description: 'Ignites on placement! Blasts wool & wood blocks.',
    category: 'utility',
    cost: 4,
    currency: 'gold',
    icon: 'tnt',
    amount: 1,
  },
  {
    id: 'golden_apple',
    name: 'Golden Apple',
    nameZh: '金蘋果',
    description: 'Right click to eat! Grants +30 HP and Absorption.',
    category: 'utility',
    cost: 3,
    currency: 'gold',
    icon: 'golden_apple',
    amount: 1,
  },
  {
    id: 'telepearl',
    name: 'Telepearl (Ender Pearl)',
    nameZh: '瞬移珍珠',
    description: 'Throw to instantly teleport to impact location!',
    category: 'utility',
    cost: 4,
    currency: 'emerald',
    icon: 'telepearl',
    amount: 1,
  },
];

// Team Upgrade definitions (Bought with Diamonds)
export interface TeamUpgrade {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  levels: { cost: number; desc: string }[];
  currentLevel: (team: TeamInfo) => number;
}

export const TEAM_UPGRADES: TeamUpgrade[] = [
  {
    id: 'sharpness',
    name: 'Sharpened Swords',
    nameZh: '鋒利附魔',
    description: 'Your team deals +15% / +30% melee attack damage.',
    levels: [
      { cost: 4, desc: '+15% Melee Damage' },
      { cost: 8, desc: '+30% Melee Damage' },
    ],
    currentLevel: (team) => team.sharpnessLevel,
  },
  {
    id: 'protection',
    name: 'Reinforced Armor',
    nameZh: '保護附魔',
    description: 'Your team takes 10% / 20% less damage.',
    levels: [
      { cost: 3, desc: '+10% Team Armor Reduction' },
      { cost: 6, desc: '+20% Team Armor Reduction' },
    ],
    currentLevel: (team) => team.armorProtectionLevel,
  },
  {
    id: 'forge',
    name: 'Iron Forge Booster',
    nameZh: '發電機加速',
    description: 'Boosts resource spawner rates at your home base.',
    levels: [
      { cost: 2, desc: '+50% Base Resource Spawn Rate' },
      { cost: 4, desc: '+100% Base Rate + Emeralds at Base' },
    ],
    currentLevel: (team) => team.forgeLevel,
  },
];

export const WEAPON_DAMAGE: Record<number, number> = {
  1: 8,  // Wood sword / Fists (8 dmg: 13 hits on full 100 HP)
  2: 12, // Stone sword (12 dmg: 9 hits)
  3: 16, // Iron sword (16 dmg: 7 hits)
  4: 22, // Diamond sword (22 dmg: 5 hits)
  5: 28, // Emerald sword (28 dmg: 4 hits)
};

export const ARMOR_REDUCTION: Record<number, number> = {
  0: 0.0,
  1: 0.15, // Chainmail
  2: 0.32, // Iron
  3: 0.52, // Diamond
};

export const BLOCK_HARDNESS: Record<string, number> = {
  wool: 0.25,      // almost instant
  wood: 1.2,       // medium
  stone: 2.0,      // slow without pickaxe
  obsidian: 5.5,   // very tough
  bed: 1.5,        // bed takes 1.5s
};
