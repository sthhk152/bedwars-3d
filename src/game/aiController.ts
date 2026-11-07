import * as THREE from 'three';
import {
  CharacterState,
  TeamColor,
  TeamInfo,
  VoxelBlock,
} from '../types/game';
import { INITIAL_TEAMS, DIAMOND_ISLANDS_POSITIONS, CENTER_ISLAND_POSITION } from './constants';
import { blockKey } from './mapBuilder';

const _botDir = new THREE.Vector3();
const _targetVec = new THREE.Vector3();

export class AIController {
  // Update AI bot decision and return movement inputs
  public updateBot(
    bot: CharacterState,
    allCharacters: CharacterState[],
    teams: Record<TeamColor, TeamInfo>,
    blocks: Map<string, VoxelBlock>,
    delta: number,
    now: number,
    onPlaceBlock: (bot: CharacterState, pos: [number, number, number]) => void,
    onAttack: (bot: CharacterState) => void,
    onBreakBlock: (bot: CharacterState, blockKey: string) => void
  ): { moveForward: number; moveRight: number; jump: boolean; targetYaw: number } {
    if (bot.isDead) {
      return { moveForward: 0, moveRight: 0, jump: false, targetYaw: bot.yaw };
    }

    if (!bot.aiState) {
      bot.aiState = {
        action: 'gather',
        nextDecisionTime: 0,
      };
    }

    const [bx, by, bz] = bot.position;
    const team = teams[bot.team];

    // Periodically re-evaluate high level goal
    if (now > bot.aiState.nextDecisionTime) {
      bot.aiState.nextDecisionTime = now + 1.5 + Math.random() * 1.5;

      // Find nearest living enemy
      let nearestEnemy: CharacterState | null = null;
      let minEnemyDist = 999;

      for (const char of allCharacters) {
        if (char.team !== bot.team && !char.isDead) {
          const d = Math.hypot(char.position[0] - bx, char.position[2] - bz);
          if (d < minEnemyDist) {
            minEnemyDist = d;
            nearestEnemy = char;
          }
        }
      }

      // Check enemy beds
      const enemyBedTeams = (['red', 'blue', 'green', 'yellow'] as TeamColor[]).filter(
        (t) => t !== bot.team && teams[t].bedAlive
      );

      // Decision tree
      if (minEnemyDist < 10 && nearestEnemy) {
        bot.aiState.action = 'attack';
        bot.aiState.targetPlayerId = nearestEnemy.id;
        bot.aiState.targetPosition = nearestEnemy.position;
      } else if (bot.currencies.iron < 8 && Math.hypot(bx - team.spawnPosition[0], bz - team.spawnPosition[2]) < 18) {
        // Gather at base
        bot.aiState.action = 'gather';
        bot.aiState.targetPosition = [team.spawnPosition[0], team.spawnPosition[1], team.spawnPosition[2]];
      } else if (enemyBedTeams.length > 0 && Math.random() > 0.4) {
        // Assault enemy bed
        const targetTeamKey = enemyBedTeams[Math.floor(Math.random() * enemyBedTeams.length)];
        bot.aiState.action = 'attack';
        bot.aiState.targetBedTeam = targetTeamKey;
        bot.aiState.targetPosition = teams[targetTeamKey].bedPosition;
      } else {
        // Roam to diamond / center island
        const targetDest = Math.random() > 0.5 ? CENTER_ISLAND_POSITION : DIAMOND_ISLANDS_POSITIONS[Math.floor(Math.random() * 4)];
        bot.aiState.action = 'bridge';
        bot.aiState.targetPosition = [targetDest[0], targetDest[1], targetDest[2]];
      }

      // Bot simulated shop spending:
      if (bot.currencies.iron >= 10 && bot.swordTier < 2) {
        bot.currencies.iron -= 10;
        bot.swordTier = 2; // Stone sword
      } else if (bot.currencies.gold >= 7 && bot.swordTier < 3) {
        bot.currencies.gold -= 7;
        bot.swordTier = 3; // Iron sword
      } else if (bot.currencies.iron >= 4) {
        bot.currencies.iron -= 4;
        // replenish wool blocks
        const woolSlot = bot.inventory.find((s) => s && s.blockType === 'wool');
        if (woolSlot) {
          woolSlot.count += 16;
        } else {
          bot.inventory[1] = {
            id: 'wool',
            name: 'Wool',
            nameZh: '羊毛',
            icon: 'wool',
            category: 'block',
            count: 16,
            blockType: 'wool',
          };
        }
      }
    }

    // Execute current action movement
    const targetPos = bot.aiState.targetPosition || team.spawnPosition;
    const dx = targetPos[0] - bx;
    const dz = targetPos[2] - bz;
    const distToTarget = Math.hypot(dx, dz);

    let targetYaw = Math.atan2(dx, dz);
    let moveForward = 0;
    let jump = false;

    if (distToTarget > 1.2) {
      moveForward = 1.0;

      // Bridging / Gap detection: check if block in front of bot is empty air
      const stepAheadX = Math.round(bx + Math.sin(targetYaw) * 1.2);
      const stepAheadZ = Math.round(bz + Math.cos(targetYaw) * 1.2);
      const floorBelowY = Math.round(by - 0.5);

      const blockBelow = blocks.get(blockKey(stepAheadX, floorBelowY, stepAheadZ));
      if (!blockBelow) {
        // Place a wool bridge block underneath!
        const woolSlot = bot.inventory.find((s) => s && s.blockType === 'wool' && s.count > 0);
        if (woolSlot) {
          onPlaceBlock(bot, [stepAheadX, floorBelowY, stepAheadZ]);
          woolSlot.count--;
        } else {
          // No wool left, jump or turn
          jump = true;
        }
      }

      // Obstacle detection ahead -> jump over
      const blockInFace = blocks.get(blockKey(stepAheadX, Math.round(by + 0.5), stepAheadZ));
      if (blockInFace) {
        if (blockInFace.type === 'bed') {
          // Mine the bed!
          onBreakBlock(bot, blockInFace.id);
        } else {
          jump = true;
        }
      }
    }

    // Combat Attack if near enemy with balanced attack cooldown (0.85s)
    if (bot.aiState.action === 'attack') {
      const nearest = allCharacters.find(
        (c) => c.team !== bot.team && !c.isDead && Math.hypot(c.position[0] - bx, c.position[2] - bz) < 3.2
      );
      if (nearest) {
        targetYaw = Math.atan2(nearest.position[0] - bx, nearest.position[2] - bz);
        const lastAtk = bot.aiState.lastAttackTime || 0;
        if (now - lastAtk > 0.85) {
          bot.aiState.lastAttackTime = now;
          onAttack(bot);
        }
      }
    }

    return {
      moveForward,
      moveRight: 0,
      jump,
      targetYaw,
    };
  }
}

export const aiController = new AIController();
