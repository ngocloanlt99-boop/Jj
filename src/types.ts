export type GameState = 'idle' | 'playing' | 'gameover';

export type BirdSkin = 'yellow' | 'red' | 'blue';

export type ThemeMode = 'day' | 'night';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type MedalType = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Pipe {
  id: number;
  x: number;
  topHeight: number;
  bottomHeight: number;
  gap: number;
  width: number;
  passed: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

export interface BirdState {
  x: number;
  y: number;
  vy: number;
  radius: number;
  rotation: number;
  wingFrame: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  skin: BirdSkin;
  theme: ThemeMode;
  difficulty: Difficulty;
  deviceFrame: boolean; // toggle phone frame mockup on desktop
}
