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
  MapThemeConfig,
  MapId,
} from './types/game';
import { INITIAL_TEAMS, MAP_CONFIGS } from './game/constants';
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
  const [currentMap, setCurrentMap] = useState<MapThemeConfig>(MAP_CONFIGS.classic);
  const [mapToast, setMapToast] = useState<MapThemeConfig | null>(null);
  const prevMapIdRef = useRef<string | null>(null);

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
        if (state.currentMap) {
          setCurrentMap(state.currentMap);
          if (prevMapIdRef.current !== state.currentMap.id) {
            prevMapIdRef.current = state.currentMap.id;
            setMapToast(state.currentMap);
            setTimeout(() => {
              setMapToast((curr) => (curr?.id === state.currentMap.id ? null : curr));
            }, 4500);
          }
        }
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

  const handleRestart = (preferredMapId?: MapId) => {
    if (engineRef.current) {
      engineRef.current.restartGame(preferredMapId);
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
          currentMap={currentMap}
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
          onSelectMap={handleRestart}
        />
      )}

      {/* 2.5 Animated Map Announcement Toast */}
      {mapToast && (
        <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center animate-bounce-in transition-all duration-300">
          <div
            className={`px-6 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl border flex items-center gap-3.5 ${mapToast.badgeBg} ${mapToast.badgeBorder}`}
          >
            <span className="text-3xl">{mapToast.icon}</span>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
                  本局隨機地圖
                </span>
                <span className="text-xs text-slate-300 font-semibold">{mapToast.nameEn}</span>
              </div>
              <div className="text-lg font-black text-white tracking-wide">{mapToast.nameZh}</div>
            </div>
          </div>
          <div className="mt-1.5 text-xs text-slate-200/90 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-700/80 shadow">
            {mapToast.subtitle} • {mapToast.description}
          </div>
        </div>
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
          currentMap={currentMap}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
