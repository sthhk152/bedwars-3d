import React, { useRef, useState, useEffect } from 'react';
import { Sword, Box, ArrowUp, ShoppingBag, Eye } from 'lucide-react';

interface MobileControlsProps {
  onMove: (x: number, y: number) => void;
  onAttack: () => void;
  onPlaceOrUse: () => void;
  onJump: () => void;
  onOpenShop: () => void;
  onToggleCamera: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onAttack,
  onPlaceOrUse,
  onJump,
  onOpenShop,
  onToggleCamera,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const maxRadius = 40;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsDragging(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        onMove(0, 0);
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobPos({ x: kx, y: ky });
    onMove(kx / maxRadius, ky / maxRadius);
  };

  // Only render on touch-capable devices or small screens
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouchDevice(true);
    }
  }, []);

  if (!isTouchDevice) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30">
      {/* Virtual Joystick on bottom left */}
      <div
        ref={joystickRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="absolute bottom-24 left-8 w-28 h-28 rounded-full bg-slate-900/60 border-2 border-slate-700/60 backdrop-blur-sm pointer-events-auto flex items-center justify-center touch-none"
      >
        <div
          className="w-12 h-12 rounded-full bg-amber-500/80 shadow-lg border border-amber-300"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        />
      </div>

      {/* Action Buttons on bottom right */}
      <div className="absolute bottom-24 right-8 flex flex-col items-end gap-3 pointer-events-auto">
        <div className="flex items-center gap-2">
          {/* Shop */}
          <button
            onTouchStart={onOpenShop}
            className="w-11 h-11 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-lg border border-amber-300 active:scale-90 transition cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" />
          </button>
          {/* Perspective */}
          <button
            onTouchStart={onToggleCamera}
            className="w-11 h-11 rounded-full bg-slate-800/90 text-white flex items-center justify-center shadow-lg border border-slate-600 active:scale-90 transition cursor-pointer"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Place Block / Use */}
          <button
            onTouchStart={onPlaceOrUse}
            className="w-14 h-14 rounded-2xl bg-sky-500/90 text-white flex flex-col items-center justify-center shadow-xl border border-sky-300 active:scale-90 transition cursor-pointer font-bold text-[10px]"
          >
            <Box className="w-6 h-6 mb-0.5" />
            <span>放置/使用</span>
          </button>

          {/* Jump */}
          <button
            onTouchStart={onJump}
            className="w-14 h-14 rounded-2xl bg-slate-700/90 text-white flex flex-col items-center justify-center shadow-xl border border-slate-500 active:scale-90 transition cursor-pointer font-bold text-[10px]"
          >
            <ArrowUp className="w-6 h-6 mb-0.5" />
            <span>跳躍</span>
          </button>

          {/* Attack / Mine */}
          <button
            onTouchStart={onAttack}
            className="w-16 h-16 rounded-3xl bg-red-600/90 text-white flex flex-col items-center justify-center shadow-2xl border-2 border-red-400 active:scale-90 transition cursor-pointer font-black text-xs"
          >
            <Sword className="w-7 h-7 mb-0.5" />
            <span>攻擊/挖</span>
          </button>
        </div>
      </div>
    </div>
  );
};
