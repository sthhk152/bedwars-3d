import React, { useState } from 'react';
import {
  CharacterState,
  ShopItem,
  TeamColor,
  TeamInfo,
  ResourceType,
} from '../types/game';
import { SHOP_ITEMS, TEAM_UPGRADES } from '../game/constants';
import {
  X,
  ShoppingBag,
  Sparkles,
  Shield,
  Sword,
  Box,
  Wrench,
  Zap,
  Gem,
} from 'lucide-react';

interface ShopModalProps {
  player: CharacterState;
  teams: Record<TeamColor, TeamInfo>;
  isOpen: boolean;
  onClose: () => void;
  onBuyItem: (item: ShopItem) => boolean;
  onBuyUpgrade: (upgradeId: 'sharpness' | 'protection' | 'forge') => boolean;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  player,
  teams,
  isOpen,
  onClose,
  onBuyItem,
  onBuyUpgrade,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'items' | 'upgrades'>('items');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [message, setMessage] = useState<string | null>(null);

  const team = teams[player.team];

  const getCurrencyColor = (c: ResourceType) => {
    switch (c) {
      case 'iron':
        return 'text-slate-200 bg-slate-800 border-slate-700';
      case 'gold':
        return 'text-amber-300 bg-amber-950/60 border-amber-600/50';
      case 'diamond':
        return 'text-sky-300 bg-sky-950/60 border-sky-500/50';
      case 'emerald':
        return 'text-emerald-300 bg-emerald-950/60 border-emerald-500/50';
    }
  };

  const getCurrencyName = (c: ResourceType) => {
    switch (c) {
      case 'iron':
        return '鐵錠';
      case 'gold':
        return '金錠';
      case 'diamond':
        return '鑽石';
      case 'emerald':
        return '綠寶石';
    }
  };

