import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CharacterState } from '../types/game';
import { Trophy, Skull, RefreshCw, Award, Hammer, Shield } from 'lucide-react';

interface GameOverModalProps {
  isVictory: boolean;
  player: CharacterState;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isVictory,
  player,
  onRestart,
}) => {
  useEffect(() => {
    if (isVictory) {
      // Confetti burst
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });
      const timer = setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isVictory]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 text-center flex flex-col items-center">
        {/* Banner Trophy / Skull */}
        <div
          className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-xl border ${
            isVictory
              ? 'bg-amber-500/20 border-amber-400 text-amber-400'
              : 'bg-red-500/20 border-red-500 text-red-400'
          }`}
        >
          {isVictory ? <Trophy className="w-10 h-10" /> : <Skull className="w-10 h-10" />}
        </div>

        <h2 className="text-3xl font-black text-white tracking-wide">
          {isVictory ? 'VICTORY ROYAL!' : 'GAME OVER'}
        </h2>
        <p className="text-sm font-semibold mt-1 text-slate-300">
          {isVictory ? '恭喜！紅隊征服了所有浮島，贏得床戰冠軍！' : '你的床位被破壞且隊伍全數陣亡！'}
        </p>

        {/* Match Statistics Card */}
        <div className="w-full my-6 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-left space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            本場對局戰績 (Match Stats)
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-between">
              <span className="text-slate-400">總擊殺數</span>
              <span className="font-black text-white text-sm">{player.kills}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-between">
              <span className="text-red-400 font-semibold">最終擊殺</span>
              <span className="font-black text-red-300 text-sm">{player.finalKills}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-between">
              <span className="text-amber-400 font-semibold">摧毀床位</span>
              <span className="font-black text-amber-300 text-sm">{player.bedsBroken}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-between">
              <span className="text-slate-400">放置方塊</span>
              <span className="font-black text-white text-sm">{player.blocksPlaced}</span>
            </div>
          </div>
        </div>

        {/* Restart Button */}
        <button
          onClick={onRestart}
          className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xl transition transform hover:scale-[1.02] cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>再戰一局 (Play Again)</span>
        </button>
      </div>
    </div>
  );
};
