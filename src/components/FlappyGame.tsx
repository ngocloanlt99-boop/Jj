import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Settings, Volume2, VolumeX, Pause, Play, Download } from 'lucide-react';
import { GameState, Pipe, Particle, BirdState, GameSettings, MedalType } from '../types';
import { playFlapSound, playPointSound, playHitSound, playDieSound, playClickSound } from '../utils/audio';
import { vibrateFlap, vibrateScore, vibrateHit, vibrateClick } from '../utils/haptics';
import { GameOverModal } from './GameOverModal';
import { SettingsModal } from './SettingsModal';
import { usePWAInstall } from './usePWAInstall';

const VIRTUAL_WIDTH = 360;
const VIRTUAL_HEIGHT = 640;
const GROUND_HEIGHT = 100;
const BIRD_RADIUS = 13;

interface FlappyGameProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const FlappyGame: React.FC<FlappyGameProps> = ({ settings, onUpdateSettings }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isInstallable, install } = usePWAInstall();

  // React state for HUD / Modals
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [medal, setMedal] = useState<MedalType>('none');

  // Mutable game state in refs for 60fps loop performance
  const stateRef = useRef<GameState>('idle');
  stateRef.current = gameState;

  const scoreRef = useRef(0);
  scoreRef.current = score;

  const highScoreRef = useRef(0);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  const birdRef = useRef<BirdState>({
    x: 90,
    y: 280,
    vy: 0,
    radius: BIRD_RADIUS,
    rotation: 0,
    wingFrame: 0,
  });

  const pipesRef = useRef<Pipe[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const groundOffsetRef = useRef(0);
  const cloudOffsetRef = useRef(0);
  const starsRef = useRef<{ x: number; y: number; size: number; alpha: number; speed: number }[]>([]);
  const flashAlphaRef = useRef(0);
  const pipeIdCounter = useRef(0);
  const lastSpawnTime = useRef(0);
  const idleHoverAngle = useRef(0);

  // Load high score on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('flappy_adr_highscore');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) {
          setHighScore(val);
          highScoreRef.current = val;
        }
      }
    } catch {
      // Ignore
    }

    // Initialize random background stars
    const stars = [];
    for (let i = 0; i < 35; i++) {
      stars.push({
        x: Math.random() * VIRTUAL_WIDTH,
        y: Math.random() * (VIRTUAL_HEIGHT - GROUND_HEIGHT - 60),
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.02 + 0.01,
      });
    }
    starsRef.current = stars;
  }, []);

  // Compute game parameters based on difficulty
  const getDifficultyConfig = useCallback(() => {
    switch (settings.difficulty) {
      case 'easy':
        return { gap: 145, speed: 1.8, gravity: 0.26, jump: -5.8, interval: 1700 };
      case 'hard':
        return { gap: 105, speed: 2.6, gravity: 0.32, jump: -6.5, interval: 1300 };
      case 'normal':
      default:
        return { gap: 125, speed: 2.2, gravity: 0.28, jump: -6.2, interval: 1500 };
    }
  }, [settings.difficulty]);

  // Compute medal
  const calculateMedal = (finalScore: number): MedalType => {
    if (finalScore >= 40) return 'platinum';
    if (finalScore >= 30) return 'gold';
    if (finalScore >= 20) return 'silver';
    if (finalScore >= 10) return 'bronze';
    return 'none';
  };

  // Spawn pipe
  const spawnPipe = useCallback(() => {
    const config = getDifficultyConfig();
    const minTop = 60;
    const maxTop = VIRTUAL_HEIGHT - GROUND_HEIGHT - config.gap - 60;
    const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;
    const bottomHeight = VIRTUAL_HEIGHT - GROUND_HEIGHT - topHeight - config.gap;

    pipesRef.current.push({
      id: pipeIdCounter.current++,
      x: VIRTUAL_WIDTH + 10,
      topHeight,
      bottomHeight,
      gap: config.gap,
      width: 54,
      passed: false,
    });
  }, [getDifficultyConfig]);

  // Spawn score particles
  const triggerScoreParticles = (x: number, y: number) => {
    const colors = ['#fde047', '#f59e0b', '#ffffff', '#38bdf8'];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5);
      const speed = Math.random() * 3 + 1.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 3 + 2,
        alpha: 1,
        decay: 0.035,
      });
    }
  };

  // Spawn death burst particles
  const triggerDeathParticles = (x: number, y: number) => {
    const skinColor =
      settings.skin === 'yellow' ? '#f8e038' : settings.skin === 'red' ? '#f83838' : '#38b8f8';
    const colors = [skinColor, '#ffffff', '#f85820', '#543847'];
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 2,
        alpha: 1,
        decay: 0.025,
      });
    }
  };

  // End Game
  const triggerGameOver = useCallback(() => {
    if (stateRef.current === 'gameover') return;

    stateRef.current = 'gameover';
    setGameState('gameover');

    flashAlphaRef.current = 0.8;
    triggerDeathParticles(birdRef.current.x, birdRef.current.y);

    playHitSound(settings.soundEnabled);
    vibrateHit(settings.hapticsEnabled);

    setTimeout(() => {
      playDieSound(settings.soundEnabled);
    }, 180);

    const curScore = scoreRef.current;
    const currentHigh = highScoreRef.current;
    if (curScore > currentHigh) {
      highScoreRef.current = curScore;
      setHighScore(curScore);
      setIsNewHigh(true);
      try {
        localStorage.setItem('flappy_adr_highscore', curScore.toString());
      } catch {
        // Ignore
      }
    } else {
      setIsNewHigh(false);
    }

    setMedal(calculateMedal(curScore));
  }, [settings.soundEnabled, settings.hapticsEnabled]);

  // Handle jump / flap action
  const jump = useCallback(() => {
    if (isPausedRef.current) return;

    if (stateRef.current === 'idle') {
      stateRef.current = 'playing';
      setGameState('playing');
      pipesRef.current = [];
      particlesRef.current = [];
      lastSpawnTime.current = performance.now();
      spawnPipe();
    }

    if (stateRef.current === 'playing') {
      const config = getDifficultyConfig();
      birdRef.current.vy = config.jump;
      birdRef.current.rotation = -0.45; // ~ -25 deg
      playFlapSound(settings.soundEnabled);
      vibrateFlap(settings.hapticsEnabled);
    }
  }, [getDifficultyConfig, settings.soundEnabled, settings.hapticsEnabled, spawnPipe]);

  // Restart game
  const handleRestart = useCallback(() => {
    stateRef.current = 'idle';
    setGameState('idle');
    setScore(0);
    scoreRef.current = 0;
    birdRef.current = {
      x: 90,
      y: 280,
      vy: 0,
      radius: BIRD_RADIUS,
      rotation: 0,
      wingFrame: 0,
    };
    pipesRef.current = [];
    particlesRef.current = [];
    flashAlphaRef.current = 0;
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (stateRef.current === 'gameover') {
          handleRestart();
        } else {
          jump();
        }
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (stateRef.current === 'playing') {
          setIsPaused((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump, handleRestart]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      animId = requestAnimationFrame(render);

      const deltaMs = Math.min(time - lastTime, 50);
      lastTime = time;

      if (!isPausedRef.current) {
        updatePhysics(deltaMs, time);
      }

      drawFrame(ctx, time);
    };

    // Physics Update
    const updatePhysics = (deltaMs: number, time: number) => {
      const config = getDifficultyConfig();
      const bird = birdRef.current;

      // Decay flash effect
      if (flashAlphaRef.current > 0) {
        flashAlphaRef.current = Math.max(0, flashAlphaRef.current - 0.05);
      }

      // Update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // particle gravity
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      // Stars twinkle
      starsRef.current.forEach((star) => {
        star.alpha += star.speed;
        if (star.alpha > 1 || star.alpha < 0.2) {
          star.speed = -star.speed;
        }
      });

      if (stateRef.current === 'idle') {
        // Smooth floating hover
        idleHoverAngle.current += 0.06;
        bird.y = 280 + Math.sin(idleHoverAngle.current) * 8;
        bird.rotation = 0;
        bird.wingFrame = Math.floor(time / 140) % 3;

        // Scroll ground & clouds
        groundOffsetRef.current = (groundOffsetRef.current + config.speed) % 24;
        cloudOffsetRef.current = (cloudOffsetRef.current + 0.4) % VIRTUAL_WIDTH;
        return;
      }

      if (stateRef.current === 'playing') {
        // Bird gravity
        bird.vy += config.gravity;
        bird.y += bird.vy;

        // Smooth rotation
        if (bird.vy < 0) {
          bird.rotation = Math.max(-0.45, bird.rotation - 0.08);
          bird.wingFrame = Math.floor(time / 90) % 3;
        } else {
          bird.rotation = Math.min(1.4, bird.rotation + 0.045);
          bird.wingFrame = 1; // glide frame
        }

        // Scroll ground
        groundOffsetRef.current = (groundOffsetRef.current + config.speed) % 24;
        cloudOffsetRef.current = (cloudOffsetRef.current + 0.4) % VIRTUAL_WIDTH;

        // Spawn pipes
        if (time - lastSpawnTime.current >= config.interval) {
          spawnPipe();
          lastSpawnTime.current = time;
        }

        // Update pipes & collisions
        const groundY = VIRTUAL_HEIGHT - GROUND_HEIGHT;

        // Ceiling collision
        if (bird.y - bird.radius <= 0) {
          bird.y = bird.radius;
          bird.vy = 0;
        }

        // Ground collision
        if (bird.y + bird.radius >= groundY) {
          bird.y = groundY - bird.radius;
          triggerGameOver();
          return;
        }

        for (let i = pipesRef.current.length - 1; i >= 0; i--) {
          const pipe = pipesRef.current[i];
          pipe.x -= config.speed;

          // Check score pass
          if (!pipe.passed && pipe.x + pipe.width < bird.x) {
            pipe.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            playPointSound(settings.soundEnabled);
            vibrateScore(settings.hapticsEnabled);
            triggerScoreParticles(pipe.x + pipe.width, pipe.topHeight + pipe.gap / 2);
          }

          // Pipe collision check (precise Hitbox with 3px grace margin)
          const birdBox = {
            left: bird.x - bird.radius + 3,
            right: bird.x + bird.radius - 3,
            top: bird.y - bird.radius + 3,
            bottom: bird.y + bird.radius - 3,
          };

          // Top pipe collision
          const hitTop =
            birdBox.right > pipe.x &&
            birdBox.left < pipe.x + pipe.width &&
            birdBox.top < pipe.topHeight;

          // Bottom pipe collision
          const hitBottom =
            birdBox.right > pipe.x &&
            birdBox.left < pipe.x + pipe.width &&
            birdBox.bottom > pipe.topHeight + pipe.gap;

          if (hitTop || hitBottom) {
            triggerGameOver();
            return;
          }

          // Remove offscreen pipes
          if (pipe.x + pipe.width < -20) {
            pipesRef.current.splice(i, 1);
          }
        }
      }

      if (stateRef.current === 'gameover') {
        const groundY = VIRTUAL_HEIGHT - GROUND_HEIGHT;
        if (bird.y + bird.radius < groundY) {
          bird.vy += 0.45;
          bird.y += bird.vy;
          bird.rotation = Math.min(1.5, bird.rotation + 0.1);
        } else {
          bird.y = groundY - bird.radius;
        }
      }
    };

    // Canvas Rendering
    const drawFrame = (c: CanvasRenderingContext2D, time: number) => {
      c.save();

      // Clear & Background
      const isNight = settings.theme === 'night';
      if (isNight) {
        // Night sky gradient
        const skyGrad = c.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
        skyGrad.addColorStop(0, '#0c1527');
        skyGrad.addColorStop(0.7, '#16294a');
        skyGrad.addColorStop(1, '#1e385c');
        c.fillStyle = skyGrad;
        c.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        // Twinkling stars
        starsRef.current.forEach((star) => {
          c.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
          c.fillRect(star.x, star.y, star.size, star.size);
        });

        // Glowing Moon
        c.fillStyle = '#fff6d1';
        c.beginPath();
        c.arc(280, 80, 24, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#edd996';
        c.beginPath();
        c.arc(274, 76, 5, 0, Math.PI * 2);
        c.arc(288, 86, 7, 0, Math.PI * 2);
        c.fill();
      } else {
        // Classic Day sky
        c.fillStyle = '#4ec0ca';
        c.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
      }

      // City Skyline (Distant background)
      const skylineColor = isNight ? '#0a1020' : '#70c5ce';
      c.fillStyle = skylineColor;
      const bY = VIRTUAL_HEIGHT - GROUND_HEIGHT - 70;
      // Building silhouettes
      const buildings = [
        { x: 0, w: 45, h: 60 },
        { x: 45, w: 35, h: 45 },
        { x: 80, w: 55, h: 75 },
        { x: 135, w: 40, h: 55 },
        { x: 175, w: 50, h: 70 },
        { x: 225, w: 40, h: 50 },
        { x: 265, w: 55, h: 80 },
        { x: 320, w: 45, h: 65 },
      ];
      buildings.forEach((b) => {
        c.fillRect(b.x, bY + (80 - b.h), b.w, b.h);
        if (isNight) {
          // Night glowing windows
          c.fillStyle = '#fef08a';
          for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += 10) {
            for (let wy = bY + (80 - b.h) + 8; wy < bY + 70; wy += 14) {
              if (Math.sin(wx * 10 + wy) > 0) {
                c.fillRect(wx, wy, 4, 6);
              }
            }
          }
          c.fillStyle = skylineColor;
        }
      });

      // Puffy Clouds (Day theme)
      if (!isNight) {
        c.fillStyle = 'rgba(255, 255, 255, 0.75)';
        const drawCloud = (cx: number, cy: number, scale: number) => {
          c.beginPath();
          c.arc(cx, cy, 18 * scale, 0, Math.PI * 2);
          c.arc(cx + 15 * scale, cy - 8 * scale, 22 * scale, 0, Math.PI * 2);
          c.arc(cx + 35 * scale, cy, 16 * scale, 0, Math.PI * 2);
          c.fill();
        };
        const cOffset = cloudOffsetRef.current;
        drawCloud((VIRTUAL_WIDTH - cOffset + 50) % (VIRTUAL_WIDTH + 100) - 50, 120, 1);
        drawCloud((VIRTUAL_WIDTH - cOffset * 0.7 + 220) % (VIRTUAL_WIDTH + 100) - 50, 160, 0.8);
      }

      // Draw Pipes
      pipesRef.current.forEach((pipe) => {
        drawPipe(c, pipe, isNight);
      });

      // Draw Particles
      particlesRef.current.forEach((p) => {
        c.fillStyle = p.color;
        c.globalAlpha = Math.max(0, p.alpha);
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fill();
      });
      c.globalAlpha = 1;

      // Draw Ground
      drawGround(c, isNight);

      // Draw Bird
      drawBird(c, birdRef.current, settings.skin);

      // Flash on hit
      if (flashAlphaRef.current > 0) {
        c.fillStyle = `rgba(255, 255, 255, ${flashAlphaRef.current})`;
        c.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
      }

      // In-game score display (Big bold arcade numbers)
      if (stateRef.current === 'playing') {
        drawArcadeScore(c, scoreRef.current);
      }

      // Idle State Overlay: "CHẠM ĐỂ BAY"
      if (stateRef.current === 'idle') {
        drawStartPrompt(c, time);
      }

      c.restore();
    };

    // Draw single Pipe with authentic 3D collar rim
    const drawPipe = (c: CanvasRenderingContext2D, pipe: Pipe, isNight: boolean) => {
      const rimHeight = 24;
      const rimOverhang = 3;
      const pipeW = pipe.width;

      const mainGreen = isNight ? '#227038' : '#73bf2e';
      const lightGreen = isNight ? '#3da85a' : '#9ce659';
      const darkGreen = isNight ? '#144523' : '#558022';
      const borderColor = '#543847';

      // --- Top Pipe ---
      const topY = 0;
      const topH = pipe.topHeight;

      // Pipe Body
      c.fillStyle = borderColor;
      c.fillRect(pipe.x, topY, pipeW, topH - rimHeight);

      c.fillStyle = mainGreen;
      c.fillRect(pipe.x + 3, topY, pipeW - 6, topH - rimHeight);

      // Light highlight stripe
      c.fillStyle = lightGreen;
      c.fillRect(pipe.x + 6, topY, 8, topH - rimHeight);

      // Dark shadow stripe
      c.fillStyle = darkGreen;
      c.fillRect(pipe.x + pipeW - 10, topY, 7, topH - rimHeight);

      // Top Pipe Rim Cap
      const rimY = topH - rimHeight;
      const rimX = pipe.x - rimOverhang;
      const rimW = pipeW + rimOverhang * 2;

      c.fillStyle = borderColor;
      c.fillRect(rimX, rimY, rimW, rimHeight);

      c.fillStyle = mainGreen;
      c.fillRect(rimX + 3, rimY + 3, rimW - 6, rimHeight - 6);

      c.fillStyle = lightGreen;
      c.fillRect(rimX + 6, rimY + 3, 8, rimHeight - 6);

      c.fillStyle = darkGreen;
      c.fillRect(rimX + rimW - 10, rimY + 3, 7, rimHeight - 6);

      // --- Bottom Pipe ---
      const botY = pipe.topHeight + pipe.gap;
      const botH = pipe.bottomHeight;

      // Bottom Pipe Rim Cap
      c.fillStyle = borderColor;
      c.fillRect(rimX, botY, rimW, rimHeight);

      c.fillStyle = mainGreen;
      c.fillRect(rimX + 3, botY + 3, rimW - 6, rimHeight - 6);

      c.fillStyle = lightGreen;
      c.fillRect(rimX + 6, botY + 3, 8, rimHeight - 6);

      c.fillStyle = darkGreen;
      c.fillRect(rimX + rimW - 10, botY + 3, 7, rimHeight - 6);

      // Bottom Pipe Body
      const botBodyY = botY + rimHeight;
      const botBodyH = botH - rimHeight;

      c.fillStyle = borderColor;
      c.fillRect(pipe.x, botBodyY, pipeW, botBodyH);

      c.fillStyle = mainGreen;
      c.fillRect(pipe.x + 3, botBodyY, pipeW - 6, botBodyH);

      c.fillStyle = lightGreen;
      c.fillRect(pipe.x + 6, botBodyY, 8, botBodyH);

      c.fillStyle = darkGreen;
      c.fillRect(pipe.x + pipeW - 10, botBodyY, 7, botBodyH);
    };

    // Draw Parallax Scrolling Ground
    const drawGround = (c: CanvasRenderingContext2D, isNight: boolean) => {
      const gY = VIRTUAL_HEIGHT - GROUND_HEIGHT;
      const gW = VIRTUAL_WIDTH;
      const offset = groundOffsetRef.current;

      const grassColor = isNight ? '#2d6a4f' : '#73bf2e';
      const grassShadow = isNight ? '#1b4332' : '#558022';
      const dirtColor = isNight ? '#3e3831' : '#ded895';
      const stripeColor = isNight ? '#312c26' : '#d2c974';
      const borderColor = '#543847';

      // Top grass border line
      c.fillStyle = borderColor;
      c.fillRect(0, gY, gW, 4);

      // Bright grass strip
      c.fillStyle = grassColor;
      c.fillRect(0, gY + 4, gW, 14);

      // Triangular grass teeth
      c.fillStyle = grassShadow;
      for (let x = -offset; x < gW + 24; x += 12) {
        c.beginPath();
        c.moveTo(x, gY + 18);
        c.lineTo(x + 6, gY + 24);
        c.lineTo(x + 12, gY + 18);
        c.fill();
      }

      // Middle border
      c.fillStyle = borderColor;
      c.fillRect(0, gY + 24, gW, 3);

      // Dirt body
      c.fillStyle = dirtColor;
      c.fillRect(0, gY + 27, gW, GROUND_HEIGHT - 27);

      // Angled dirt stripes
      c.fillStyle = stripeColor;
      for (let x = -offset * 2; x < gW + 40; x += 22) {
        c.beginPath();
        c.moveTo(x, gY + 27);
        c.lineTo(x + 12, gY + 27);
        c.lineTo(x - 6, gY + GROUND_HEIGHT);
        c.lineTo(x - 18, gY + GROUND_HEIGHT);
        c.fill();
      }
    };

    // Draw Bird Sprite
    const drawBird = (c: CanvasRenderingContext2D, bird: BirdState, skin: string) => {
      c.save();
      c.translate(bird.x, bird.y);
      c.rotate(bird.rotation);

      const scale = 1.35;
      c.scale(scale, scale);

      // Palette
      let bodyColor = '#f8e038';
      let highlight = '#fff980';
      let shadow = '#e8a810';

      if (skin === 'red') {
        bodyColor = '#f83838';
        highlight = '#ff7a7a';
        shadow = '#ba1818';
      } else if (skin === 'blue') {
        bodyColor = '#38b8f8';
        highlight = '#90e0ff';
        shadow = '#1080d0';
      }

      const border = '#543847';

      // 1. Outer Body Border
      c.fillStyle = border;
      c.beginPath();
      c.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
      c.fill();

      // 2. Body Fill
      c.fillStyle = bodyColor;
      c.beginPath();
      c.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2);
      c.fill();

      // Body Highlight (Top)
      c.fillStyle = highlight;
      c.beginPath();
      c.ellipse(0, -4, 9, 4, 0, 0, Math.PI * 2);
      c.fill();

      // Body Shadow (Bottom)
      c.fillStyle = shadow;
      c.beginPath();
      c.ellipse(0, 5, 9, 3, 0, 0, Math.PI * 2);
      c.fill();

      // 3. Belly (Cream / White)
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(-5, 3, 5, 0, Math.PI * 2);
      c.fill();

      // 4. Wing (Animated Flap)
      c.save();
      c.fillStyle = '#ffffff';
      c.strokeStyle = border;
      c.lineWidth = 1.8;

      let wingY = 0;
      let wingH = 6;
      if (bird.wingFrame === 0) {
        wingY = -5; // wing up
        wingH = 5;
      } else if (bird.wingFrame === 2) {
        wingY = 3; // wing down
        wingH = 5;
      }

      c.beginPath();
      c.ellipse(-4, wingY, 7, wingH, 0.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.restore();

      // 5. Eye (Large White + Black Pupil + Specular Reflection)
      c.fillStyle = '#ffffff';
      c.strokeStyle = border;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(5, -4, 5.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Pupil
      c.fillStyle = '#000000';
      c.beginPath();
      c.arc(7, -4, 2.5, 0, Math.PI * 2);
      c.fill();

      // Catchlight
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(7.8, -5, 1, 0, Math.PI * 2);
      c.fill();

      // 6. Beak (Upper & Lower Orange Lip)
      c.fillStyle = '#f85820';
      c.strokeStyle = border;
      c.lineWidth = 1.5;

      c.beginPath();
      c.moveTo(8, 0);
      c.lineTo(16, 2);
      c.lineTo(8, 6);
      c.closePath();
      c.fill();
      c.stroke();

      // Mouth divider
      c.fillStyle = border;
      c.fillRect(8, 3, 7, 1.5);

      c.restore();
    };

    // Draw In-Game Big Score
    const drawArcadeScore = (c: CanvasRenderingContext2D, curScore: number) => {
      const text = curScore.toString();
      c.font = '28px "Press Start 2P", monospace';
      c.textAlign = 'center';
      c.textBaseline = 'top';

      // Drop Shadow
      c.fillStyle = '#543847';
      c.fillText(text, VIRTUAL_WIDTH / 2 + 3, 53);

      // White Fill
      c.fillStyle = '#ffffff';
      c.fillText(text, VIRTUAL_WIDTH / 2, 50);

      // Outline
      c.strokeStyle = '#543847';
      c.lineWidth = 4;
      c.strokeText(text, VIRTUAL_WIDTH / 2, 50);
      c.fillText(text, VIRTUAL_WIDTH / 2, 50);
    };

    // Draw Start Prompt
    const drawStartPrompt = (c: CanvasRenderingContext2D, time: number) => {
      // Game Title
      c.textAlign = 'center';
      c.textBaseline = 'middle';

      c.font = '22px "Press Start 2P", monospace';
      c.fillStyle = '#543847';
      c.fillText('FLAPPY BIRD', VIRTUAL_WIDTH / 2 + 3, 143);
      c.fillStyle = '#f8e038';
      c.strokeStyle = '#543847';
      c.lineWidth = 3;
      c.strokeText('FLAPPY BIRD', VIRTUAL_WIDTH / 2, 140);
      c.fillText('FLAPPY BIRD', VIRTUAL_WIDTH / 2, 140);

      // Subtitle "ANDROID EDITION"
      c.font = '10px "Press Start 2P", monospace';
      c.fillStyle = '#34d399';
      c.strokeStyle = '#064e3b';
      c.lineWidth = 2;
      c.strokeText('PHIÊN BẢN ANDROID', VIRTUAL_WIDTH / 2, 168);
      c.fillText('PHIÊN BẢN ANDROID', VIRTUAL_WIDTH / 2, 168);

      // Tap instructions banner
      const pulse = Math.sin(time / 200) * 4;

      c.font = '12px "Press Start 2P", monospace';
      c.fillStyle = '#ffffff';
      c.strokeStyle = '#543847';
      c.lineWidth = 3;
      c.strokeText('CHẠM ĐỂ BAY', VIRTUAL_WIDTH / 2, 380 + pulse);
      c.fillText('CHẠM ĐỂ BAY', VIRTUAL_WIDTH / 2, 380 + pulse);

      // Animated Tap icon
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(VIRTUAL_WIDTH / 2, 420 + pulse, 14, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#543847';
      c.lineWidth = 2;
      c.stroke();

      // Hand icon / finger representation
      c.fillStyle = '#f59e0b';
      c.beginPath();
      c.arc(VIRTUAL_WIDTH / 2, 420 + pulse, 7, 0, Math.PI * 2);
      c.fill();
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [getDifficultyConfig, settings.theme, settings.skin, settings.soundEnabled, settings.hapticsEnabled]);

  // Pointer Down on canvas handles mobile touch & desktop clicks with zero latency
  const handlePointerDown = (e: React.PointerEvent) => {
    // If settings or game over modal are active, ignore canvas click
    if (isSettingsOpen) return;

    if (stateRef.current === 'gameover') {
      // Handled by modal button
      return;
    }

    jump();
  };

  const handleToggleSound = () => {
    const next = !settings.soundEnabled;
    playClickSound(next);
    vibrateClick(settings.hapticsEnabled);
    onUpdateSettings({ soundEnabled: next });
  };

  const handleTogglePause = () => {
    if (stateRef.current !== 'playing') return;
    playClickSound(settings.soundEnabled);
    vibrateClick(settings.hapticsEnabled);
    setIsPaused((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      id="flappy-game-container"
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden touch-none select-none bg-black"
    >
      {/* Top Quick Bar / HUD */}
      <div className="absolute top-2 left-0 right-0 z-30 flex items-center justify-between px-3 pointer-events-auto">
        {/* Left: Best Score pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs border border-white/10 text-white shadow-sm">
          <span className="font-arcade text-[8px] text-amber-400">BEST:</span>
          <span className="font-arcade text-[10px] text-white font-bold">{highScore}</span>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Pause Button (during play) */}
          {gameState === 'playing' && (
            <button
              id="btn-quick-pause"
              onClick={handleTogglePause}
              className="p-2 rounded-xl bg-black/60 backdrop-blur-xs border border-white/10 text-white hover:bg-black/80 active:scale-95 transition cursor-pointer"
              title="Tạm dừng"
            >
              {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-white" />}
            </button>
          )}

          {/* Sound Toggle */}
          <button
            id="btn-quick-sound"
            onClick={handleToggleSound}
            className="p-2 rounded-xl bg-black/60 backdrop-blur-xs border border-white/10 text-white hover:bg-black/80 active:scale-95 transition cursor-pointer"
            title="Bật/Tắt âm thanh"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {/* Settings button */}
          <button
            id="btn-open-settings"
            onClick={() => {
              playClickSound(settings.soundEnabled);
              vibrateClick(settings.hapticsEnabled);
              setIsSettingsOpen(true);
            }}
            className="p-2 rounded-xl bg-black/60 backdrop-blur-xs border border-white/10 text-white hover:bg-black/80 active:scale-95 transition cursor-pointer"
            title="Cài đặt game"
          >
            <Settings className="w-4 h-4 text-amber-400" />
          </button>

          {/* Android PWA Install shortcut */}
          {isInstallable && (
            <button
              id="btn-quick-install"
              onClick={() => {
                playClickSound(settings.soundEnabled);
                vibrateClick(settings.hapticsEnabled);
                install();
              }}
              className="p-2 rounded-xl bg-emerald-600/90 text-white hover:bg-emerald-500 active:scale-95 transition cursor-pointer flex items-center gap-1"
              title="Cài đặt lên Android"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas with crisp native 360x640 resolution */}
      <canvas
        ref={canvasRef}
        id="flappy-canvas"
        width={VIRTUAL_WIDTH}
        height={VIRTUAL_HEIGHT}
        onPointerDown={handlePointerDown}
        className="w-full h-full object-contain cursor-pointer transition-transform duration-75"
        style={{
          imageRendering: 'pixelated',
        }}
      />

      {/* Paused Overlay */}
      {isPaused && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs text-white select-none">
          <h2 className="font-arcade text-xl text-amber-400 tracking-wider mb-2">TẠM DỪNG</h2>
          <p className="text-xs text-zinc-300 mb-6">Game đang tạm dừng</p>
          <button
            id="btn-resume-game"
            onClick={handleTogglePause}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-arcade text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-black" /> TIẾP TỤC
          </button>
        </div>
      )}

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={gameState === 'gameover'}
        score={score}
        highScore={highScore}
        isNewHigh={isNewHigh}
        medal={medal}
        soundEnabled={settings.soundEnabled}
        hapticsEnabled={settings.hapticsEnabled}
        onRestart={handleRestart}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />
    </div>
  );
};
