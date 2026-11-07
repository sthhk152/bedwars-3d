import * as THREE from 'three';
import { VoxelBlock } from '../types/game';
import { blockKey } from './mapBuilder';

// Pre-allocated math objects to avoid per-frame GC allocations
const _ray = new THREE.Ray();

export interface RaycastBlockResult {
  block: VoxelBlock;
  targetPos: [number, number, number];
  placePos: [number, number, number];
  distance: number;
}

export class PhysicsEngine {
  public gravity = -28;
  public playerRadius = 0.35;
  public playerHeight = 1.8;

  // Check collision for an AABB at position with voxel blocks
  public checkBlockCollision(
    pos: [number, number, number],
    blocks: Map<string, VoxelBlock>
  ): boolean {
    const minX = Math.floor(pos[0] - this.playerRadius);
    const maxX = Math.ceil(pos[0] + this.playerRadius);
    const minY = Math.floor(pos[1]);
    const maxY = Math.ceil(pos[1] + this.playerHeight);
    const minZ = Math.floor(pos[2] - this.playerRadius);
    const maxZ = Math.ceil(pos[2] + this.playerRadius);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const key = blockKey(x, y, z);
          if (blocks.has(key)) {
            // AABB overlap test
            const bMinX = x - 0.5;
            const bMaxX = x + 0.5;
            const bMinY = y - 0.5;
            const bMaxY = y + 0.5;
            const bMinZ = z - 0.5;
            const bMaxZ = z + 0.5;

            const pMinX = pos[0] - this.playerRadius;
            const pMaxX = pos[0] + this.playerRadius;
            const pMinY = pos[1];
            const pMaxY = pos[1] + this.playerHeight;
            const pMinZ = pos[2] - this.playerRadius;
            const pMaxZ = pos[2] + this.playerRadius;

            if (
              pMinX < bMaxX &&
              pMaxX > bMinX &&
              pMinY < bMaxY &&
              pMaxY > bMinY &&
              pMinZ < bMaxZ &&
              pMaxZ > bMinZ
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // Check if there is solid block directly under a footprint point
  public hasGroundBeneath(x: number, y: number, z: number, blocks: Map<string, VoxelBlock>): boolean {
    const bx = Math.round(x);
    const by = Math.round(y - 0.5);
    const bz = Math.round(z);
    return blocks.has(blockKey(bx, by, bz));
  }

  // Update position with velocity & voxel collision + safe edge sneaking
  public updateCharacterMovement(
    pos: [number, number, number],
    vel: [number, number, number],
    blocks: Map<string, VoxelBlock>,
    delta: number,
    isSneaking = false
  ): {
    newPos: [number, number, number];
    newVel: [number, number, number];
    isGrounded: boolean;
  } {
    let [px, py, pz] = pos;
    let [vx, vy, vz] = vel;

    // Apply gravity
    vy += this.gravity * delta;
    if (vy < -35) vy = -35; // Terminal velocity

    let grounded = false;

    // Move Y axis first
    const newY = py + vy * delta;
    if (this.checkBlockCollision([px, newY, pz], blocks)) {
      if (vy < 0) {
        // Landed on floor
        grounded = true;
        // Snap to top of block
        const blockUnderY = Math.round(newY - 0.1);
        py = blockUnderY + 0.5;
        vy = 0;
      } else {
        // Hit ceiling
        vy = 0;
      }
    } else {
      py = newY;
    }

    // Sneaking edge guard check
    let allowMoveX = true;
    let allowMoveZ = true;

    if (isSneaking && grounded) {
      const stepX = px + vx * delta;
      const stepZ = pz + vz * delta;
      // If moving in X would leave no ground beneath feet, block X motion
      if (!this.hasGroundBeneath(stepX, py, pz, blocks)) {
        allowMoveX = false;
        vx = 0;
      }
      // If moving in Z would leave no ground beneath feet, block Z motion
      if (!this.hasGroundBeneath(px, py, stepZ, blocks)) {
        allowMoveZ = false;
        vz = 0;
      }
    }

    // Move X axis
    if (allowMoveX) {
      const newX = px + vx * delta;
      if (this.checkBlockCollision([newX, py, pz], blocks)) {
        // Step-up assistance for 1-block steps
        if (grounded && !this.checkBlockCollision([newX, py + 1.05, pz], blocks)) {
          py += 1.05;
          px = newX;
        } else {
          vx = 0;
        }
      } else {
        px = newX;
      }
    }

    // Move Z axis
    if (allowMoveZ) {
      const newZ = pz + vz * delta;
      if (this.checkBlockCollision([px, py, newZ], blocks)) {
        if (grounded && !this.checkBlockCollision([px, py + 1.05, newZ], blocks)) {
          py += 1.05;
          pz = newZ;
        } else {
          vz = 0;
        }
      } else {
        pz = newZ;
      }
    }

    // Ground friction
    if (grounded) {
      vx *= Math.pow(0.001, delta);
      vz *= Math.pow(0.001, delta);
    } else {
      // Air resistance
      vx *= Math.pow(0.15, delta);
      vz *= Math.pow(0.15, delta);
    }

    return {
      newPos: [px, py, pz],
      newVel: [vx, vy, vz],
      isGrounded: grounded,
    };
  }

  // Fast 3D DDA (Digital Differential Analyzer) Voxel Raycast
  public raycastBlock(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    blocks: Map<string, VoxelBlock>,
    maxDist = 5.0
  ): RaycastBlockResult | null {
    _ray.origin.copy(origin);
    _ray.direction.copy(direction).normalize();

    // Voxel coordinates of start
    let cx = Math.floor(origin.x + 0.5);
    let cy = Math.floor(origin.y + 0.5);
    let cz = Math.floor(origin.z + 0.5);

    const dx = _ray.direction.x;
    const dy = _ray.direction.y;
    const dz = _ray.direction.z;

    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;

    const deltaX = dx !== 0 ? Math.abs(1 / dx) : 1e30;
    const deltaY = dy !== 0 ? Math.abs(1 / dy) : 1e30;
    const deltaZ = dz !== 0 ? Math.abs(1 / dz) : 1e30;

    let maxX = dx > 0 ? (cx + 0.5 - origin.x) * deltaX : (origin.x - (cx - 0.5)) * deltaX;
    let maxY = dy > 0 ? (cy + 0.5 - origin.y) * deltaY : (origin.y - (cy - 0.5)) * deltaY;
    let maxZ = dz > 0 ? (cz + 0.5 - origin.z) * deltaZ : (origin.z - (cz - 0.5)) * deltaZ;

    let dist = 0;
    let normalX = 0;
    let normalY = 0;
    let normalZ = 0;

    while (dist < maxDist) {
      const key = blockKey(cx, cy, cz);
      const blk = blocks.get(key);
      if (blk) {
        return {
          block: blk,
          targetPos: [cx, cy, cz],
          placePos: [cx + normalX, cy + normalY, cz + normalZ],
          distance: dist,
        };
      }

      // Advance to next voxel boundary
      if (maxX < maxY) {
        if (maxX < maxZ) {
          dist = maxX;
          maxX += deltaX;
          cx += stepX;
          normalX = -stepX;
          normalY = 0;
          normalZ = 0;
        } else {
          dist = maxZ;
          maxZ += deltaZ;
          cz += stepZ;
          normalX = 0;
          normalY = 0;
          normalZ = -stepZ;
        }
      } else {
        if (maxY < maxZ) {
          dist = maxY;
          maxY += deltaY;
          cy += stepY;
          normalX = 0;
          normalY = -stepY;
          normalZ = 0;
        } else {
          dist = maxZ;
          maxZ += deltaZ;
          cz += stepZ;
          normalX = 0;
          normalY = 0;
          normalZ = -stepZ;
        }
      }
    }

    return null;
  }

  // BedWars Speed Bridging assist: find nearest adjacent void spot connected to solid ground
  public findBridgingTarget(
    playerPos: [number, number, number],
    yaw: number,
    pitch: number,
    blocks: Map<string, VoxelBlock>
  ): [number, number, number] | null {
    const [px, py, pz] = playerPos;
    const floorY = Math.round(py - 0.5);

    // Look vector
    const lookX = -Math.sin(yaw);
    const lookZ = -Math.cos(yaw);

    // If looking down into void, check the voxels 1-3 blocks forward from the player's ground
    for (let dist = 1; dist <= 3; dist++) {
      const tx = Math.round(px + lookX * dist);
      const tz = Math.round(pz + lookZ * dist);
      const ty = floorY;

      const key = blockKey(tx, ty, tz);
      // Target must be empty air
      if (!blocks.has(key)) {
        // Target must be adjacent to at least one solid block to bridge onto
        const neighbors = [
          blockKey(tx + 1, ty, tz),
          blockKey(tx - 1, ty, tz),
          blockKey(tx, ty + 1, tz),
          blockKey(tx, ty - 1, tz),
          blockKey(tx, ty, tz + 1),
          blockKey(tx, ty, tz - 1),
        ];
        if (neighbors.some((nKey) => blocks.has(nKey))) {
          return [tx, ty, tz];
        }
      }
    }

    // Also check directly beneath if jumping / towering
    const underKey = blockKey(Math.round(px), floorY, Math.round(pz));
    if (!blocks.has(underKey)) {
      const underUnder = blockKey(Math.round(px), floorY - 1, Math.round(pz));
      if (blocks.has(underUnder)) {
        return [Math.round(px), floorY, Math.round(pz)];
      }
    }

    return null;
  }
}

export const physics = new PhysicsEngine();
