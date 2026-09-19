/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AndroidFrame } from './components/AndroidFrame';
import { FlappyGame } from './components/FlappyGame';
import { GameSettings } from './types';

const STORAGE_KEY = 'flappy_adr_settings';

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  skin: 'yellow',
  theme: 'day',
  difficulty: 'normal',
  deviceFrame: true,
};

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore
    }
    return DEFAULT_SETTINGS;
  });

  // Save settings when changed
  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  // Check if screen is small (mobile device)
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 640) {
        setSettings((prev) => ({ ...prev, deviceFrame: false }));
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <AndroidFrame
      isMockupEnabled={settings.deviceFrame}
      onToggleMockup={() =>
        handleUpdateSettings({ deviceFrame: !settings.deviceFrame })
      }
    >
      <FlappyGame settings={settings} onUpdateSettings={handleUpdateSettings} />
    </AndroidFrame>
  );
}
