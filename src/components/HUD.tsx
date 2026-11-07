import React, { useState } from 'react';
import {
  CharacterState,
  TeamColor,
  TeamInfo,
  KillFeedEntry,
  VoxelBlock,
  CameraMode,
} from '../types/game';
import {
  Shield,
  Sword,
  Gem,
  ShoppingBag,
  Volume2,
  VolumeX,
  HelpCircle,
  Eye,
  Crosshair,
  Lock,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { sounds } from '../audio/soundEffects';

interface HUDProps {
  player: CharacterState;
  teams: Record<TeamColor, TeamInfo>;
  killFeed: KillFeedEntry[];
  targetedBlock: VoxelBlock | null;
  miningProgress: number;
  respawnTimer: number;
  cameraMode: CameraMode;
  mouseLocked: boolean;
  onSelectSlot: (idx: number) => void;
  onOpenShop: () => void;
  onToggleCamera: () => void;
  onRequestPointerLock: () => void;
  onOpenHelp: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  teams,
  killFeed,
  targetedBlock,
  miningProgress,
  respawnTimer,
  cameraMode,
  mouseLocked,
  onSelectSlot,
  onOpenShop,
  onToggleCamera,
  onRequestPointerLock,
  onOpenHelp,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.getMuted());

  const handleToggleMute = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  const getSlotIcon = (iconName: string) => {
    switch (iconName) {
      case 'wood_sword':
        return '🗡️';
      case 'stone_sword':
        return '⚔️';
      case 'iron_sword':
        return '⚔️';
      case 'diamond_sword':
        return '💎⚔️';
      case 'wool':
        return '🧶';
      case 'wood':
        return '🪵';
      case 'obsidian':
        return '⬛';
      case 'pickaxe_wood':
      case 'pickaxe_iron':
      case 'pickaxe_diamond':
        return '⛏️';
      case 'shears':
        return '✂️';
      case 'fireball':
        return '🔥';
      case 'tnt':
        return '🧨';
      case 'golden_apple':
        return '🍏';
      case 'telepearl':
        return '🔮';
      default:
        return '📦';
    }
  };

  const teamColors: Record<TeamColor, { name: string; bg: string; text: string; border: string }> = {
    red: { name: '紅隊 (我方)', bg: 'bg-red-500/80', text: 'text-red-400', border: 'border-red-500' },
    blue: { name: '藍隊', bg: 'bg-blue-500/80', text: 'text-blue-400', border: 'border-blue-500' },
    green: { name: '綠隊', bg: 'bg-emerald-500/80', text: 'text-emerald-400', border: 'border-emerald-500' },
    yellow: { name: '黃隊', bg: 'bg-amber-500/80', text: 'text-amber-400', border: 'border-amber-500' },
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans">
      {/* 1. TOP BAR: Resource Currency Counters */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-2xl shadow-xl pointer-events-auto">
        {/* Iron */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700">
          <span className="w-3.5 h-3.5 rounded-full bg-slate-300 shadow-sm inline-block" />
          <span className="text-xs font-semibold text-slate-300">鐵錠</span>
          <span className="text-sm font-black text-white ml-0.5">{player.currencies.iron}</span>
        </div>

        {/* Gold */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/40 border border-amber-600/50">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-sm inline-block" />
          <span className="text-xs font-semibold text-amber-300">金錠</span>
          <span className="text-sm font-black text-amber-200 ml-0.5">{player.currencies.gold}</span>
        </div>

        {/* Diamond */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-950/40 border border-sky-500/50">
          <Gem className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-semibold text-sky-300">鑽石</span>
          <span className="text-sm font-black text-sky-200 ml-0.5">{player.currencies.diamond}</span>
        </div>

        {/* Emerald */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/50">
          <Gem className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">綠寶石</span>
          <span className="text-sm font-black text-emerald-200 ml-0.5">{player.currencies.emerald}</span>
        </div>
      </div>

      {/* 2. TOP RIGHT: Kill Feed & Notifications */}
      <div className="absolute top-4 right-4 flex flex-col gap-1.5 max-w-sm pointer-events-none">
        {killFeed.slice(0, 5).map((entry) => (
          <div
            key={entry.id}
            className={`text-xs px-3 py-1.5 rounded-lg shadow-md border flex items-center gap-2 ${
              entry.isFinalKill
                ? 'bg-red-950/80 border-red-500/80 text-red-200'
                : 'bg-slate-900/85 border-slate-700/80 text-slate-200'
            }`}
          >
            {entry.victimName.includes('床位') ? (
              <>
                <span className="text-base">🛏️</span>
                <span className="font-bold text-yellow-300">{entry.killerName}</span>
                <span>摧毀了</span>
                <span className="font-bold text-red-400">{entry.victimName}</span>
                <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black">床破!</span>
              </>
            ) : (
              <>
                <span className="text-sm">⚔️</span>
                <span className="font-bold text-sky-300">{entry.killerName}</span>
                <span className="text-slate-400">擊殺了</span>
                <span className="font-bold text-amber-300">{entry.victimName}</span>
                {entry.isFinalKill && (
                  <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black">
                    最終擊殺
                  </span>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* 3. TOP LEFT: Team Bed Status Sidebar */}
      <div className="absolute top-4 left-4 bg-slate-900/85 border border-slate-700/70 rounded-2xl p-3 shadow-xl backdrop-blur-sm pointer-events-auto min-w-[160px]">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
          <span>隊伍床位狀態</span>
          <span className="text-emerald-400 font-bold">4 隊</span>
        </div>
        <div className="space-y-1.5">
          {(Object.keys(teams) as TeamColor[]).map((tKey) => {
            const team = teams[tKey];
            const cfg = teamColors[tKey];
            return (
              <div
                key={tKey}
                className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-slate-800/60"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.bg}`} />
                  <span className="font-bold text-slate-200">{cfg.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {team.bedAlive ? (
                    <span className="text-emerald-400 font-bold text-xs">🛏️ 存活</span>
                  ) : team.playersAlive > 0 ? (
                    <span className="text-amber-400 font-bold text-xs">{team.playersAlive}人</span>
                  ) : (
                    <span className="text-slate-500 font-bold text-xs">✕ 淘汰</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. CENTER CROSSHAIR & MINING PROGRESS */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex items-center justify-center">
          {/* Subtle crosshair */}
          <div className="w-4 h-0.5 bg-white/70 shadow-sm" />
          <div className="h-4 w-0.5 bg-white/70 shadow-sm absolute" />

          {/* Mining circular progress indicator */}
          {miningProgress > 0 && (
            <svg className="absolute w-12 h-12 -rotate-90 pointer-events-none">
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="#22c55e"
                strokeWidth="4"
                strokeDasharray={113}
                strokeDashoffset={113 * (1 - miningProgress)}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          )}

          {/* Block targeting tooltip */}
          {targetedBlock && (
            <div className="absolute top-7 bg-slate-900/95 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap shadow-lg flex items-center gap-1.5 font-bold">
              {targetedBlock.type === 'bed' ? (
                targetedBlock.team === player.team ? (
                  <span className="text-emerald-400">
                    🛏️ {teams[targetedBlock.team!].nameZh} 自家床位 (友軍保護中)
                  </span>
                ) : (
                  <span className="text-red-400 animate-pulse">
                    🛏️ {teams[targetedBlock.team!].nameZh} 敵方床位 (長按左鍵破壞！)
                  </span>
                )
              ) : targetedBlock.type === 'wool' ? (
                <span>🧶 羊毛方塊</span>
              ) : targetedBlock.type === 'wood' ? (
                <span>🪵 木板</span>
              ) : targetedBlock.type === 'obsidian' ? (
                <span className="text-purple-300">⬛ 黑曜石</span>
              ) : (
                <span className="text-slate-400">浮島基石</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. RESPAWN COUNTDOWN OVERLAY */}
      {player.isDead && respawnTimer > 0 && (
        <div className="absolute inset-0 bg-red-950/70 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none z-20">
          <div className="text-4xl font-black text-red-500 tracking-wider mb-2">你陣亡了！</div>
          <div className="text-xl text-white font-semibold mb-4">
            床位仍然完好，正在重生...
          </div>
          <div className="w-16 h-16 rounded-full bg-red-600/30 border-4 border-red-500 flex items-center justify-center text-3xl font-black text-white animate-bounce">
            {Math.ceil(respawnTimer)}
          </div>
        </div>
      )}

      {/* 6. MOUSE UNLOCKED NOTICE */}
      {!mouseLocked && (
        <div
          onClick={onRequestPointerLock}
          className="absolute top-20 left-1/2 -translate-x-1/2 bg-amber-500/95 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-2xl cursor-pointer pointer-events-auto flex items-center gap-2 transition transform hover:scale-105"
        >
          <Lock className="w-4 h-4" />
          <span>點擊進入鎖定視角 (FPS 射擊模式)</span>
        </div>
      )}

      {/* 7. BOTTOM CENTER: HEALTH BAR + HOTBAR + COLLAPSIBLE DOCK */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto max-w-[94vw]">
        {/* Collapse toggle button */}
        <button
          onClick={() => setDockCollapsed(!dockCollapsed)}
          className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-t-lg border-t border-x border-slate-700/80 flex items-center gap-1 cursor-pointer transition shadow"
          title="隱藏/顯示控制欄 (H)"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? '展開控制欄' : '收起控制欄'}</span>
        </button>

        {/* Main Dock Container */}
        <div
          className={`flex flex-col items-center gap-2 bg-slate-900/95 border border-slate-700/90 rounded-2xl p-3 shadow-2xl transition-all duration-300 ${
            dockCollapsed ? 'translate-y-28 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          }`}
        >
          {/* Health Bar */}
          <div className="w-full flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
              <span>❤️ 生命值</span>
              <span className="text-white font-black">{Math.max(0, Math.round(player.health))} / 100</span>
            </div>
            <div className="flex-1 max-w-[280px] h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-emerald-500 to-green-400 transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, player.health))}%` }}
              />
            </div>
            {player.armorTier > 0 && (
              <div className="flex items-center gap-1 text-sky-400 text-xs font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>
                  {player.armorTier === 1 ? '鎖子甲 (-15%)' : player.armorTier === 2 ? '鐵甲 (-30%)' : '鑽石裝 (-50%)'}
                </span>
              </div>
            )}
          </div>

          {/* Hotbar Slots (1-8) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            {player.inventory.map((slot, idx) => {
              const isSelected = player.selectedSlotIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectSlot(idx)}
                  className={`relative w-12 h-12 rounded-lg flex flex-col items-center justify-center transition border cursor-pointer ${
                    isSelected
                      ? 'bg-slate-700 border-amber-400 ring-2 ring-amber-400/50 scale-105'
                      : 'bg-slate-800/80 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  <span className="absolute top-0.5 left-1 text-[9px] font-black text-slate-400">
                    {idx + 1}
                  </span>
                  {slot ? (
                    <>
                      <span className="text-xl leading-none">{getSlotIcon(slot.icon)}</span>
                      {slot.count > 1 && (
                        <span className="absolute bottom-0.5 right-1 text-[10px] font-black text-white bg-slate-900/90 px-1 rounded-sm shadow">
                          {slot.count}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-600 text-xs font-mono">-</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Action Pills */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800 w-full justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenShop}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>商店 (E)</span>
              </button>
              <button
                onClick={onToggleCamera}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{cameraMode === 'first' ? '第一人稱 (V)' : '第三人稱 (V)'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMute}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                title="靜音/開聲音"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onOpenHelp}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                title="玩法說明 (H)"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
