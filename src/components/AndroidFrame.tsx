import React, { useEffect, useState } from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  isMockupEnabled: boolean;
  onToggleMockup: () => void;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  isMockupEnabled,
  onToggleMockup,
}) => {
  const [currentTime, setCurrentTime] = useState('12:00');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center bg-zinc-950 p-0 sm:p-4 select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-zinc-950 to-emerald-950/20 pointer-events-none" />

      {/* Main Container: Phone chassis on desktop, or full screen on mobile */}
      <div
        className={`relative flex flex-col overflow-hidden transition-all duration-300 ${
          isMockupEnabled
            ? 'w-full h-full sm:h-[844px] sm:max-w-[400px] sm:rounded-[44px] sm:border-[10px] sm:border-zinc-800 sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_2px_rgba(255,255,255,0.08)]'
            : 'w-full h-full max-w-lg'
        }`}
        style={{
          boxShadow: isMockupEnabled
            ? '0 0 0 1px rgba(255,255,255,0.05), 0 20px 50px rgba(0,0,0,0.8)'
            : 'none',
        }}
      >
        {/* Android Status Bar */}
        <div className="relative z-30 h-7 w-full bg-black/40 backdrop-blur-xs flex items-center justify-between px-5 text-white/90 text-xs font-semibold select-none pointer-events-none">
          {/* Time */}
          <span className="tracking-tight text-[11px] font-mono">{currentTime}</span>

          {/* Android Punch Hole Camera */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-3.5 h-3.5 rounded-full bg-black border border-zinc-800 shadow-inner flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-blue-950/80" />
          </div>

          {/* Android System Icons */}
          <div className="flex items-center gap-1.5 text-[11px] opacity-90">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <BatteryMedium className="w-4 h-4" />
          </div>
        </div>

        {/* Game Canvas Container */}
        <div className="relative flex-1 w-full h-full overflow-hidden bg-black">
          {children}
        </div>

        {/* Android Navigation Bar (Bottom Gesture Bar) */}
        <div className="relative z-30 h-5 w-full bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none">
          <div className="w-28 h-1 bg-white/40 rounded-full" />
        </div>
      </div>

      {/* Desktop Controls (outside frame on large screens) */}
      <div className="hidden sm:flex items-center gap-3 mt-3 text-xs text-zinc-400 font-medium z-10">
        <span>Giao diện:</span>
        <button
          id="btn-toggle-frame"
          type="button"
          onClick={onToggleMockup}
          className="px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition border border-zinc-700 cursor-pointer flex items-center gap-1.5"
        >
          <span>{isMockupEnabled ? '📱 Khung Android' : '📱 Màn hình đầy đủ'}</span>
          <span className="text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded">Đổi</span>
        </button>
      </div>
    </div>
  );
};
