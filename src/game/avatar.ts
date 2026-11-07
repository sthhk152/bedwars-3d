import * as THREE from 'three';
import { CharacterState, TeamColor } from '../types/game';

// Face canvas texture cache
const faceTextureCache: Record<string, THREE.CanvasTexture> = {};

function getRobloxFaceTexture(isHappy = true): THREE.CanvasTexture {
  const key = `face_${isHappy ? 'happy' : 'serious'}`;
  if (faceTextureCache[key]) return faceTextureCache[key];

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Yellow skin tone base
  ctx.fillStyle = '#ffcf33';
  ctx.fillRect(0, 0, 64, 64);

  // Black cute Roblox/Lego eyes
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(20, 26, 4.5, 0, Math.PI * 2);
  ctx.arc(44, 26, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Eye highlights
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(18.5, 24.5, 1.8, 0, Math.PI * 2);
  ctx.arc(42.5, 24.5, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(32, 38, 12, 0.15 * Math.PI, 0.85 * Math.PI, false);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  faceTextureCache[key] = texture;
  return texture;
}

export interface AvatarMeshObject extends THREE.Group {
  updateAnimation: (state: CharacterState, delta: number) => void;
  setHeldItem: (itemId: string | null) => void;
  updateHealthTag: (health: number, maxHealth: number) => void;
}

export function createCharacterAvatar(
  team: TeamColor,
  characterName: string,
  isPlayer: boolean
): AvatarMeshObject {
  const avatarGroup = new THREE.Group() as AvatarMeshObject;

  const teamColors: Record<TeamColor, number> = {
    red: 0xef4444,
    blue: 0x3b82f6,
    green: 0x10b981,
    yellow: 0xeab308,
  };

  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcf33, // Classic Roblox bright yellow
    roughness: 0.6,
    metalness: 0.1,
  });

  const faceMaterial = new THREE.MeshStandardMaterial({
    map: getRobloxFaceTexture(true),
    roughness: 0.6,
    metalness: 0.1,
  });

  const shirtMaterial = new THREE.MeshStandardMaterial({
    color: teamColors[team],
    roughness: 0.5,
    metalness: 0.15,
  });

  const pantsMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark navy pants
    roughness: 0.7,
    metalness: 0.05,
  });

  // 1. Torso (0.8 wide, 1.0 high, 0.5 deep)
  const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
  const torsoMesh = new THREE.Mesh(torsoGeo, shirtMaterial);
  torsoMesh.position.y = 1.3;
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  avatarGroup.add(torsoMesh);

  // 2. Head (0.6 x 0.6 x 0.6)
  const headMaterials = [
    skinMaterial, // right
    skinMaterial, // left
    skinMaterial, // top
    skinMaterial, // bottom
    faceMaterial, // front
    skinMaterial, // back
  ];
  const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const headMesh = new THREE.Mesh(headGeo, headMaterials);
  headMesh.position.y = 2.1;
  headMesh.castShadow = true;
  avatarGroup.add(headMesh);

  // 3. Left Arm (pivot at shoulder)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.6, 1.7, 0);
  const armGeo = new THREE.BoxGeometry(0.38, 0.95, 0.38);
  armGeo.translate(0, -0.45, 0); // shift pivot to top shoulder
  const leftArmMesh = new THREE.Mesh(armGeo, shirtMaterial);
  leftArmMesh.castShadow = true;
  leftArmGroup.add(leftArmMesh);
  avatarGroup.add(leftArmGroup);

  // 4. Right Arm (pivot at shoulder)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.6, 1.7, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, shirtMaterial);
  rightArmMesh.castShadow = true;
  rightArmGroup.add(rightArmMesh);
  avatarGroup.add(rightArmGroup);

  // 5. Left Leg (pivot at hip)
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.22, 0.8, 0);
  const legGeo = new THREE.BoxGeometry(0.38, 0.8, 0.38);
  legGeo.translate(0, -0.4, 0); // shift pivot to hip
  const leftLegMesh = new THREE.Mesh(legGeo, pantsMaterial);
  leftLegMesh.castShadow = true;
  leftLegGroup.add(leftLegMesh);
  avatarGroup.add(leftLegGroup);

  // 6. Right Leg (pivot at hip)
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.22, 0.8, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, pantsMaterial);
  rightLegMesh.castShadow = true;
  rightLegGroup.add(rightLegMesh);
  avatarGroup.add(rightLegGroup);

  // 7. Held Item Container inside Right Arm (sword or block)
  const heldItemContainer = new THREE.Group();
  heldItemContainer.position.set(0, -0.75, 0.2);
  rightArmGroup.add(heldItemContainer);

  let currentHeldMesh: THREE.Object3D | null = null;

  // Build sword 3D model
  function buildSwordMesh(tier: number): THREE.Group {
    const sword = new THREE.Group();
    const colors: Record<number, number> = {
      1: 0x8b5a2b, // Wood
      2: 0x9ca3af, // Stone
      3: 0xf1f5f9, // Iron (gleaming silver)
      4: 0x38bdf8, // Diamond (glowing cyan)
      5: 0x4ade80, // Emerald (neon emerald)
    };
    const bladeColor = colors[tier] || colors[1];

    // Hilt / Handle
    const hiltGeo = new THREE.BoxGeometry(0.06, 0.25, 0.06);
    const hiltMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.8 });
    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
    hilt.position.y = -0.1;
    sword.add(hilt);

    // Crossguard
    const guardGeo = new THREE.BoxGeometry(0.25, 0.05, 0.08);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.8, roughness: 0.3 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = 0.05;
    sword.add(guard);

    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.12, 0.65, 0.04);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: bladeColor,
      metalness: tier >= 3 ? 0.85 : 0.2,
      roughness: tier >= 3 ? 0.2 : 0.6,
      emissive: tier === 4 ? 0x0284c7 : tier === 5 ? 0x16a34a : 0x000000,
      emissiveIntensity: 0.25,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.4;
    sword.add(blade);

    // Tip
    const tipGeo = new THREE.ConeGeometry(0.08, 0.15, 4);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.y = 0.78;
    tip.rotation.y = Math.PI / 4;
    sword.add(tip);

    sword.rotation.x = Math.PI / 3;
    sword.rotation.z = -Math.PI / 8;
    return sword;
  }

  // Build block held mesh
  function buildBlockMesh(blockType: string): THREE.Group {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const mat = new THREE.MeshStandardMaterial({
      color: blockType === 'wool' ? teamColors[team] : blockType === 'obsidian' ? 0x241442 : 0xb88648,
      roughness: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    return group;
  }

  avatarGroup.setHeldItem = (itemId: string | null) => {
    if (currentHeldMesh) {
      heldItemContainer.remove(currentHeldMesh);
      currentHeldMesh = null;
    }
    if (!itemId) return;

    if (itemId.includes('sword')) {
      const tier = itemId.includes('emerald') ? 5 : itemId.includes('diamond') ? 4 : itemId.includes('iron') ? 3 : itemId.includes('stone') ? 2 : 1;
      currentHeldMesh = buildSwordMesh(tier);
      heldItemContainer.add(currentHeldMesh);
    } else if (itemId.includes('wool') || itemId.includes('wood') || itemId.includes('obsidian')) {
      currentHeldMesh = buildBlockMesh(itemId);
      heldItemContainer.add(currentHeldMesh);
    }
  };

  // 8. Overhead Name & Health Badge (Sprite)
  const badgeCanvas = document.createElement('canvas');
  badgeCanvas.width = 256;
  badgeCanvas.height = 72;
  const badgeCtx = badgeCanvas.getContext('2d')!;
  const badgeTexture = new THREE.CanvasTexture(badgeCanvas);
  badgeTexture.colorSpace = THREE.SRGBColorSpace;
  const badgeMaterial = new THREE.SpriteMaterial({
    map: badgeTexture,
    transparent: true,
    depthTest: false,
  });
  const nameSprite = new THREE.Sprite(badgeMaterial);
  nameSprite.position.y = 2.8;
  nameSprite.scale.set(1.8, 0.5, 1);
  avatarGroup.add(nameSprite);

  function drawNameBadge(name: string, health: number, maxHealth: number) {
    badgeCtx.clearRect(0, 0, 256, 72);

    // Pill background
    badgeCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    badgeCtx.beginPath();
    badgeCtx.roundRect(10, 8, 236, 56, 12);
    badgeCtx.fill();

    // Name text
    const hex = '#' + teamColors[team].toString(16).padStart(6, '0');
    badgeCtx.fillStyle = hex;
    badgeCtx.font = 'bold 20px "Segoe UI", sans-serif';
    badgeCtx.textAlign = 'center';
    badgeCtx.fillText(name, 128, 30);

    // Health bar container
    const barWidth = 180;
    const barHeight = 10;
    const barX = (256 - barWidth) / 2;
    const barY = 40;
    badgeCtx.fillStyle = '#334155';
    badgeCtx.fillRect(barX, barY, barWidth, barHeight);

    // Health bar fill
    const pct = Math.max(0, Math.min(1, health / maxHealth));
    badgeCtx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444';
    badgeCtx.fillRect(barX, barY, barWidth * pct, barHeight);

    badgeTexture.needsUpdate = true;
  }

  drawNameBadge(characterName, 100, 100);

  avatarGroup.updateHealthTag = (hp, maxHp) => {
    drawNameBadge(characterName, hp, maxHp);
  };

  // Walk & Swing Animation Controller
  let walkPhase = 0;
  avatarGroup.updateAnimation = (state: CharacterState, delta: number) => {
    const isMoving = Math.hypot(state.velocity[0], state.velocity[2]) > 0.2;

    if (isMoving && state.isGrounded) {
      walkPhase += delta * 12;
      const legAngle = Math.sin(walkPhase) * 0.6;
      leftLegGroup.rotation.x = legAngle;
      rightLegGroup.rotation.x = -legAngle;

      if (!state.isSwinging) {
        leftArmGroup.rotation.x = -legAngle * 0.8;
        rightArmGroup.rotation.x = legAngle * 0.8;
      }
    } else {
      leftLegGroup.rotation.x = THREE.MathUtils.damp(leftLegGroup.rotation.x, 0, 10, delta);
      rightLegGroup.rotation.x = THREE.MathUtils.damp(rightLegGroup.rotation.x, 0, 10, delta);
      if (!state.isSwinging) {
        leftArmGroup.rotation.x = THREE.MathUtils.damp(leftArmGroup.rotation.x, 0, 10, delta);
        rightArmGroup.rotation.x = THREE.MathUtils.damp(rightArmGroup.rotation.x, 0, 10, delta);
      }
    }

    // Swing animation
    if (state.isSwinging) {
      // Rapid swing arc
      const swingAngle = Math.sin(state.swingProgress * Math.PI) * 1.5;
      rightArmGroup.rotation.x = -0.5 - swingAngle;
      rightArmGroup.rotation.y = -0.3;
    } else {
      rightArmGroup.rotation.y = THREE.MathUtils.damp(rightArmGroup.rotation.y, 0, 12, delta);
    }
  };

  return avatarGroup;
}
