import React from 'react';
import { Volume2, VolumeX, Smartphone, Moon, Sun, X, Zap } from 'lucide-react';
import { GameSettings, BirdSkin, ThemeMode, Difficulty } from '../types';
import { playClickSound } from '../utils/audio';
import { vibrateClick } from '../utils/haptics';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleToggle = (key: keyof GameSettings, value: unknown) => {
    playClickSound(settings.soundEnabled);
    vibrateClick(settings.hapticsEnabled);
    onUpdateSettings({ [key]: value });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xs rounded-2xl bg-zinc-900 border-2 border-amber-500/40 p-5 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="font-arcade text-xs text-amber-400 tracking-wider">CÀI ĐẶT ANDROID</h2>
          <button
            id="btn-close-settings"
            onClick={() => {
              playClickSound(settings.soundEnabled);
              onClose();
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="mt-4 space-y-4 text-xs">
          {/* Sound toggle */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-zinc-300">
              {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
              Âm thanh 8-bit
            </span>
            <button
              id="btn-toggle-sound"
              onClick={() => handleToggle('soundEnabled', !settings.soundEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                settings.soundEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Haptic vibration toggle */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-zinc-300">
              <Smartphone className="w-4 h-4 text-amber-400" />
              Rung Haptic Android
            </span>
            <button
              id="btn-toggle-haptics"
              onClick={() => handleToggle('hapticsEnabled', !settings.hapticsEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                settings.hapticsEnabled ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.hapticsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Theme Day / Night */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-zinc-300">
              {settings.theme === 'day' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              Giao diện
            </span>
            <div className="flex bg-zinc-800 p-0.5 rounded-lg border border-zinc-700">
              <button
                id="btn-theme-day"
                onClick={() => handleToggle('theme', 'day' as ThemeMode)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  settings.theme === 'day' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Ngày
              </button>
              <button
                id="btn-theme-night"
                onClick={() => handleToggle('theme', 'night' as ThemeMode)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  settings.theme === 'night' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Đêm
              </button>
            </div>
          </div>

          {/* Bird Skin Selector */}
          <div>
            <span className="block text-zinc-300 mb-2 font-medium">Màu chim Flappy:</span>
            <div className="grid grid-cols-3 gap-2">
              {(['yellow', 'red', 'blue'] as BirdSkin[]).map((skin) => (
                <button
                  key={skin}
                  id={`btn-skin-${skin}`}
                  onClick={() => handleToggle('skin', skin)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition cursor-pointer ${
                    settings.skin === skin
                      ? 'border-amber-400 bg-amber-500/20 text-white font-bold'
                      : 'border-zinc-800 bg-zinc-800/60 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 border-black flex items-center justify-center ${
                      skin === 'yellow' ? 'bg-[#f8e038]' : skin === 'red' ? 'bg-[#f83838]' : 'bg-[#38b8f8]'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 bg-black rounded-full" />
                  </div>
                  <span className="text-[10px] capitalize">
                    {skin === 'yellow' ? 'Vàng' : skin === 'red' ? 'Đỏ' : 'Xanh'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <span className="block text-zinc-300 mb-2 font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Độ khó:
            </span>
            <div className="grid grid-cols-3 gap-1.5 bg-zinc-800 p-1 rounded-lg border border-zinc-700">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((diff) => (
                <button
                  key={diff}
                  id={`btn-diff-${diff}`}
                  onClick={() => handleToggle('difficulty', diff)}
                  className={`py-1 rounded text-[10px] font-medium transition capitalize ${
                    settings.difficulty === diff
                      ? 'bg-amber-500 text-black font-bold shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {diff === 'easy' ? 'Dễ' : diff === 'normal' ? 'Vừa' : 'Khó'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Done button */}
        <button
          id="btn-confirm-settings"
          onClick={() => {
            playClickSound(settings.soundEnabled);
            onClose();
          }}
          className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold font-arcade text-xs shadow-lg hover:brightness-110 active:scale-98 transition cursor-pointer"
        >
          XÁC NHẬN
        </button>
      </div>
    </div>
  );
};
