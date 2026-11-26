import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { MobileControls } from './components/MobileControls';
import { GameOverModal, PauseModal, UpgradeModal } from './components/Modals';
import { TitleOverlay } from './components/TitleOverlay';
import { TouchCustomizerModal } from './components/TouchCustomizerModal';
import { SupermarketBrawlerEngine } from './game/engine';
import { loadTouchLayout, saveTouchLayout, TouchLayoutConfig } from './game/touchSettings';
import { HudSnapshot, TouchMode } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  round: 1,
  roundTitle: 'Checkout Brawl',
  zoneId: 'grocery',
  zoneName: '24/7 Grocery',
  isEmergencyLight: false,
  hp: 100,
  maxHp: 100,
  ghostHp: 100,
  dashCharges: 3,
  maxDashCharges: 3,
  coinCount: 4,
  maxCoins: 4,
  railCharge: 100,
  shotgunCooldownRatio: 0,
  parryCooldownRatio: 0,
  whiplashCooldownRatio: 0,
  frenzySeconds: 0,
  chiliSeconds: 0,
  heldItem: null,
  score: 0,
  bestScore: 0,
  comboCount: 0,
  styleRank: 'D',
  stylePoints: 0,
  styleFeed: [],
  opponentName: null,
  opponentTitle: null,
  opponentHp: 0,
  opponentMaxHp: 0,
  opponentGhostHp: 0,
  opponentEnraged: false,
  kosTotal: 0,
  parriesTotal: 0,
  damageTaken: 0,
  maxCombo: 0,
  elapsedSeconds: 0,
  upgradeChoices: [],
  announcement: null,
  muted: false,
  isFullscreen: false,
  leaderboard: [],
  isNewRecord: false,
};

function detectTouchViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return coarse || window.innerWidth <= 960 || (navigator.maxTouchPoints ?? 0) > 0;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SupermarketBrawlerEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [touchMode, setTouchMode] = useState<TouchMode>('auto');
  const [autoTouchDetected, setAutoTouchDetected] = useState<boolean>(detectTouchViewport);
  const [touchLayout, setTouchLayout] = useState<TouchLayoutConfig>(loadTouchLayout);
  const [customizingTouch, setCustomizingTouch] = useState(false);

  const handleTouchLayoutChange = useCallback((next: TouchLayoutConfig) => {
    setTouchLayout(next);
    saveTouchLayout(next);
  }, []);

  useEffect(() => {
    const updateTouchDetect = () => setAutoTouchDetected(detectTouchViewport());
    window.addEventListener('resize', updateTouchDetect);
    const onFirstTouch = () => setAutoTouchDetected(true);
    window.addEventListener('touchstart', onFirstTouch, { passive: true, once: true });

    return () => {
      window.removeEventListener('resize', updateTouchDetect);
      window.removeEventListener('touchstart', onFirstTouch);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new SupermarketBrawlerEngine(canvas, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;
    engine.start();

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const startRoundParam = Number(params.get('round') ?? '1');
      engine.startNewGame(Number.isFinite(startRoundParam) && startRoundParam >= 1 ? startRoundParam : 1);
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const cycleTouchMode = useCallback(() => {
    setTouchMode((prev) => (prev === 'auto' ? 'on' : prev === 'on' ? 'off' : 'auto'));
  }, []);

  const showTouchControls =
    !customizingTouch &&
    hud.phase === 'playing' &&
    (touchMode === 'on' || (touchMode === 'auto' && autoTouchDetected));

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#0b0e14]">
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        aria-label="Supermarket battleground arena"
        className="w-full h-full block pixelated"
      />

      {hud.phase === 'title' && !customizingTouch && (
        <TitleOverlay
          bestScore={hud.bestScore}
          leaderboard={hud.leaderboard}
          muted={hud.muted}
          touchMode={touchMode}
          isFullscreen={hud.isFullscreen}
          onStart={() => engineRef.current?.startNewGame()}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onCycleTouchMode={cycleTouchMode}
          onToggleFullscreen={() => engineRef.current?.toggleFullscreen()}
          onOpenTouchCustomizer={() => setCustomizingTouch(true)}
        />
      )}

      {(hud.phase === 'playing' || hud.phase === 'paused' || hud.phase === 'upgrade') && (
        <GameHud
          hud={hud}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onTogglePause={() => engineRef.current?.togglePause()}
          onToggleFullscreen={() => engineRef.current?.toggleFullscreen()}
          onRestart={() => engineRef.current?.startNewGame()}
        />
      )}

      {showTouchControls && (
        <MobileControls
          coinCount={hud.coinCount}
          dashCharges={hud.dashCharges}
          railCharge={hud.railCharge}
          shotgunCooldownRatio={hud.shotgunCooldownRatio}
          parryCooldownRatio={hud.parryCooldownRatio}
          whiplashCooldownRatio={hud.whiplashCooldownRatio}
          layout={touchLayout}
          onMove={(x, y) => engineRef.current?.setTouchMove(x, y)}
          onAttack={() => engineRef.current?.triggerAttack()}
          onDash={() => engineRef.current?.triggerDash()}
          onParry={() => engineRef.current?.triggerParry()}
          onShotgun={() => engineRef.current?.triggerShotgun()}
          onCoin={() => engineRef.current?.triggerCoin()}
          onRailcannon={() => engineRef.current?.triggerRailcannon()}
          onWhiplash={() => engineRef.current?.triggerWhiplash()}
        />
      )}

      {hud.phase === 'paused' && !customizingTouch && (
        <PauseModal
          touchMode={touchMode}
          isFullscreen={hud.isFullscreen}
          onResume={() => engineRef.current?.togglePause()}
          onRestart={() => engineRef.current?.startNewGame()}
          onCycleTouchMode={cycleTouchMode}
          onOpenTouchCustomizer={() => setCustomizingTouch(true)}
          onToggleFullscreen={() => engineRef.current?.toggleFullscreen()}
          onTitle={() => engineRef.current?.returnToTitle()}
        />
      )}

      {customizingTouch && (
        <TouchCustomizerModal
          layout={touchLayout}
          onChange={handleTouchLayoutChange}
          onClose={() => setCustomizingTouch(false)}
        />
      )}

      {hud.phase === 'upgrade' && (
        <UpgradeModal
          round={hud.round}
          choices={hud.upgradeChoices}
          onSelect={(id) => engineRef.current?.chooseUpgrade(id)}
        />
      )}

      {hud.phase === 'gameover' && (
        <GameOverModal
          hud={hud}
          onRetry={() => engineRef.current?.startNewGame()}
          onTitle={() => engineRef.current?.returnToTitle()}
        />
      )}
    </main>
  );
}