  const getSlotIcon = (iconName: string) => {
    switch (iconName) {
      case 'wool':
        return '🧶';
      case 'wood':
        return '🪵';
      case 'obsidian':
        return '⬛';
      case 'stone_sword':
      case 'iron_sword':
      case 'diamond_sword':
        return '⚔️';
      case 'chain_armor':
      case 'iron_armor':
      case 'diamond_armor':
        return '🛡️';
      case 'shears':
        return '✂️';
      case 'pickaxe_wood':
      case 'pickaxe_iron':
      case 'pickaxe_diamond':
        return '⛏️';
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

  const handleBuy = (item: ShopItem) => {
    const success = onBuyItem(item);
    if (success) {
      setMessage(`已購買 ${item.nameZh}！`);
      setTimeout(() => setMessage(null), 1800);
    } else {
      setMessage(`資源不足，無法購買！`);
      setTimeout(() => setMessage(null), 1800);
    }
  };

  const handleUpgrade = (upgradeId: 'sharpness' | 'protection' | 'forge') => {
    const success = onBuyUpgrade(upgradeId);
    if (success) {
      setMessage(`隊伍科技升級成功！`);
      setTimeout(() => setMessage(null), 1800);
    } else {
      setMessage(`鑽石不足，無法升級！`);
      setTimeout(() => setMessage(null), 1800);
    }
  };

  const filteredItems = SHOP_ITEMS.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-850 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">床戰補給商店 (BedWars Shop)</h2>
              <p className="text-xs text-slate-400">獲取方塊、武器、防具與戰術道具</p>
            </div>
          </div>

          {/* Current balance */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="font-bold text-white">{player.currencies.iron}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/40 border border-amber-600/50 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="font-bold text-amber-300">{player.currencies.gold}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-950/40 border border-sky-500/50 text-xs">
              <Gem className="w-3 h-3 text-sky-400" />
              <span className="font-bold text-sky-300">{player.currencies.diamond}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-xs">
              <Gem className="w-3 h-3 text-emerald-400" />
              <span className="font-bold text-emerald-300">{player.currencies.emerald}</span>
            </div>

            <button
              onClick={onClose}
              className="ml-3 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher: Items vs Team Upgrades */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 font-bold text-sm border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'items'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>道具物資</span>
          </button>
          <button
            onClick={() => setActiveTab('upgrades')}
            className={`px-4 py-2 font-bold text-sm border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'upgrades'
                ? 'border-sky-400 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>隊伍升級 (鑽石科技)</span>
          </button>
        </div>

        {/* Categories Bar for items */}
        {activeTab === 'items' && (
          <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-900/60 overflow-x-auto border-b border-slate-800/80">
            {[
              { id: 'all', label: '全部' },
              { id: 'block', label: '方塊搭橋' },
              { id: 'weapon', label: '近戰近身武器' },
              { id: 'armor', label: '護甲防禦' },
              { id: 'tool', label: '挖掘工具' },
              { id: 'utility', label: '投擲道具與特殊' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Notification feedback */}
        {message && (
          <div className="mx-6 mt-3 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-bold text-center">
            {message}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'items' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredItems.map((item) => {
                const canAfford = player.currencies[item.currency] >= item.cost;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border flex flex-col justify-between transition ${
                      canAfford
                        ? 'bg-slate-850/80 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                        : 'bg-slate-900/50 border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{getSlotIcon(item.icon)}</span>
                        <div
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1 ${getCurrencyColor(
                            item.currency
                          )}`}
                        >
                          <span>{item.cost}</span>
                          <span>{getCurrencyName(item.currency)}</span>
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-100 text-sm">{item.nameZh}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <button
                      disabled={!canAfford}
                      onClick={() => handleBuy(item)}
                      className={`mt-3 w-full py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? '購買' : '資源不足'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Team Upgrades View */
            <div className="space-y-4">
              <p className="text-xs text-slate-400 mb-2">
                使用從邊界鑽石島收集的<strong className="text-sky-300">鑽石</strong>升級全隊科技！
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TEAM_UPGRADES.map((upgrade) => {
                  const currentLevel = upgrade.currentLevel(team);
                  const isMax = currentLevel >= upgrade.levels.length;
                  const nextCost = !isMax ? upgrade.levels[currentLevel].cost : 0;
                  const canAfford = !isMax && player.currencies.diamond >= nextCost;

                  return (
                    <div
                      key={upgrade.id}
                      className="p-4 rounded-2xl bg-slate-850 border border-slate-700 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs px-2 py-0.5 rounded font-bold bg-sky-950 border border-sky-500 text-sky-300">
                            等級 {currentLevel} / {upgrade.levels.length}
                          </span>
                          {!isMax && (
                            <span className="text-xs font-bold text-sky-300 flex items-center gap-1">
                              <Gem className="w-3.5 h-3.5" />
                              {nextCost} 鑽石
                            </span>
                          )}
                        </div>

                        <h4 className="font-black text-slate-100 text-base">{upgrade.nameZh}</h4>
                        <p className="text-xs text-slate-400 mt-1">{upgrade.description}</p>

                        <div className="mt-3 space-y-1">
                          {upgrade.levels.map((lvl, idx) => (
                            <div
                              key={idx}
                              className={`text-[11px] px-2 py-1 rounded flex items-center justify-between ${
                                idx < currentLevel
                                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-slate-800/50 text-slate-400'
                              }`}
                            >
                              <span>等級 {idx + 1}: {lvl.desc}</span>
                              {idx < currentLevel && <span>✓ 已解鎖</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        disabled={isMax || !canAfford}
                        onClick={() =>
                          handleUpgrade(upgrade.id as 'sharpness' | 'protection' | 'forge')
                        }
                        className={`mt-4 w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                          isMax
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : canAfford
                            ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {isMax ? '已達最高等級' : canAfford ? '立即升級' : '鑽石不足'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>提示：按下鍵盤 ESC 或 E 鍵可隨時關閉商店</span>
          <span className="text-amber-400 font-semibold">死亡後防具與剪刀依然保留！</span>
        </div>
      </div>
    </div>
  );
};
