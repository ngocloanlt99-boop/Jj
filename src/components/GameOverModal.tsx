import React, { useState } from 'react';
import { RotateCcw, Share2, Download, Award, Sparkles, Check } from 'lucide-react';
import { MedalType } from '../types';
import { playClickSound } from '../utils/audio';
import { vibrateClick } from '../utils/haptics';
import { usePWAInstall } from './usePWAInstall';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  highScore: number;
  isNewHigh: boolean;
  medal: MedalType;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  highScore,
  isNewHigh,
  medal,
  soundEnabled,
  hapticsEnabled,
  onRestart,
}) => {
  const { isInstallable, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleShare = async () => {
    playClickSound(soundEnabled);
    vibrateClick(hapticsEnabled);

    const shareText = `Tôi vừa đạt ${score} điểm trong game Flappy Bird Android! Hãy cùng chơi và phá kỷ lục nhé! 🐦🔥`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Flappy Bird Android',
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // User cancelled or unsupported
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleInstallPWA = () => {
    playClickSound(soundEnabled);
    vibrateClick(hapticsEnabled);
    install();
  };

  const handleRestartClick = () => {
    playClickSound(soundEnabled);
    vibrateClick(hapticsEnabled);
    onRestart();
  };

  const renderMedal = () => {
    if (medal === 'none') {
      return (
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-zinc-700 bg-zinc-800/80 flex items-center justify-center text-zinc-500 text-[10px] font-bold">
          Chưa có
        </div>
      );
    }

    const medalConfig: Record<
      Exclude<MedalType, 'none'>,
      { label: string; bg: string; border: string; glow: string }
    > = {
      bronze: {
        label: 'ĐỒNG',
        bg: 'bg-gradient-to-br from-[#d97736] to-[#8b4513]',
        border: 'border-[#f4a261]',
        glow: 'shadow-[0_0_15px_rgba(217,119,54,0.5)]',
      },
      silver: {
        label: 'BẠC',
        bg: 'bg-gradient-to-br from-[#e0e0e0] to-[#9e9e9e]',
        border: 'border-[#ffffff]',
        glow: 'shadow-[0_0_15px_rgba(224,224,224,0.5)]',
      },
      gold: {
        label: 'VÀNG',
        bg: 'bg-gradient-to-br from-[#ffd700] to-[#b8860b]',
        border: 'border-[#fff4a3]',
        glow: 'shadow-[0_0_20px_rgba(255,215,0,0.6)]',
      },
      platinum: {
        label: 'BẠCH KIM',
        bg: 'bg-gradient-to-br from-[#b0e0e6] to-[#4682b4]',
        border: 'border-[#e0ffff]',
        glow: 'shadow-[0_0_25px_rgba(176,224,230,0.8)]',
      },
    };

    const cfg = medalConfig[medal];

    return (
      <div
        className={`relative w-14 h-14 rounded-full border-2 ${cfg.border} ${cfg.bg} ${cfg.glow} flex flex-col items-center justify-center text-white shadow-md animate-bounce duration-1000`}
      >
        <Award className="w-6 h-6 drop-shadow-md text-white" />
        <span className="text-[8px] font-arcade tracking-tighter text-white font-bold drop-shadow">
          {cfg.label}
        </span>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      {/* Game Over Banner */}
      <div className="mb-4 text-center animate-in zoom-in-90 duration-200">
        <h1 className="font-arcade text-2xl sm:text-3xl text-red-500 drop-shadow-[0_4px_0_#000] tracking-wider animate-pulse">
          GAME OVER
        </h1>
        <p className="text-[10px] text-zinc-300 font-medium mt-1">Đừng nản lòng, hãy thử lại!</p>
      </div>

      {/* Classic Retro Score Board */}
      <div className="w-full max-w-[310px] rounded-2xl bg-[#ded895] border-4 border-[#543847] p-4 shadow-[0_12px_0_#543847] text-[#543847] relative">
        {/* New record badge */}
        {isNewHigh && (
          <div className="absolute -top-3 -right-2 bg-red-600 text-white font-arcade text-[9px] px-2.5 py-1 rounded-full border-2 border-white shadow-lg flex items-center gap-1 animate-bounce">
            <Sparkles className="w-3 h-3 text-yellow-300" /> KỶ LỤC MỚI!
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          {/* Medal Column */}
          <div className="flex flex-col items-center">
            <span className="font-arcade text-[9px] text-[#543847] mb-1.5 uppercase font-bold">
              HUY CHƯƠNG
            </span>
            {renderMedal()}
          </div>

          {/* Scores Column */}
          <div className="flex-1 flex flex-col items-end gap-2 bg-[#d2c974] p-2.5 rounded-xl border-2 border-[#543847]">
            <div className="w-full flex items-center justify-between">
              <span className="font-arcade text-[9px] uppercase tracking-tight text-[#705335]">
                ĐIỂM:
              </span>
              <span className="font-arcade text-xl text-[#543847] font-bold">{score}</span>
            </div>

            <div className="w-full h-px bg-[#543847]/30" />

            <div className="w-full flex items-center justify-between">
              <span className="font-arcade text-[9px] uppercase tracking-tight text-[#705335]">
                CAO NHẤT:
              </span>
              <span className="font-arcade text-xl text-[#543847] font-bold">{highScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-[310px] mt-6 flex flex-col gap-2.5">
        {/* Play again button */}
        <button
          id="btn-play-again"
          onClick={handleRestartClick}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-b from-[#5eead4] to-[#0d9488] border-3 border-[#042f2e] text-[#042f2e] font-arcade text-xs shadow-[0_5px_0_#042f2e] active:translate-y-1 active:shadow-none hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer font-bold"
        >
          <RotateCcw className="w-4 h-4 stroke-[3]" />
          CHƠI LẠI
        </button>

        {/* Share Score Button */}
        <button
          id="btn-share-score"
          onClick={handleShare}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-b from-[#fde047] to-[#eab308] border-3 border-[#713f12] text-[#713f12] font-arcade text-[10px] shadow-[0_4px_0_#713f12] active:translate-y-1 active:shadow-none hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer font-bold"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-800" /> ĐÃ SAO CHÉP ĐIỂM!
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 stroke-[3]" /> CHIA SẺ ĐIỂM SỐ
            </>
          )}
        </button>

        {/* Android PWA Install button */}
        {isInstallable && (
          <button
            id="btn-pwa-install"
            onClick={handleInstallPWA}
            className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 border-2 border-emerald-500/80 text-emerald-400 font-medium text-xs hover:bg-zinc-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Cài đặt Game lên Android (PWA)</span>
          </button>
        )}
      </div>

      <p className="mt-4 text-[10px] text-zinc-400 font-mono">
        💡 Mẹo: Chạm vào bất cứ đâu hoặc nhấn <span className="text-amber-400 font-bold">Space</span> để bay!
      </p>
    </div>
  );
};
