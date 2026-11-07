import React from 'react';
import { X, Gamepad2, Shield, Sword, Box, Gem, Sparkles } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-850 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">床戰遊戲指南 (BedWars Guide)</h2>
              <p className="text-xs text-slate-400">了解核心目標、按鍵操作與獲勝技巧</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-300 leading-relaxed">
          {/* Objective */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <h3 className="font-black text-amber-400 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>核心目標：保衛床位，征服浮島！</span>
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>
                <strong className="text-emerald-400">床位存活：</strong>
                只要紅隊的床還在，陣亡後 5 秒內無限重生！
              </li>
              <li>
                <strong className="text-red-400">床位被毀：</strong>
                一旦床被敵方破壞，陣亡即是「最終擊殺 (Final Kill)」，直接淘汰！
              </li>
              <li>
                <strong className="text-amber-400">獲勝條件：</strong>
                摧毀藍隊、綠隊、黃隊的床，並將所有敵方成員擊殺淘汰即可獲得冠軍！
              </li>
            </ul>
          </div>

          {/* Controls table */}
          <div>
            <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
              <Sword className="w-4 h-4 text-sky-400" />
              <span>操作控制 (Controls)</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-slate-200">
              <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex justify-between">
                <span className="text-slate-400">移動</span>
                <span className="font-bold text-amber-300">W / A / S / D 或 方向鍵</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex justify-between">
                <span className="text-slate-400">跳躍 / 向上疊方塊</span>
                <span className="font-bold text-amber-300">Space 空白鍵</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex justify-between">
                <span className="text-slate-400">潛行防摔 (安全搭橋)</span>
                <span className="font-bold text-emerald-400">Shift 鍵 (不掉出邊緣)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex justify-between">
                <span className="text-slate-400">攻擊 / 挖方塊</span>
                <span className="font-bold text-amber-300">滑鼠左鍵</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex justify-between">
                <span className="text-slate-400">高速疊橋 / 放置</span>
                <span className="font-bold text-amber-300">右鍵 (長按連續疊橋)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex justify-between">
                <span className="text-slate-400">打開補給商店</span>
                <span className="font-bold text-amber-300">E 鍵</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex justify-between">
                <span className="text-slate-400">切換視角 (1/3人稱)</span>
                <span className="font-bold text-amber-300">V 鍵</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex justify-between">
                <span className="text-slate-400">物品欄切換</span>
                <span className="font-bold text-amber-300">1 ~ 8 或 滾輪</span>
              </div>
            </div>
          </div>

          {/* Winning Strategy Tips */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>實戰戰術錦囊</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                <div className="font-bold text-amber-300 mb-1">1. 床防禦 (Bed Defense)</div>
                <p className="text-[11px] text-slate-400">
                  先買木板包覆床位防止被剪刀秒拆，中後期攢綠寶石升級黑曜石，堅不可摧！
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                <div className="font-bold text-sky-300 mb-1">2. 鑽石科技 (Diamond Tech)</div>
                <p className="text-[11px] text-slate-400">
                  搭橋前往中間鑽石島，升級全隊鋒利度與保護裝甲，大幅提高近戰優勢！
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                <div className="font-bold text-emerald-300 mb-1">3. 擊退地形殺 (Void Knockback)</div>
                <p className="text-[11px] text-slate-400">
                  近戰具有真實擊退力！在窄橋上善用烈焰彈與劍刃連擊將敵人直接推入虛空！
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow"
          >
            我明白了，開始戰鬥！
          </button>
        </div>
      </div>
    </div>
  );
};
