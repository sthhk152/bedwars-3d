import React, { useEffect, useRef, useState } from 'react';
import { BedWarsEngine } from './game/engine';
import {
  CharacterState,
  TeamColor,
  TeamInfo,
  KillFeedEntry,
  VoxelBlock,
  CameraMode,
  ShopItem,
} from './types/game';
import { INITIAL_TEAMS } from './game/constants';
import { HUD } from './components/HUD';
import { ShopModal } from './components/ShopModal';
import { HelpModal } from './components/HelpModal';
import { GameOverModal } from './components/GameOverModal';
import { MobileControls } from './components/MobileControls';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BedWarsEngine | null>(null);

  // Synchronized Game State for React UI
  const [playerState, setPlayerState] = useState<CharacterState | null>(null);
  const [teamsState, setTeamsState] = useState<Record<TeamColor, TeamInfo>>(INITIAL_TEAMS);
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [targetedBlock, setTargetedBlock] = useState<VoxelBlock | null>(null);
  const [miningProgress, setMiningProgress] = useState(0);
  const [respawnTimer, setRespawnTimer] = useState(0);
  const [matchEnded, setMatchEnded] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  // UI Modals
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('first');
  const [mouseLocked, setMouseLocked] = useState(false);

  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new BedWarsEngine(canvasMountRef.current, {
      onUpdateState: (state) => {
        setPlayerState({ ...state.player });
        setTeamsState({ ...state.teams });
        setKillFeed([...state.killFeed]);
        setTargetedBlock(state.targetedBlock);
        setMiningProgress(state.miningProgress);
        setRespawnTimer(state.respawnTimer);
        setMatchEnded(state.matchEnded);
        setIsVictory(state.isVictory);
      },
      onOpenShop: () => {
        setIsShopOpen(true);
        document.exitPointerLock?.();
      },
    });

    engineRef.current = engine;

    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvasMountRef.current;
      setMouseLocked(isLocked);
      if (engineRef.current) {
        engineRef.current.mouseLocked = isLocked;
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      engine.unbind();
    };
  }, []);

  const handleSelectSlot = (idx: number) => {
    if (engineRef.current) {
      engineRef.current.selectSlot(idx);
    }
  };

  const handleToggleCamera = () => {
    if (engineRef.current) {
      engineRef.current.toggleCameraMode();
      setCameraMode(engineRef.current.cameraMode);
    }
  };

  const handleRequestPointerLock = () => {
    if (engineRef.current && !isShopOpen && !isHelpOpen && !matchEnded) {
      engineRef.current.requestPointerLock();
    }
  };

  const handleBuyItem = (item: ShopItem) => {
    if (!engineRef.current) return false;
    return engineRef.current.buyItem(item);
  };

  const handleBuyUpgrade = (upgradeId: 'sharpness' | 'protection' | 'forge') => {
    if (!engineRef.current) return false;
    return engineRef.current.buyUpgrade(upgradeId);
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restartGame();
      setMatchEnded(false);
      setIsVictory(false);
    }
  };

  // Mobile joystick callbacks
  const handleMobileMove = (x: number, y: number) => {
    if (!engineRef.current || !playerState) return;
    const speed = 7.5;
    const sinYaw = Math.sin(playerState.yaw);
    const cosYaw = Math.cos(playerState.yaw);
    const fwdX = -sinYaw;
    const fwdZ = -cosYaw;
    const rightX = cosYaw;
    const rightZ = -sinYaw;
    const fwdInput = -y;
    const strafeInput = x;
    engineRef.current.player.velocity[0] = (fwdX * fwdInput + rightX * strafeInput) * speed;
    engineRef.current.player.velocity[2] = (fwdZ * fwdInput + rightZ * strafeInput) * speed;
  };

  const handleMobileAttack = () => {
    if (engineRef.current) {
      engineRef.current.startPlayerAction('attack');
    }
  };

  const handleMobilePlace = () => {
    if (engineRef.current) {
      engineRef.current.executePlayerRightClick();
    }
  };

  const handleMobileJump = () => {
    if (engineRef.current && engineRef.current.player.isGrounded) {
      engineRef.current.player.velocity[1] = 9.8;
      engineRef.current.player.isGrounded = false;
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 1. Dedicated isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        onClick={handleRequestPointerLock}
        className="w-full h-full cursor-crosshair"
      />

      {/* 2. Interactive HUD Overlay */}
      {playerState && (
        <HUD
          player={playerState}
          teams={teamsState}
          killFeed={killFeed}
          targetedBlock={targetedBlock}
          miningProgress={miningProgress}
          respawnTimer={respawnTimer}
          cameraMode={cameraMode}
          mouseLocked={mouseLocked}
          onSelectSlot={handleSelectSlot}
          onOpenShop={() => {
            setIsShopOpen(true);
            document.exitPointerLock?.();
          }}
          onToggleCamera={handleToggleCamera}
          onRequestPointerLock={handleRequestPointerLock}
          onOpenHelp={() => {
            setIsHelpOpen(true);
            document.exitPointerLock?.();
          }}
        />
      )}

      {/* 3. Mobile Touch Controls (shown on touch devices) */}
      <MobileControls
        onMove={handleMobileMove}
        onAttack={handleMobileAttack}
        onPlaceOrUse={handleMobilePlace}
        onJump={handleMobileJump}
        onOpenShop={() => {
          setIsShopOpen(true);
          document.exitPointerLock?.();
        }}
        onToggleCamera={handleToggleCamera}
      />

      {/* 4. Modals */}
      {playerState && (
        <ShopModal
          player={playerState}
          teams={teamsState}
          isOpen={isShopOpen}
          onClose={() => setIsShopOpen(false)}
          onBuyItem={handleBuyItem}
          onBuyUpgrade={handleBuyUpgrade}
        />
      )}

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {matchEnded && playerState && (
        <GameOverModal
          isVictory={isVictory}
          player={playerState}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
