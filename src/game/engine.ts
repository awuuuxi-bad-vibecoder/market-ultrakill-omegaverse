import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ARENA_ZONES,
  ENEMY_PALETTES,
  PICKUP_SPAWN_POINTS,
  PLAYER_SPAWN,
  SPAWN_POINTS,
  WALL_THICKNESS,
} from './constants';
import { soundEngine } from './audio';
import { LightingSystem } from './lighting';
import {
  applyUpgradeToPlayer,
  circleIntersect,
  clamp,
  computeCoinRicochetChain,
  computePlayerHit,
  computeStyleRank,
  createDestructibleShelves,
  damageShelf,
  generateRoundEncounter,
  getZoneForRound,
  isInStrikeCone,
  lerp,
  pickUpgradeChoices,
  pointToSegmentDist,
  predictLeadAngle,
  resolveCircleRect,
  tickShelfRespawn,
} from './rules';
import { buildArenaBackground, buildShelfSpriteMap, createSpriteAtlas, SpriteAtlas } from './sprites';
import {
  Afterimage,
  ArenaZoneConfig,
  CoinEntity,
  DestructibleShelf,
  EnemyMoveKind,
  EnemyState,
  FloatingText,
  GamePhase,
  HudSnapshot,
  LaserBeam,
  Particle,
  PickupEntity,
  PickupKind,
  PlayerState,
  Projectile,
  RoundPlan,
  ShockwaveRing,
  ShoppingCart,
  StyleRank,
  UpgradeOption,
} from './types';

const BEST_SCORE_KEY = 'kassovy_raznos_best_score_v3';

export class SupermarketBrawlerEngine {
  private displayCanvas: HTMLCanvasElement;
  private displayCtx: CanvasRenderingContext2D;
  private worldCanvas: HTMLCanvasElement;
  private worldCtx: CanvasRenderingContext2D;
  private decalCanvas: HTMLCanvasElement;
  private decalCtx: CanvasRenderingContext2D;
  private lowHpVignetteCanvas: HTMLCanvasElement;

  private atlas: SpriteAtlas;
  private lighting: LightingSystem;
  private currentZone: ArenaZoneConfig = ARENA_ZONES[0];

  private rafId = 0;
  private lastFrameMs = 0;
  private elapsedRealSec = 0;
  private runTimeSec = 0;

  private phase: GamePhase = 'title';
  private hitstopTimer = 0;
  private slowMoTimer = 0;
  private timeScale = 1;
  private trauma = 0;
  private screenFlashAlpha = 0;
  private screenFlashColor = '#ffffff';

  private round = 1;
  private currentPlan: RoundPlan;
  private pendingTransitionTimer = 0;
  private pendingNextPhase: GamePhase | null = null;
  private announcementTimer = 0;
  private announcementText: string | null = null;

  private score = 0;
  private bestScore = 0;
  private comboCount = 0;
  private maxCombo = 0;
  private comboTimeout = 0;
  private stylePoints = 0;
  private styleRank: StyleRank = 'D';
  private styleFeed: string[] = [];
  private styleFeedTimer = 0;

  private kosTotal = 0;
  private parriesTotal = 0;
  private damageTaken = 0;
  private upgradeChoices: UpgradeOption[] = [];

  private shelves: DestructibleShelf[] = [];
  private player!: PlayerState;
  private enemies: EnemyState[] = [];
  private carts: ShoppingCart[] = [];
  private pickups: PickupEntity[] = [];
  private pickupSpawnTimer = 4.0;
  private entitySeq = 0;

  private particles: Particle[] = [];
  private particleCursor = 0;
  private projectiles: Projectile[] = [];
  private coins: CoinEntity[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private lasers: LaserBeam[] = [];
  private afterimages: Afterimage[] = [];
  private afterimageCursor = 0;
  private floatingTexts: FloatingText[] = [];
  private textCursor = 0;

  private camX = ARENA_WIDTH / 2;
  private camY = ARENA_HEIGHT / 2;
  private camZoom = 1.6;
  private viewportW = 1280;
  private viewportH = 720;
  private dpr = 1;

  private keys = new Set<string>();
  private touchMoveX = 0;
  private touchMoveY = 0;
  private mouseClientX = 0;
  private mouseClientY = 0;
  private mouseMovedRecently = false;
  private mouseAimTimer = 0;

  private attackQueued = false;
  private dashQueued = false;
  private parryQueued = false;
  private shotgunQueued = false;
  private coinQueued = false;
  private railQueued = false;

  private onHudSync: (snapshot: HudSnapshot) => void;
  private hudSyncAccum = 0;
  private lastSyncedHp = -1;
  private lastSyncedPhase: GamePhase | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    onHudSync: (snapshot: HudSnapshot) => void
  ) {
    this.displayCanvas = canvas;
    this.displayCtx = canvas.getContext('2d', { alpha: false })!;
    this.onHudSync = onHudSync;

    this.worldCanvas = document.createElement('canvas');
    this.worldCanvas.width = ARENA_WIDTH;
    this.worldCanvas.height = ARENA_HEIGHT;
    this.worldCtx = this.worldCanvas.getContext('2d', { alpha: false })!;
    this.worldCtx.imageSmoothingEnabled = false;

    this.decalCanvas = document.createElement('canvas');
    this.decalCanvas.width = ARENA_WIDTH;
    this.decalCanvas.height = ARENA_HEIGHT;
    this.decalCtx = this.decalCanvas.getContext('2d')!;
    this.decalCtx.imageSmoothingEnabled = false;

    this.currentZone = ARENA_ZONES[0];
    this.shelves = createDestructibleShelves(this.currentZone.shelves);
    this.atlas = createSpriteAtlas(this.shelves, this.currentZone);
    this.lighting = new LightingSystem();
    this.lighting.setZone(this.currentZone);

    // Pre-bake low-HP red vignette once for zero per-frame gradient allocations!
    this.lowHpVignetteCanvas = document.createElement('canvas');
    this.lowHpVignetteCanvas.width = 128;
    this.lowHpVignetteCanvas.height = 128;
    const vctx = this.lowHpVignetteCanvas.getContext('2d')!;
    const vgrad = vctx.createRadialGradient(64, 64, 30, 64, 64, 88);
    vgrad.addColorStop(0, 'rgba(220, 38, 38, 0)');
    vgrad.addColorStop(1, 'rgba(220, 38, 38, 0.85)');
    vctx.fillStyle = vgrad;
    vctx.fillRect(0, 0, 128, 128);

    try {
      const saved = localStorage.getItem(BEST_SCORE_KEY);
      if (saved) this.bestScore = parseInt(saved, 10) || 0;
    } catch {
      // Ignore storage errors
    }

    this.allocatePools();
    this.currentPlan = generateRoundEncounter(1, 17);
    this.resetRunState(false);
    this.setupDemoTitleActors();
    this.bindEvents();
    this.handleResize();
    this.syncHud(true);
  }

  private allocatePools(): void {
    this.particles = Array.from({ length: 220 }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      size: 2,
      color: '#ffffff',
      alpha: 1,
      ttl: 0,
      maxTtl: 1,
      gravity: 170,
      drag: 0.93,
      additive: false,
    }));

    this.projectiles = Array.from({ length: 64 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 5,
      damage: 12,
      fromPlayer: false,
      parried: false,
      boosted: false,
      kind: 'can',
      spin: 0,
      ttl: 0,
      age: 0,
    }));

    this.coins = Array.from({ length: 8 }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      ttl: 0,
      spin: 0,
    }));

    this.shockwaves = Array.from({ length: 12 }, () => ({
      active: false,
      x: 0,
      y: 0,
      radius: 0,
      maxRadius: 90,
      speed: 230,
      damage: 15,
      fromPlayer: false,
      color: '#ef4444',
      hitTarget: false,
    }));

    this.lasers = Array.from({ length: 14 }, () => ({
      active: false,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      color: '#fde047',
      width: 3,
      ttl: 0,
      maxTtl: 0.22,
    }));

    this.afterimages = Array.from({ length: 18 }, () => ({
      active: false,
      x: 0,
      y: 0,
      angle: 0,
      color: '#38bdf8',
      alpha: 0.5,
      ttl: 0,
      maxTtl: 0.2,
      isPlayer: true,
    }));

    this.floatingTexts = Array.from({ length: 36 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vy: -28,
      text: '',
      color: '#ffffff',
      scale: 1,
      ttl: 0,
      maxTtl: 0.7,
    }));
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);

    this.displayCanvas.addEventListener('pointerdown', this.handleCanvasPointerDown);
    this.displayCanvas.addEventListener('pointermove', this.handleCanvasPointerMove);
    this.displayCanvas.addEventListener('contextmenu', this.handleContextMenu);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.displayCanvas);
    } else {
      window.addEventListener('resize', this.handleResize);
    }
  }

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);

    this.displayCanvas.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    this.displayCanvas.removeEventListener('pointermove', this.handleCanvasPointerMove);
    this.displayCanvas.removeEventListener('contextmenu', this.handleContextMenu);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    } else {
      window.removeEventListener('resize', this.handleResize);
    }
  }

  private handleFullscreenChange = (): void => {
    this.handleResize();
    this.syncHud(true);
  };

  public async toggleFullscreen(): Promise<void> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
        const ori = screen.orientation as unknown as { lock?: (mode: string) => Promise<void> };
        await ori?.lock?.('landscape').catch(() => {});
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // Fullscreen or orientation lock might be restricted by iframe/OS; fail silently
    }
    this.syncHud(true);
  }

  private handleResize = (): void => {
    const rect = this.displayCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.viewportW = rect.width;
    this.viewportH = rect.height;
    // Cap DPR at 1.5 for crisp pixel-art and blazing 60fps performance on budget phones
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.displayCanvas.width = Math.round(rect.width * this.dpr);
    this.displayCanvas.height = Math.round(rect.height * this.dpr);

    const minDim = Math.min(rect.width, rect.height);
    if (rect.width < 680) {
      // Portrait phone
      this.camZoom = clamp(rect.width / 255, 1.38, 2.05);
    } else if (rect.height < 520) {
      // Horizontal/Landscape phone!
      this.camZoom = clamp(rect.height / 285, 1.15, 1.85);
    } else {
      // Desktop / Tablet
      this.camZoom = clamp(minDim / 430, 1.25, 2.25);
    }
  };

  private handleBlur = (): void => {
    this.clearHeldInputs();
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.clearHeldInputs();
    }
  };

  public clearHeldInputs(): void {
    this.keys.clear();
    this.touchMoveX = 0;
    this.touchMoveY = 0;
  }

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private handleCanvasPointerMove = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') {
      this.mouseClientX = e.clientX;
      this.mouseClientY = e.clientY;
      this.mouseMovedRecently = true;
      this.mouseAimTimer = 2.0;
    }
  };

  private handleCanvasPointerDown = (e: PointerEvent): void => {
    soundEngine.unlock();
    if (this.phase !== 'playing') return;
    if (e.pointerType !== 'mouse') return;

    this.mouseClientX = e.clientX;
    this.mouseClientY = e.clientY;
    this.mouseMovedRecently = true;
    this.mouseAimTimer = 2.0;

    if (e.button === 0) {
      this.attackQueued = true;
    } else if (e.button === 2) {
      this.parryQueued = true;
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (
      code === 'Space' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      e.preventDefault();
    }
    if (e.repeat) return;

    if (this.phase === 'title') {
      if (code === 'Enter' || code === 'Space') {
        this.startNewGame();
      }
      return;
    }

    if (this.phase === 'upgrade') {
      if (code === 'Digit1' && this.upgradeChoices[0]) this.chooseUpgrade(this.upgradeChoices[0].id);
      else if (code === 'Digit2' && this.upgradeChoices[1]) this.chooseUpgrade(this.upgradeChoices[1].id);
      else if (code === 'Digit3' && this.upgradeChoices[2]) this.chooseUpgrade(this.upgradeChoices[2].id);
      return;
    }

    if (this.phase === 'gameover') {
      if (code === 'Enter' || code === 'Space') {
        this.startNewGame();
      }
      return;
    }

    if (code === 'Escape' || code === 'KeyP') {
      this.togglePause();
      return;
    }
    if (code === 'KeyM') {
      this.toggleMute();
      return;
    }
    if (code === 'KeyR' && (this.phase === 'playing' || this.phase === 'paused')) {
      this.startNewGame();
      return;
    }
    if (this.phase !== 'playing') return;

    this.keys.add(code);
    soundEngine.unlock();

    if (code === 'KeyJ') {
      this.attackQueued = true;
    } else if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') {
      this.dashQueued = true;
    } else if (code === 'KeyF') {
      this.parryQueued = true;
    } else if (code === 'KeyE' || code === 'KeyK') {
      this.shotgunQueued = true;
    } else if (code === 'KeyQ') {
      this.coinQueued = true;
    } else if (code === 'KeyC') {
      this.railQueued = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  // --- Public Mobile / UI Controls ---

  public setTouchMove(x: number, y: number): void {
    this.touchMoveX = clamp(x, -1, 1);
    this.touchMoveY = clamp(y, -1, 1);
  }

  public triggerAttack(): void {
    soundEngine.unlock();
    if (this.phase === 'playing') this.attackQueued = true;
  }

  public triggerDash(): void {
    soundEngine.unlock();
    if (this.phase === 'playing') this.dashQueued = true;
  }

  public triggerParry(): void {
    soundEngine.unlock();
    if (this.phase === 'playing') this.parryQueued = true;
  }

  public triggerShotgun(): void {
    soundEngine.unlock();
    if (this.phase === 'playing') this.shotgunQueued = true;
  }

  public triggerCoin(): void {
    soundEngine.unlock();
    if (this.phase === 'playing') this.coinQueued = true;
  }

  public triggerRailcannon(): void {
    soundEngine.unlock();
    if (this.phase === 'playing') this.railQueued = true;
  }

  public start(): void {
    this.lastFrameMs = performance.now();
    const loop = (now: number) => {
      const rawDt = Math.max(0, (now - this.lastFrameMs) / 1000);
      this.lastFrameMs = now;
      const dt = Math.min(rawDt, 0.05);
      this.tick(dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public startNewGame(initialRound = 1): void {
    soundEngine.unlock();
    this.resetRunState(true);
    this.setPhase('playing');
    this.startRound(Math.max(1, Math.floor(initialRound)));
  }

  public returnToTitle(): void {
    this.clearHeldInputs();
    this.resetRunState(false);
    this.setupDemoTitleActors();
    this.setPhase('title');
  }

  public togglePause(): void {
    if (this.phase === 'playing') {
      this.clearHeldInputs();
      this.setPhase('paused');
    } else if (this.phase === 'paused') {
      this.clearHeldInputs();
      this.setPhase('playing');
    }
  }

  public toggleMute(): void {
    soundEngine.setMuted(!soundEngine.isMuted());
    this.syncHud(true);
  }

  public chooseUpgrade(upgradeId: string): void {
    if (this.phase !== 'upgrade') return;
    applyUpgradeToPlayer(this.player, upgradeId);
    soundEngine.playPickup();
    this.spawnBurst(this.player.x, this.player.y, '#4ade80', 18, true);
    this.lighting.spawnFlash(this.player.x, this.player.y, '#4ade80', 120, 0.9, 0.25);
    this.setPhase('playing');
    this.startRound(this.round + 1);
  }

  private setPhase(next: GamePhase): void {
    this.phase = next;
    if (typeof document !== 'undefined') {
      document.body.dataset.state = next === 'upgrade' ? 'playing' : next;
      document.body.dataset.phase = next;
    }
    this.syncHud(true);
  }

  private resetRunState(clearDecals: boolean): void {
    this.round = 1;
    this.score = 0;
    this.comboCount = 0;
    this.maxCombo = 0;
    this.comboTimeout = 0;
    this.stylePoints = 0;
    this.styleRank = 'D';
    this.styleFeed = [];
    this.styleFeedTimer = 0;
    this.kosTotal = 0;
    this.parriesTotal = 0;
    this.damageTaken = 0;
    this.runTimeSec = 0;
    this.hitstopTimer = 0;
    this.slowMoTimer = 0;
    this.timeScale = 1;
    this.trauma = 0;
    this.screenFlashAlpha = 0;
    this.pendingTransitionTimer = 0;
    this.pendingNextPhase = null;
    this.announcementTimer = 0;
    this.announcementText = null;
    this.upgradeChoices = [];
    this.clearHeldInputs();
    this.attackQueued = false;
    this.dashQueued = false;
    this.parryQueued = false;
    this.shotgunQueued = false;
    this.coinQueued = false;
    this.railQueued = false;

    this.applyZoneForRound(1, true);
    this.shelves = createDestructibleShelves(this.currentZone.shelves);

    this.player = {
      x: PLAYER_SPAWN.x,
      y: PLAYER_SPAWN.y,
      vx: 0,
      vy: 0,
      radius: 11,
      facingAngle: -Math.PI / 2,
      hp: 100,
      maxHp: 100,
      ghostHp: 100,
      stamina: 300,
      maxStamina: 300,
      speed: 220,
      damageMultiplier: 1.0,
      critChance: 0.16,
      vampMultiplier: 1.0,
      shotgunPellets: 6,
      maxCoins: 4,
      coins: 4,
      coinRegenTimer: 0,
      shotgunCooldown: 0,
      railCharge: 100,
      parryTimer: 0,
      parryCooldown: 0,
      parryHitDone: false,
      comboStep: 0,
      comboResetTimer: 0,
      attackTimer: 0,
      attackPhase: 'idle',
      attackBufferTimer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      dashBufferTimer: 0,
      dashDirX: 0,
      dashDirY: -1,
      invulnTimer: 0,
      hitFlashTimer: 0,
      squashX: 1,
      squashY: 1,
      walkDist: 0,
      heldItem: null,
      hitEnemyIdsThisSwing: new Set<string>(),
    };

    this.enemies = [];
    this.pickups = [];
    for (const p of this.projectiles) p.active = false;
    for (const c of this.coins) c.active = false;
    for (const sw of this.shockwaves) sw.active = false;
    for (const lb of this.lasers) lb.active = false;
    for (const af of this.afterimages) af.active = false;
    for (const pt of this.particles) pt.active = false;
    for (const ft of this.floatingTexts) ft.active = false;

    this.carts = [
      { id: 'cart-1', x: 325, y: 195, vx: 0, vy: 0, angle: 0.2, radius: 11, hitFlash: 0 },
      { id: 'cart-2', x: 444, y: 318, vx: 0, vy: 0, angle: -2.4, radius: 11, hitFlash: 0 },
    ];

    if (clearDecals) {
      this.decalCtx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    }

    this.camX = this.player.x;
    this.camY = this.player.y;
  }

  private setupDemoTitleActors(): void {
    this.currentPlan = generateRoundEncounter(1, 22);
    this.enemies = [
      this.makeEnemyFromSpec(
        { archetype: 'flanker', name: 'Дуэлянт', isBoss: false, hp: 320, speed: 105, damage: 10, radius: 11, paletteIndex: 2 },
        520,
        245
      ),
    ];
    this.spawnPickupAt('watermelon', 340, 200);
    this.spawnPickupAt('energy_drink', 428, 308);
  }

  private applyZoneForRound(roundNum: number, silent = false): boolean {
    const nextZone = getZoneForRound(roundNum);
    const changed = nextZone.id !== this.currentZone.id;
    if (!changed && !silent) return false;
    this.currentZone = nextZone;
    this.atlas.arenaBg = buildArenaBackground(nextZone);
    this.atlas.shelfSprites = buildShelfSpriteMap(nextZone.shelves);
    this.lighting.setZone(nextZone);
    if (changed) {
      this.decalCtx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
      this.spawnBurst(this.player.x, this.player.y, '#38bdf8', 22, true);
    }
    return changed;
  }

  private startRound(roundNum: number): void {
    this.round = roundNum;
    const zoneChanged = this.applyZoneForRound(roundNum, false);
    const seed = roundNum * 997 + Math.floor(Math.random() * 500);
    this.currentPlan = generateRoundEncounter(roundNum, seed);
    this.enemies = [];
    this.pendingNextPhase = null;
    this.pendingTransitionTimer = 0;
    this.timeScale = 1;
    for (const pr of this.projectiles) pr.active = false;
    for (const c of this.coins) c.active = false;
    for (const sw of this.shockwaves) sw.active = false;
    for (const lb of this.lasers) lb.active = false;
    for (const af of this.afterimages) af.active = false;

    // Restore current zone's shelves cleanly on round start
    this.shelves = createDestructibleShelves(this.currentZone.shelves);
    this.resolveActorCollisions(this.player);

    this.player.coins = this.player.maxCoins;
    this.player.stamina = this.player.maxStamina;
    this.player.railCharge = 100;

    if (!zoneChanged) {
      this.decalCtx.save();
      this.decalCtx.globalCompositeOperation = 'destination-out';
      this.decalCtx.fillStyle = 'rgba(0,0,0,0.35)';
      this.decalCtx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
      this.decalCtx.restore();
    }

    const sortedSpawns = [...SPAWN_POINTS].sort((a, b) => {
      const da = Math.hypot(a.x - this.player.x, a.y - this.player.y);
      const db = Math.hypot(b.x - this.player.x, b.y - this.player.y);
      return db - da;
    });

    const spec = this.currentPlan.enemies[0];
    const sp = sortedSpawns[0];
    const enemy = this.makeEnemyFromSpec(spec, sp.x, sp.y);
    this.resolveActorCollisions(enemy);
    this.enemies.push(enemy);
    this.spawnBurst(enemy.x, enemy.y, '#facc15', 18, true);

    this.pickups = [];
    this.spawnRandomPickup();
    this.pickupSpawnTimer = 5.5;

    this.announcementText = zoneChanged
      ? `НОВАЯ ЛОКАЦИЯ: ${this.currentZone.name.toUpperCase()}! · ${spec.name.toUpperCase()}`
      : `РАУНД ${roundNum} · 1 НА 1 · ${spec.name.toUpperCase()}`;
    this.announcementTimer = zoneChanged ? 2.6 : 2.0;
    soundEngine.playRoundBell();
    this.syncHud(true);
  }

  private makeEnemyFromSpec(
    spec: RoundPlan['enemies'][number],
    x: number,
    y: number
  ): EnemyState {
    return {
      id: `enemy-${++this.entitySeq}`,
      name: spec.name,
      archetype: spec.archetype,
      isBoss: spec.isBoss,
      enraged: false,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: spec.radius,
      facingAngle: Math.atan2(this.player.y - y, this.player.x - x),
      hp: spec.hp,
      maxHp: spec.hp,
      ghostHp: spec.hp,
      speed: spec.speed,
      damage: spec.damage,
      aiState: 'seek',
      currentMove: 'flurry',
      moveComboLeft: 0,
      parryableWindow: false,
      stateTimer: 0,
      attackCooldown: this.round === 1 ? 1.15 : 0.72,
      dashCooldown: 1.5,
      hasToken: true,
      chargeDirX: 1,
      chargeDirY: 0,
      strafeSign: Math.random() < 0.5 ? -1 : 1,
      hitFlashTimer: 0,
      squashX: 1,
      squashY: 1,
      walkDist: 0,
      paletteIndex: spec.paletteIndex,
      koTimer: 0,
      didDealDamageThisSwing: false,
    };
  }

  private addStyle(points: number, tag?: string): void {
    this.stylePoints = clamp(this.stylePoints + points, 0, 1200);
    this.styleRank = computeStyleRank(this.stylePoints);
    if (tag) {
      this.styleFeed.unshift(tag);
      if (this.styleFeed.length > 4) this.styleFeed.pop();
      this.styleFeedTimer = 3.2;
    }
  }

  private tick(dt: number): void {
    this.elapsedRealSec += dt;
    this.lighting.update(dt);
    this.trauma = Math.max(0, this.trauma - dt * 2.4);
    this.screenFlashAlpha = Math.max(0, this.screenFlashAlpha - dt * 4.0);

    if (this.phase === 'title') {
      this.tickTitlePreview(dt);
      return;
    }

    if (this.phase === 'paused' || this.phase === 'upgrade' || this.phase === 'gameover') {
      return;
    }

    if (this.announcementTimer > 0) {
      this.announcementTimer -= dt;
      if (this.announcementTimer <= 0) {
        this.announcementText = null;
        this.syncHud(true);
      }
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.player.hitFlashTimer = Math.max(0, this.player.hitFlashTimer - dt);
      for (const e of this.enemies) e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);
      this.updateLasers(dt);
      this.updateAfterimages(dt);
      this.updateCamera(dt);
      return;
    }

    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      this.timeScale = 0.35;
    } else {
      this.timeScale = 1.0;
    }

    const simDt = dt * this.timeScale;
    this.runTimeSec += simDt;

    if (this.pendingNextPhase) {
      this.pendingTransitionTimer -= dt;
      this.updateParticles(simDt);
      this.updateLasers(dt);
      this.updateAfterimages(dt);
      this.updateFloatingTexts(dt);
      this.updateEnemiesKOOnly(simDt);
      this.updateCamera(dt);
      if (this.pendingTransitionTimer <= 0) {
        const target = this.pendingNextPhase;
        this.pendingNextPhase = null;
        if (target === 'upgrade') {
          this.upgradeChoices = pickUpgradeChoices(this.round * 97 + this.score);
          this.setPhase('upgrade');
        } else if (target === 'gameover') {
          this.saveBestScore();
          soundEngine.playGameOver();
          this.setPhase('gameover');
        }
      }
      return;
    }

    this.stylePoints = Math.max(0, this.stylePoints - dt * 22);
    this.styleRank = computeStyleRank(this.stylePoints);
    if (this.styleFeedTimer > 0) {
      this.styleFeedTimer -= dt;
      if (this.styleFeedTimer <= 0) this.styleFeed = [];
    }

    this.updateShelves(simDt);
    this.updatePlayer(simDt);
    this.updateCoins(simDt);
    this.updateEnemies(simDt);
    this.updateShockwaves(simDt);
    this.updateCarts(simDt);
    this.updatePickups(simDt);
    this.updateProjectiles(simDt);
    this.updateParticles(simDt);
    this.updateLasers(dt);
    this.updateAfterimages(dt);
    this.updateFloatingTexts(dt);
    this.updateCamera(dt);

    if (this.enemies.length === 0 && !this.pendingNextPhase) {
      this.score += 250 * this.round + Math.round(this.stylePoints * 0.5);
      this.saveBestScore();
      this.pendingNextPhase = 'upgrade';
      this.pendingTransitionTimer = 0.6;
      this.slowMoTimer = 0.45;
      this.syncHud(true);
    }

    this.hudSyncAccum += dt;
    if (
      this.hudSyncAccum >= 0.085 ||
      Math.round(this.player.hp) !== this.lastSyncedHp ||
      this.phase !== this.lastSyncedPhase
    ) {
      this.hudSyncAccum = 0;
      this.syncHud(true);
    }
  }

  private tickTitlePreview(dt: number): void {
    this.camX = ARENA_WIDTH / 2 + Math.sin(this.elapsedRealSec * 0.35) * 90;
    this.camY = ARENA_HEIGHT / 2 + Math.cos(this.elapsedRealSec * 0.28) * 55;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const targetX = ARENA_WIDTH / 2 + Math.cos(this.elapsedRealSec * 0.6 + i * 3.1) * 180;
      const targetY = ARENA_HEIGHT / 2 + Math.sin(this.elapsedRealSec * 0.75 + i * 2.2) * 120;
      const dx = targetX - e.x;
      const dy = targetY - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.vx = (dx / d) * 70;
      e.vy = (dy / d) * 70;
      e.facingAngle = Math.atan2(e.vy, e.vx);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.walkDist += Math.hypot(e.vx * dt, e.vy * dt);
      this.resolveActorCollisions(e);
    }
  }

  private updateShelves(dt: number): void {
    for (const s of this.shelves) {
      const respawned = tickShelfRespawn(s, dt);
      if (respawned) {
        soundEngine.playRestock();
        const cx = s.x + s.w / 2;
        const cy = s.y + s.h / 2;
        this.spawnBurst(cx, cy, '#38bdf8', 14, true);
        this.lighting.spawnFlash(cx, cy, '#38bdf8', 95, 0.7, 0.2);
        // Push actors out if standing inside newly restocked shelf
        this.resolveActorCollisions(this.player);
        for (const e of this.enemies) this.resolveActorCollisions(e);
        for (const c of this.carts) this.resolveActorCollisions(c);
      }
    }
  }

  private applyShelfDamage(shelf: DestructibleShelf, dmg: number, hitX: number, hitY: number): void {
    if (shelf.destroyed) return;
    const broke = damageShelf(shelf, dmg);
    const debrisColors: Record<string, string> = {
      produce: '#22c55e',
      snacks: '#facc15',
      drinks: '#38bdf8',
      bakery: '#f59e0b',
      fridge: '#bae6fd',
      checkout: '#ef4444',
      crate: '#d97706',
    };
    const col = debrisColors[shelf.style] ?? '#facc15';
    this.spawnBurst(hitX, hitY, col, broke ? 26 : 8, broke);

    if (broke) {
      const cx = shelf.x + shelf.w / 2;
      const cy = shelf.y + shelf.h / 2;
      soundEngine.playShelfSmash();
      this.trauma = Math.min(1, this.trauma + 0.34);
      this.lighting.spawnFlash(cx, cy, col, 130, 0.95, 0.22);
      this.stampFloorDecal(cx, cy, col, 10);
      this.stampFloorDecal(cx + 12, cy - 6, '#94a3b8', 7);
      this.addStyle(75, '+РАЗГРОМ ПОЛКИ');
      this.spawnFloatingText(cx, cy - 10, 'ВДРЕБЕЗГИ!', col, 1.0);

      // 35% chance to spill a bonus snack/bomb from smashed shelf!
      if (Math.random() < 0.35 && this.pickups.length < 4) {
        const dropPool: PickupKind[] = ['croissant', 'energy_drink', 'watermelon', 'soda_bomb'];
        this.spawnPickupAt(dropPool[Math.floor(Math.random() * dropPool.length)], cx, cy);
      }
    }
  }

  private damageShelvesInRadius(x: number, y: number, radius: number, dmg: number): void {
    for (const s of this.shelves) {
      if (s.destroyed) continue;
      if (resolveCircleRect(x, y, radius, s).collided) {
        this.applyShelfDamage(s, dmg, x, y);
      }
    }
  }

  private updatePlayer(dt: number): void {
    const p = this.player;

    p.hitFlashTimer = Math.max(0, p.hitFlashTimer - dt);
    p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.shotgunCooldown = Math.max(0, p.shotgunCooldown - dt);
    p.parryCooldown = Math.max(0, p.parryCooldown - dt);
    p.ghostHp = lerp(p.ghostHp, p.hp, Math.min(1, dt * 4.5));
    p.squashX = lerp(p.squashX, 1, Math.min(1, dt * 16));
    p.squashY = lerp(p.squashY, 1, Math.min(1, dt * 16));

    const styleBonus = this.styleRank === 'ULTRA' || this.styleRank === 'SSS' ? 1.4 : 1.0;
    p.stamina = Math.min(p.maxStamina, p.stamina + dt * 76 * styleBonus);
    p.railCharge = Math.min(100, p.railCharge + dt * (p.maxCoins > 4 ? 17 : 12.5) * styleBonus);

    if (p.coins < p.maxCoins) {
      p.coinRegenTimer += dt;
      const regenTime = p.maxCoins > 4 ? 1.45 : 2.0;
      if (p.coinRegenTimer >= regenTime) {
        p.coinRegenTimer = 0;
        p.coins += 1;
      }
    } else {
      p.coinRegenTimer = 0;
    }

    if (this.comboTimeout > 0) {
      this.comboTimeout -= dt;
      if (this.comboTimeout <= 0) this.comboCount = 0;
    }
    if (p.comboResetTimer > 0) {
      p.comboResetTimer -= dt;
      if (p.comboResetTimer <= 0) p.comboStep = 0;
    }
    if (this.mouseAimTimer > 0) {
      this.mouseAimTimer -= dt;
      if (this.mouseAimTimer <= 0) this.mouseMovedRecently = false;
    }

    if (this.attackQueued) {
      p.attackBufferTimer = 0.14;
      this.attackQueued = false;
    } else {
      p.attackBufferTimer = Math.max(0, p.attackBufferTimer - dt);
    }

    if (this.dashQueued) {
      p.dashBufferTimer = 0.14;
      this.dashQueued = false;
    } else {
      p.dashBufferTimer = Math.max(0, p.dashBufferTimer - dt);
    }

    let ix = this.touchMoveX;
    let iy = this.touchMoveY;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) ix -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) ix += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) iy -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) iy += 1;
    const mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
    }

    if (this.mouseMovedRecently) {
      const worldAim = this.screenToWorld(this.mouseClientX, this.mouseClientY);
      p.facingAngle = Math.atan2(worldAim.y - p.y, worldAim.x - p.x);
    } else if (mag > 0.15 && p.attackPhase === 'idle' && p.dashTimer <= 0) {
      p.facingAngle = Math.atan2(iy, ix);
    }

    // Dash (3+ charges, dash-cancels everything!)
    if (p.dashBufferTimer > 0 && p.dashTimer <= 0 && p.dashCooldown <= 0 && p.stamina >= 100) {
      p.dashBufferTimer = 0;
      p.stamina -= 100;
      p.dashTimer = 0.16;
      p.dashCooldown = 0.1;
      p.invulnTimer = 0.25;
      p.attackPhase = 'idle';
      if (mag > 0.15) {
        p.dashDirX = ix;
        p.dashDirY = iy;
      } else {
        p.dashDirX = Math.cos(p.facingAngle);
        p.dashDirY = Math.sin(p.facingAngle);
      }
      p.squashX = 1.35;
      p.squashY = 0.7;
      soundEngine.playDash();
      this.spawnBurst(p.x, p.y, '#38bdf8', 12, true);
    }

    // Dash-Slam: Attacking mid-dash triggers an explosive shockwave slam!
    if (p.attackBufferTimer > 0 && p.dashTimer > 0) {
      p.attackBufferTimer = 0;
      p.dashTimer = 0;
      this.executeDashSlam();
    }

    if (this.coinQueued) {
      this.coinQueued = false;
      this.tossCoin(ix, iy);
    }

    if (this.shotgunQueued) {
      this.shotgunQueued = false;
      this.fireShotgun(ix, iy);
    }

    if (this.railQueued) {
      this.railQueued = false;
      this.fireRailcannon(ix, iy);
    }

    if (this.parryQueued) {
      this.parryQueued = false;
      if (p.parryCooldown <= 0 && p.parryTimer <= 0) {
        p.parryTimer = 0.24;
        p.parryCooldown = 0.34;
        p.parryHitDone = false;
        p.squashX = 1.26;
        p.squashY = 0.78;
        this.aimAssistIfNeeded(ix, iy, 175);
        soundEngine.playSwing(2);
      }
    }

    if (p.parryTimer > 0) {
      p.parryTimer -= dt;
      if (!p.parryHitDone) {
        this.checkParryConnections();
      }
    }

    if (p.attackBufferTimer > 0 && p.attackPhase === 'idle' && p.dashTimer <= 0) {
      p.attackBufferTimer = 0;
      this.startPlayerAttack(ix, iy);
    }

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      const dashSpeed = p.speed * 2.9;
      p.vx = p.dashDirX * dashSpeed;
      p.vy = p.dashDirY * dashSpeed;
      this.spawnAfterimage(p.x, p.y, p.facingAngle, '#38bdf8', true);
    } else if (p.attackPhase !== 'idle') {
      p.attackTimer -= dt;
      if (p.attackPhase === 'windup') {
        p.vx = lerp(p.vx, ix * p.speed * 0.55, dt * 20);
        p.vy = lerp(p.vy, iy * p.speed * 0.55, dt * 20);
        if (p.attackTimer <= 0) {
          p.attackPhase = 'active';
          p.attackTimer = 0.085;
          p.hitEnemyIdsThisSwing.clear();
          const lunge = p.comboStep >= 3 ? 235 : 130;
          p.vx += Math.cos(p.facingAngle) * lunge;
          p.vy += Math.sin(p.facingAngle) * lunge;
          p.squashX = 1.3;
          p.squashY = 0.74;
          soundEngine.playSwing(p.comboStep);
        }
      } else if (p.attackPhase === 'active') {
        this.checkPlayerMeleeHits();
        p.vx *= Math.pow(0.05, dt);
        p.vy *= Math.pow(0.05, dt);
        if (p.attackTimer <= 0) {
          p.attackPhase = 'recovery';
          p.attackTimer = p.comboStep >= 3 ? 0.11 : 0.05;
        }
      } else if (p.attackPhase === 'recovery') {
        p.vx = lerp(p.vx, ix * p.speed * 0.72, dt * 16);
        p.vy = lerp(p.vy, iy * p.speed * 0.72, dt * 16);
        if (p.attackTimer <= 0) {
          p.attackPhase = 'idle';
          p.comboStep = (p.comboStep + 1) % 4;
          p.comboResetTimer = 0.75;
        }
      }
    } else {
      p.vx = lerp(p.vx, ix * p.speed, Math.min(1, dt * 25));
      p.vy = lerp(p.vy, iy * p.speed, Math.min(1, dt * 25));
    }

    const prevX = p.x;
    const prevY = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const collidedShelf = this.resolveActorCollisions(p);
    if (collidedShelf && p.dashTimer > 0) {
      // Dashing straight into a crate/rack smashes it!
      this.damageShelvesInRadius(p.x, p.y, p.radius + 8, 25);
    }
    p.walkDist += Math.hypot(p.x - prevX, p.y - prevY);
  }

  private executeDashSlam(): void {
    const p = this.player;
    p.squashX = 1.45;
    p.squashY = 0.65;
    this.trauma = Math.min(1, this.trauma + 0.42);
    this.lighting.spawnFlash(p.x, p.y, '#38bdf8', 155, 1.0, 0.22);
    this.spawnBurst(p.x, p.y, '#38bdf8', 24, true);
    this.spawnShockwave(p.x, p.y, 92, 0, '#38bdf8', true);
    soundEngine.playHit(true, true);

    this.damageShelvesInRadius(p.x, p.y, 76, 40);

    for (const e of this.enemies) {
      if (e.aiState === 'ko') continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) <= 80 + e.radius) {
        const ang = Math.atan2(e.y - p.y, e.x - p.x);
        this.damageEnemy(e, Math.round(32 * p.damageMultiplier), ang, 280, true, true, false);
        this.addStyle(110, '+СЛЭМ С РАЗБЕГА');
      }
    }
  }

  private aimAssistIfNeeded(ix: number, iy: number, range: number): void {
    const p = this.player;
    if (this.mouseMovedRecently) return;
    const opp = this.enemies[0];
    if (opp && opp.aiState !== 'ko' && Math.hypot(opp.x - p.x, opp.y - p.y) <= range) {
      p.facingAngle = Math.atan2(opp.y - p.y, opp.x - p.x);
    } else if (Math.hypot(ix, iy) > 0.15) {
      p.facingAngle = Math.atan2(iy, ix);
    }
  }

  private tossCoin(ix: number, iy: number): void {
    const p = this.player;
    if (p.coins <= 0) {
      this.spawnFloatingText(p.x, p.y - 16, 'НЕТ МОНЕТ', '#94a3b8', 0.85);
      return;
    }
    this.aimAssistIfNeeded(ix, iy, 320);
    p.coins -= 1;
    for (const c of this.coins) {
      if (!c.active) {
        c.active = true;
        c.x = p.x + Math.cos(p.facingAngle) * 14;
        c.y = p.y + Math.sin(p.facingAngle) * 14;
        c.z = 8;
        const speed = 155;
        c.vx = Math.cos(p.facingAngle) * speed + p.vx * 0.35;
        c.vy = Math.sin(p.facingAngle) * speed + p.vy * 0.35;
        c.vz = 160;
        c.ttl = 1.95;
        c.spin = 0;
        soundEngine.playCoinToss();
        this.spawnBurst(c.x, c.y, '#fde047', 6, true);
        this.syncHud(true);
        return;
      }
    }
  }

  private fireShotgun(ix: number, iy: number): void {
    const p = this.player;
    if (p.shotgunCooldown > 0) return;

    if (!this.mouseMovedRecently) {
      let aimedCoin = false;
      for (const c of this.coins) {
        if (c.active && Math.hypot(c.x - p.x, c.y - p.y) <= 250) {
          p.facingAngle = Math.atan2(c.y - p.y, c.x - p.x);
          aimedCoin = true;
          break;
        }
      }
      if (!aimedCoin) this.aimAssistIfNeeded(ix, iy, 360);
    }

    p.shotgunCooldown = 0.44;
    p.vx -= Math.cos(p.facingAngle) * 125;
    p.vy -= Math.sin(p.facingAngle) * 125;
    p.squashX = 0.78;
    p.squashY = 1.26;

    const count = p.shotgunPellets;
    const spread = 0.4;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1)) - 0.5;
      const ang = p.facingAngle + t * spread + (Math.random() - 0.5) * 0.05;
      const spd = 400 + Math.random() * 45;
      this.spawnProjectile(
        p.x + Math.cos(ang) * 12,
        p.y + Math.sin(ang) * 12,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        Math.round(9 * p.damageMultiplier),
        true,
        'pellet'
      );
    }

    soundEngine.playShotgun();
    this.trauma = Math.min(1, this.trauma + 0.22);
    this.lighting.spawnFlash(
      p.x + Math.cos(p.facingAngle) * 18,
      p.y + Math.sin(p.facingAngle) * 18,
      '#fb923c',
      135,
      1.0,
      0.13
    );
    this.spawnBurst(p.x + Math.cos(p.facingAngle) * 14, p.y + Math.sin(p.facingAngle) * 14, '#fde047', 12, true);
    this.tryEnemyReactiveDodge();
  }

  private fireRailcannon(ix: number, iy: number): void {
    const p = this.player;
    if (p.railCharge < 100) {
      this.spawnFloatingText(p.x, p.y - 18, `ЛУЧ ${Math.round(p.railCharge)}%`, '#38bdf8', 0.85);
      return;
    }

    if (!this.mouseMovedRecently) {
      let aimedCoin = false;
      for (const c of this.coins) {
        if (c.active && Math.hypot(c.x - p.x, c.y - p.y) <= 320) {
          p.facingAngle = Math.atan2(c.y - p.y, c.x - p.x);
          aimedCoin = true;
          break;
        }
      }
      if (!aimedCoin) this.aimAssistIfNeeded(ix, iy, 500);
    }

    p.railCharge = 0;
    p.vx -= Math.cos(p.facingAngle) * 190;
    p.vy -= Math.sin(p.facingAngle) * 190;
    p.squashX = 0.72;
    p.squashY = 1.32;

    const endX = p.x + Math.cos(p.facingAngle) * 760;
    const endY = p.y + Math.sin(p.facingAngle) * 760;
    this.spawnLaser(p.x, p.y, endX, endY, '#22d3ee', 8);
    this.spawnLaser(p.x, p.y, endX, endY, '#ffffff', 3);

    soundEngine.playRailcannon();
    this.hitstopTimer = 0.08;
    this.trauma = Math.min(1, this.trauma + 0.55);
    this.screenFlash('#22d3ee', 0.25);
    this.lighting.spawnFlash(p.x + Math.cos(p.facingAngle) * 90, p.y + Math.sin(p.facingAngle) * 90, '#22d3ee', 210, 1.0, 0.28);

    // Obliterate any shelves in the beam path!
    for (const s of this.shelves) {
      if (s.destroyed) continue;
      const sx = s.x + s.w / 2;
      const sy = s.y + s.h / 2;
      if (pointToSegmentDist(sx, sy, p.x, p.y, endX, endY) <= Math.max(s.w, s.h) * 0.55) {
        this.applyShelfDamage(s, 60, sx, sy);
      }
    }

    // Hit airborne coins for ULTRA-RAIL-RICOCHET!
    let hitCoin = false;
    for (let ci = 0; ci < this.coins.length; ci++) {
      const c = this.coins[ci];
      if (!c.active) continue;
      if (pointToSegmentDist(c.x, c.y, p.x, p.y, endX, endY) <= 28) {
        this.triggerCoinRicochet(ci, false, true);
        hitCoin = true;
        break;
      }
    }

    // Piercing direct hit on opponent!
    for (const e of this.enemies) {
      if (e.aiState === 'ko') continue;
      if (pointToSegmentDist(e.x, e.y, p.x, p.y, endX, endY) <= e.radius + 14) {
        const dmg = Math.round((hitCoin ? 55 : 68) * p.damageMultiplier);
        this.damageEnemy(e, dmg, p.facingAngle, 320, true, true, false);
        this.addStyle(hitCoin ? 220 : 145, hitCoin ? '+УЛЬТРА-РЕЛЬСОШЕТ' : '+СКАНЕР-РЕЛЬСА');
      }
    }
    this.tryEnemyReactiveDodge();
    this.syncHud(true);
  }

  private checkParryConnections(): void {
    const p = this.player;
    const reach = 46;
    const halfArc = Math.PI * 0.72;

    // 1. Parry own fresh shotgun pellets -> PROJECTILE BOOST!
    for (const pr of this.projectiles) {
      if (!pr.active || !pr.fromPlayer || pr.kind !== 'pellet' || pr.age > 0.24) continue;
      if (Math.hypot(pr.x - p.x, pr.y - p.y) <= 48) {
        p.parryHitDone = true;
        pr.kind = 'boost_pellet';
        pr.boosted = true;
        pr.damage = Math.round(52 * p.damageMultiplier);
        pr.radius = 9;
        pr.vx = Math.cos(p.facingAngle) * 540;
        pr.vy = Math.sin(p.facingAngle) * 540;
        this.hitstopTimer = 0.065;
        this.trauma = Math.min(1, this.trauma + 0.42);
        this.screenFlash('#fb923c', 0.22);
        soundEngine.playParry();
        this.addStyle(150, '+БУСТ СНАРЯДА');
        this.spawnFloatingText(p.x, p.y - 20, 'БУСТ!', '#fb923c', 1.25);
        return;
      }
    }

    // 2. Parry enemy projectiles -> REFLECT!
    for (const pr of this.projectiles) {
      if (!pr.active || pr.fromPlayer) continue;
      if (Math.hypot(pr.x - p.x, pr.y - p.y) <= 46) {
        p.parryHitDone = true;
        pr.fromPlayer = true;
        pr.parried = true;
        pr.damage = Math.round(46 * p.damageMultiplier);
        const opp = this.enemies[0];
        const aimAng = opp ? Math.atan2(opp.y - pr.y, opp.x - pr.x) : p.facingAngle;
        pr.vx = Math.cos(aimAng) * 460;
        pr.vy = Math.sin(aimAng) * 460;
        this.triggerParrySuccessReward('+ВОЗВРАТ СДАЧИ');
        return;
      }
    }

    // 3. Parry airborne coin -> FISTFUL OF RUBLES!
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (!c.active) continue;
      if (Math.hypot(c.x - p.x, c.y - p.y) <= 46) {
        p.parryHitDone = true;
        this.triggerCoinRicochet(i, true);
        return;
      }
    }

    // 4. Parry Enemy Windup / Rush!
    for (const e of this.enemies) {
      if (e.aiState === 'ko') continue;
      if (
        (e.parryableWindow || e.aiState === 'windup' || (e.aiState === 'attack' && e.currentMove === 'charge')) &&
        isInStrikeCone(p.x, p.y, p.facingAngle, e.x, e.y, e.radius, reach, halfArc)
      ) {
        p.parryHitDone = true;
        e.aiState = 'stunned';
        e.parryableWindow = false;
        e.stateTimer = 0.85;
        const dmg = Math.round(48 * p.damageMultiplier);
        const ang = Math.atan2(e.y - p.y, e.x - p.x);
        this.damageEnemy(e, dmg, ang, 310, true, true, false);
        this.triggerParrySuccessReward('+ПАРИРОВАНИЕ');
        return;
      }
    }
  }

  private triggerParrySuccessReward(styleTag: string): void {
    const p = this.player;
    this.parriesTotal += 1;
    p.hp = Math.min(p.maxHp, p.hp + 28);
    p.ghostHp = Math.max(p.ghostHp, p.hp);
    p.stamina = p.maxStamina;
    p.railCharge = Math.min(100, p.railCharge + 35);
    this.hitstopTimer = 0.11;
    this.trauma = Math.min(1, this.trauma + 0.56);
    this.screenFlash('#fde047', 0.36);
    this.lighting.spawnFlash(p.x, p.y, '#fde047', 195, 1.0, 0.26);
    soundEngine.playParry();
    this.addStyle(185, styleTag);
    this.spawnBurst(p.x, p.y, '#fde047', 26, true);
    this.spawnFloatingText(p.x, p.y - 24, 'ПАРИР!', '#fde047', 1.38);
  }

  private startPlayerAttack(ix: number, iy: number): void {
    const p = this.player;
    this.aimAssistIfNeeded(ix, iy, 135);
    p.attackPhase = 'windup';
    p.attackTimer = p.comboStep >= 3 ? 0.05 : 0.025;
    p.squashX = 0.84;
    p.squashY = 1.18;
  }

  private checkPlayerMeleeHits(): void {
    const p = this.player;
    const reach = p.comboStep >= 3 ? 46 : 38;
    const halfArc = p.comboStep >= 3 ? Math.PI * 0.74 : Math.PI * 0.54;
    const baseDmg = p.comboStep >= 3 ? 25 : 16;

    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (!c.active) continue;
      if (Math.hypot(c.x - p.x, c.y - p.y) <= reach + 10) {
        this.triggerCoinRicochet(i, true);
        break;
      }
    }

    for (const e of this.enemies) {
      if (e.aiState === 'ko' || p.hitEnemyIdsThisSwing.has(e.id)) continue;
      if (isInStrikeCone(p.x, p.y, p.facingAngle, e.x, e.y, e.radius, reach, halfArc)) {
        p.hitEnemyIdsThisSwing.add(e.id);
        const result = computePlayerHit({
          baseDamage: baseDmg,
          damageMultiplier: p.damageMultiplier,
          comboStep: p.comboStep,
          critChance: p.critChance,
          roll: Math.random(),
        });
        const angle = Math.atan2(e.y - p.y, e.x - p.x);
        this.damageEnemy(e, result.damage, angle, result.knockback, result.isCrit, p.comboStep >= 3, true);
      }
    }

    // Smash nearby shelves in front of melee swing!
    const strikeX = p.x + Math.cos(p.facingAngle) * (reach * 0.65);
    const strikeY = p.y + Math.sin(p.facingAngle) * (reach * 0.65);
    this.damageShelvesInRadius(strikeX, strikeY, 20, p.comboStep >= 3 ? 30 : 15);

    for (const c of this.carts) {
      if (isInStrikeCone(p.x, p.y, p.facingAngle, c.x, c.y, c.radius, reach + 4, halfArc)) {
        const angle = Math.atan2(c.y - p.y, c.x - p.x);
        c.vx = Math.cos(angle) * 410;
        c.vy = Math.sin(angle) * 410;
        c.hitFlash = 0.12;
        soundEngine.playHit(false, false);
        this.spawnBurst(c.x, c.y, '#e2e8f0', 10, false);
      }
    }
  }

  private triggerCoinRicochet(coinIdx: number, punched: boolean, railBoosted = false): void {
    const opp = this.enemies[0];
    if (!opp || opp.aiState === 'ko') {
      this.coins[coinIdx].active = false;
      return;
    }

    const res = computeCoinRicochetChain(coinIdx, this.coins, opp);
    for (const idx of res.coinIndices) {
      this.coins[idx].active = false;
    }

    for (let i = 0; i < res.chainPoints.length - 1; i++) {
      const a = res.chainPoints[i];
      const b = res.chainPoints[i + 1];
      this.spawnLaser(
        a.x,
        a.y,
        b.x,
        b.y,
        railBoosted ? '#22d3ee' : punched ? '#38bdf8' : '#fde047',
        railBoosted ? 7 : res.coinIndices.length > 1 ? 5.5 : 3.5
      );
    }

    const finalDmg = Math.round(res.damage * this.player.damageMultiplier * (railBoosted ? 1.55 : 1));
    const angle = Math.atan2(opp.y - res.chainPoints[0].y, opp.x - res.chainPoints[0].x);
    this.damageEnemy(opp, finalDmg, angle, 240, true, true, false);
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.07);
    this.trauma = Math.min(1, this.trauma + 0.4);
    soundEngine.playRicochet();

    const tag = railBoosted
      ? '+УЛЬТРА-РЕЛЬСОШЕТ'
      : res.coinIndices.length > 1
        ? `+РИКОШЕТ x${res.coinIndices.length}`
        : punched
          ? '+КУЛАК СДАЧИ'
          : '+РИКОШЕТ МОНЕТОЙ';
    this.addStyle(130 + (res.coinIndices.length - 1) * 90, tag);
  }

  private damageEnemy(
    e: EnemyState,
    damage: number,
    hitAngle: number,
    knockback: number,
    isCrit: boolean,
    isHeavy: boolean,
    allowStyleGain = true
  ): void {
    e.hp = Math.max(0, e.hp - damage);
    e.hitFlashTimer = 0.065;
    e.vx += Math.cos(hitAngle) * knockback;
    e.vy += Math.sin(hitAngle) * knockback;
    e.squashX = 1.32;
    e.squashY = 0.7;

    if (!e.enraged && e.hp > 0 && e.hp <= e.maxHp * 0.5) {
      e.enraged = true;
      e.speed = Math.round(e.speed * 1.18);
      this.spawnFloatingText(e.x, e.y - 26, 'ЯРОСТЬ!', '#f43f5e', 1.3);
      this.spawnBurst(e.x, e.y, '#f43f5e', 24, true);
      this.spawnShockwave(e.x, e.y, 110, 0, '#f43f5e', true);
      this.screenFlash('#f43f5e', 0.16);
    }

    const distToPlayer = Math.hypot(e.x - this.player.x, e.y - this.player.y);
    if (distToPlayer <= 92) {
      const heal = Math.round((isHeavy ? 6 : 3) * this.player.vampMultiplier);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      this.player.ghostHp = Math.max(this.player.ghostHp, this.player.hp);
    }
    this.player.railCharge = Math.min(100, this.player.railCharge + (isHeavy ? 14 : 7));

    this.comboCount += 1;
    this.maxCombo = Math.max(this.maxCombo, this.comboCount);
    this.comboTimeout = 2.6;
    this.score += damage + this.comboCount * 8;

    if (allowStyleGain) {
      this.addStyle(isCrit ? 52 : isHeavy ? 42 : 26, isHeavy ? '+РАЗНОС' : undefined);
    }

    if (isCrit || isHeavy || e.hp <= 0) {
      this.hitstopTimer = Math.max(this.hitstopTimer, e.hp <= 0 ? 0.095 : 0.045);
      this.trauma = Math.min(1, this.trauma + (e.hp <= 0 ? 0.58 : 0.28));
    } else {
      this.trauma = Math.min(1, this.trauma + 0.15);
    }

    soundEngine.playHit(isHeavy, isCrit);
    this.lighting.spawnFlash(
      e.x,
      e.y,
      isCrit ? '#facc15' : '#fb923c',
      isCrit ? 135 : 90,
      0.95,
      0.16
    );

    this.spawnFloatingText(
      e.x + (Math.random() - 0.5) * 10,
      e.y - e.radius - 6,
      isCrit ? `${damage}!` : `${damage}`,
      isCrit ? '#facc15' : '#f8fafc',
      isCrit ? 1.3 : 1.0
    );

    const pal = ENEMY_PALETTES[e.paletteIndex % ENEMY_PALETTES.length];
    this.spawnBurst(e.x, e.y, isCrit ? '#facc15' : '#f43f5e', isCrit ? 18 : 10, true);
    this.stampFloorDecal(e.x, e.y, pal.jacket, 4);

    if (e.hp <= 0) {
      e.aiState = 'ko';
      e.koTimer = 0.45;
      e.parryableWindow = false;
      this.kosTotal += 1;
      this.score += (e.isBoss ? 500 : 250) + this.round * 50;
      soundEngine.playCashRegisterKO();
      this.screenFlash('#fde047', 0.3);
      this.addStyle(280, '+НОКАУТ');
      this.spawnBurst(e.x, e.y, '#fbbf24', 34, true);
      this.spawnShockwave(e.x, e.y, 130, 0, '#fde047', true);
      this.spawnFloatingText(e.x, e.y - 24, 'НОКАУТ!', '#4ade80', 1.35);
    }
  }

  private damagePlayer(amount: number, hitAngle: number): void {
    const p = this.player;
    if (p.invulnTimer > 0 || p.hp <= 0 || this.pendingNextPhase) return;

    if (p.parryTimer > 0) {
      this.triggerParrySuccessReward('+БЛОК-ПАРИР');
      return;
    }

    p.hp = Math.max(0, p.hp - amount);
    this.damageTaken += amount;
    p.invulnTimer = 0.55;
    p.hitFlashTimer = 0.08;
    p.vx += Math.cos(hitAngle) * 235;
    p.vy += Math.sin(hitAngle) * 235;
    p.squashX = 1.3;
    p.squashY = 0.72;
    this.comboCount = 0;
    this.stylePoints = Math.max(0, this.stylePoints - 130);
    this.styleRank = computeStyleRank(this.stylePoints);

    this.hitstopTimer = 0.06;
    this.trauma = Math.min(1, this.trauma + 0.54);
    this.screenFlash('#ef4444', 0.24);
    soundEngine.playPlayerHurt();
    this.lighting.spawnFlash(p.x, p.y, '#ef4444', 125, 0.95, 0.22);
    this.spawnBurst(p.x, p.y, '#ef4444', 18, true);
    this.spawnFloatingText(p.x, p.y - 18, `-${amount}`, '#f87171', 1.15);

    if (p.hp <= 0) {
      this.pendingNextPhase = 'gameover';
      this.pendingTransitionTimer = 0.65;
      this.slowMoTimer = 0.55;
      this.syncHud(true);
    }
  }

  private updateCoins(dt: number): void {
    for (const c of this.coins) {
      if (!c.active) continue;
      c.ttl -= dt;
      c.spin += dt * 18;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vz -= 330 * dt;
      c.z += c.vz * dt;

      if (c.z <= 0 || c.ttl <= 0) {
        c.active = false;
        this.spawnBurst(c.x, c.y, '#fde047', 5, true);
        continue;
      }

      if (this.resolveActorCollisions({ x: c.x, y: c.y, radius: 5 })) {
        c.vx *= -0.6;
        c.vy *= -0.6;
      }
    }
  }

  private updateEnemiesKOOnly(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.aiState !== 'ko') continue;
      e.koTimer -= dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx *= Math.pow(0.04, dt);
      e.vy *= Math.pow(0.04, dt);
      e.facingAngle += dt * 15;
      this.resolveActorCollisions(e);
      if (e.koTimer <= 0) {
        this.stampFloorDecal(e.x, e.y, '#94a3b8', 8);
        this.enemies.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number): void {
    const p = this.player;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);
      e.ghostHp = lerp(e.ghostHp, e.hp, Math.min(1, dt * 4));
      e.squashX = lerp(e.squashX, 1, Math.min(1, dt * 12));
      e.squashY = lerp(e.squashY, 1, Math.min(1, dt * 12));
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      e.dashCooldown = Math.max(0, e.dashCooldown - dt);

      if (e.aiState === 'ko') {
        e.koTimer -= dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vx *= Math.pow(0.04, dt);
        e.vy *= Math.pow(0.04, dt);
        e.facingAngle += dt * 15;
        this.resolveActorCollisions(e);
        if (e.koTimer <= 0) {
          this.stampFloorDecal(e.x, e.y, '#94a3b8', 8);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      if (e.aiState === 'stunned') {
        e.parryableWindow = false;
        e.stateTimer -= dt;
        e.vx *= Math.pow(0.04, dt);
        e.vy *= Math.pow(0.04, dt);
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        this.resolveActorCollisions(e);
        if (e.stateTimer <= 0) {
          e.aiState = 'seek';
          e.attackCooldown = e.enraged ? 0.25 : 0.4;
        }
        continue;
      }

      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const toPlayerAngle = Math.atan2(dy, dx);

      if (e.aiState === 'seek') {
        e.parryableWindow = false;
        e.facingAngle = toPlayerAngle;

        const desiredDist = e.archetype === 'thrower' ? 145 : 42;
        let desiredVx = 0;
        let desiredVy = 0;
        if (dist > desiredDist + 10) {
          desiredVx = ((dx / dist) * 0.85 + (-dy / dist) * e.strafeSign * 0.38) * e.speed;
          desiredVy = ((dy / dist) * 0.85 + (dx / dist) * e.strafeSign * 0.38) * e.speed;
        } else if (dist < desiredDist - 35 && e.archetype === 'thrower') {
          desiredVx = (-dx / dist) * e.speed * 0.88;
          desiredVy = (-dy / dist) * e.speed * 0.88;
        } else {
          desiredVx = (-dy / dist) * e.speed * 0.9 * e.strafeSign;
          desiredVy = (dx / dist) * e.speed * 0.9 * e.strafeSign;
        }

        e.vx = lerp(e.vx, desiredVx, Math.min(1, dt * 11));
        e.vy = lerp(e.vy, desiredVy, Math.min(1, dt * 11));

        // Enemy tactical dash to reposition or dodge!
        if (e.dashCooldown <= 0 && dist > 110 && Math.random() < 0.04) {
          e.dashCooldown = e.enraged ? 1.15 : 1.9;
          const dashAng = toPlayerAngle + e.strafeSign * 0.55;
          e.vx = Math.cos(dashAng) * 340;
          e.vy = Math.sin(dashAng) * 340;
          this.spawnAfterimage(e.x, e.y, e.facingAngle, '#f43f5e', false, e);
          soundEngine.playDash();
        }

        if (e.attackCooldown <= 0) {
          this.pickAndStartDuelistMove(e, dist, dx, dy);
        }
      } else if (e.aiState === 'windup') {
        e.stateTimer -= dt;
        e.vx *= Math.pow(0.03, dt);
        e.vy *= Math.pow(0.03, dt);
        if (e.currentMove !== 'charge' && e.currentMove !== 'laser') {
          e.facingAngle = toPlayerAngle;
        } else if (e.currentMove === 'charge') {
          e.facingAngle = Math.atan2(e.chargeDirY, e.chargeDirX);
        }

        e.parryableWindow = e.stateTimer <= 0.36;

        if (e.stateTimer <= 0) {
          e.aiState = 'attack';
          e.parryableWindow = false;
          e.didDealDamageThisSwing = false;

          if (e.currentMove === 'charge') {
            e.stateTimer = 0.44;
            e.vx = e.chargeDirX * (e.enraged ? 380 : 325);
            e.vy = e.chargeDirY * (e.enraged ? 380 : 325);
            soundEngine.playDash();
          } else if (e.currentMove === 'dash_flank') {
            e.stateTimer = 0.22;
            const flankAng = toPlayerAngle + e.strafeSign * 0.72;
            e.vx = Math.cos(flankAng) * 370;
            e.vy = Math.sin(flankAng) * 370;
            soundEngine.playDash();
          } else if (e.currentMove === 'laser') {
            e.stateTimer = 0.16;
            const lx = e.x + Math.cos(e.facingAngle) * 760;
            const ly = e.y + Math.sin(e.facingAngle) * 760;
            this.spawnLaser(e.x, e.y, lx, ly, '#f43f5e', 7);
            this.spawnLaser(e.x, e.y, lx, ly, '#ffffff', 2.5);
            soundEngine.playRailcannon();
            this.trauma = Math.min(1, this.trauma + 0.34);
            // Smash shelves in enemy laser path!
            for (const s of this.shelves) {
              if (s.destroyed) continue;
              const sx = s.x + s.w / 2;
              const sy = s.y + s.h / 2;
              if (pointToSegmentDist(sx, sy, e.x, e.y, lx, ly) <= Math.max(s.w, s.h) * 0.5) {
                this.applyShelfDamage(s, 35, sx, sy);
              }
            }
            if (pointToSegmentDist(p.x, p.y, e.x, e.y, lx, ly) <= p.radius + 7) {
              this.damagePlayer(e.damage + 4, e.facingAngle);
            }
          } else if (e.currentMove === 'tornado') {
            e.stateTimer = 0.62;
            e.moveComboLeft = e.enraged ? 12 : 8;
            soundEngine.playShotgun();
          } else if (e.currentMove === 'barrage') {
            e.stateTimer = 0.14;
            const fanCount = e.enraged ? 7 : this.round >= 3 ? 5 : 3;
            const spread = e.enraged ? 0.85 : 0.62;
            const speed = 250 + Math.min(85, this.round * 10);
            for (let k = 0; k < fanCount; k++) {
              const offset = (k / (fanCount - 1) - 0.5) * spread;
              const ang = e.facingAngle + offset;
              this.spawnProjectile(
                e.x + Math.cos(ang) * 12,
                e.y + Math.sin(ang) * 12,
                Math.cos(ang) * speed,
                Math.sin(ang) * speed,
                e.damage,
                false,
                'can'
              );
            }
            soundEngine.playShotgun();
          } else if (e.currentMove === 'slam') {
            e.stateTimer = 0.2;
            this.trauma = Math.min(1, this.trauma + 0.42);
            this.lighting.spawnFlash(e.x, e.y, '#ef4444', 155, 1.0, 0.24);
            this.spawnBurst(e.x, e.y, '#f97316', 20, true);
            this.spawnShockwave(e.x, e.y, e.enraged ? 155 : 120, e.damage, '#ef4444', false, 240);
            if (e.enraged || e.isBoss) {
              this.spawnShockwave(e.x, e.y, 200, e.damage, '#fb7185', false, 175);
              // Radial soda-can burst on Boss / Enraged slams!
              const ringCount = e.isBoss ? 10 : 6;
              for (let r = 0; r < ringCount; r++) {
                const ang = (r / ringCount) * Math.PI * 2;
                this.spawnProjectile(
                  e.x + Math.cos(ang) * 14,
                  e.y + Math.sin(ang) * 14,
                  Math.cos(ang) * 195,
                  Math.sin(ang) * 195,
                  Math.max(8, Math.round(e.damage * 0.75)),
                  false,
                  'can'
                );
              }
            }
            this.damageShelvesInRadius(e.x, e.y, 82, 40);
            soundEngine.playHit(true, false);
          } else {
            e.stateTimer = 0.14;
            e.vx = Math.cos(e.facingAngle) * 245;
            e.vy = Math.sin(e.facingAngle) * 245;
            soundEngine.playSwing(1);
          }
          e.squashX = 1.28;
          e.squashY = 0.76;
        }
      } else if (e.aiState === 'attack') {
        e.stateTimer -= dt;
        if (e.currentMove === 'charge') {
          this.spawnAfterimage(e.x, e.y, e.facingAngle, '#ef4444', false, e);
          if (!e.didDealDamageThisSwing && circleIntersect(e.x, e.y, e.radius + 4, p.x, p.y, p.radius)) {
            e.didDealDamageThisSwing = true;
            this.damagePlayer(e.damage, Math.atan2(e.chargeDirY, e.chargeDirX));
          }
          const prevVx = e.vx;
          const prevVy = e.vy;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          const hitWall = this.resolveActorCollisions(e);
          if (hitWall) {
            // Enemy charge smashes through shelves!
            this.damageShelvesInRadius(e.x, e.y, e.radius + 14, 45);
            if (Math.hypot(prevVx, prevVy) > 130) {
              e.aiState = 'stunned';
              e.stateTimer = 0.65;
              this.trauma = Math.min(1, this.trauma + 0.28);
              this.spawnBurst(e.x, e.y, '#facc15', 16, true);
              this.spawnFloatingText(e.x, e.y - 16, 'ТАРАН!', '#facc15', 0.95);
              soundEngine.playHit(true, false);
              continue;
            }
          }
          if (e.stateTimer <= 0) {
            e.aiState = 'recover';
            e.stateTimer = e.enraged ? 0.2 : 0.32;
          }
          continue;
        } else if (e.currentMove === 'dash_flank') {
          this.spawnAfterimage(e.x, e.y, e.facingAngle, '#f43f5e', false, e);
          if (e.stateTimer <= 0) {
            // Immediately chains into flurry or slam!
            e.currentMove = Math.random() < 0.6 ? 'flurry' : 'slam';
            e.moveComboLeft = 1;
            e.aiState = 'windup';
            e.stateTimer = e.enraged ? 0.26 : 0.34;
            soundEngine.playTelegraph();
            continue;
          }
        } else if (e.currentMove === 'tornado') {
          e.facingAngle += dt * 16;
          if (e.moveComboLeft > 0 && Math.floor(e.stateTimer * 18) !== Math.floor((e.stateTimer + dt) * 18)) {
            e.moveComboLeft -= 1;
            const projSpd = 215 + Math.min(65, this.round * 8);
            this.spawnProjectile(
              e.x + Math.cos(e.facingAngle) * 12,
              e.y + Math.sin(e.facingAngle) * 12,
              Math.cos(e.facingAngle) * projSpd,
              Math.sin(e.facingAngle) * projSpd,
              e.damage,
              false,
              'can'
            );
            if (e.enraged || e.isBoss) {
              const oppAng = e.facingAngle + Math.PI;
              this.spawnProjectile(
                e.x + Math.cos(oppAng) * 12,
                e.y + Math.sin(oppAng) * 12,
                Math.cos(oppAng) * projSpd,
                Math.sin(oppAng) * projSpd,
                e.damage,
                false,
                'can'
              );
            }
            soundEngine.playSwing(0);
          }
        } else if (e.currentMove === 'flurry') {
          if (!e.didDealDamageThisSwing && isInStrikeCone(e.x, e.y, e.facingAngle, p.x, p.y, p.radius, 39, Math.PI * 0.5)) {
            e.didDealDamageThisSwing = true;
            this.damagePlayer(e.damage, e.facingAngle);
          }
          e.vx *= Math.pow(0.05, dt);
          e.vy *= Math.pow(0.05, dt);
        }

        if (e.stateTimer <= 0) {
          if (e.currentMove === 'flurry' && e.moveComboLeft > 0) {
            e.moveComboLeft -= 1;
            e.aiState = 'windup';
            e.stateTimer = e.enraged ? 0.19 : 0.27;
            soundEngine.playTelegraph();
          } else {
            e.aiState = 'recover';
            e.stateTimer = e.enraged ? 0.15 : 0.26;
          }
        }
      } else if (e.aiState === 'recover') {
        e.stateTimer -= dt;
        e.vx *= Math.pow(0.04, dt);
        e.vy *= Math.pow(0.04, dt);
        if (e.stateTimer <= 0) {
          e.aiState = 'seek';
          e.attackCooldown = e.enraged ? 0.16 : Math.max(0.2, 0.54 - this.round * 0.045);
          e.strafeSign *= -1;
        }
      }

      const prevX = e.x;
      const prevY = e.y;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      this.resolveActorCollisions(e);
      e.walkDist += Math.hypot(e.x - prevX, e.y - prevY);
    }
  }

  private tryEnemyReactiveDodge(): void {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.aiState !== 'seek' || e.dashCooldown > 0) continue;
      const chance = e.isBoss ? 0.72 : e.archetype === 'flanker' ? 0.65 : Math.min(0.55, 0.22 + this.round * 0.05);
      if (Math.random() > chance) continue;
      e.dashCooldown = e.enraged ? 0.95 : 1.5;
      const toPlayer = Math.atan2(p.y - e.y, p.x - e.x);
      const dodgeAng = toPlayer + e.strafeSign * (Math.PI * 0.45);
      e.vx = Math.cos(dodgeAng) * 380;
      e.vy = Math.sin(dodgeAng) * 380;
      e.strafeSign *= -1;
      this.spawnAfterimage(e.x, e.y, e.facingAngle, '#f43f5e', false, e);
      soundEngine.playDash();
    }
  }

  private pickAndStartDuelistMove(e: EnemyState, dist: number, dx: number, dy: number): void {
    const p = this.player;
    const roll = Math.random();
    let move: EnemyMoveKind = 'flurry';

    if (dist > 150) {
      if (roll < 0.34) move = 'charge';
      else if (roll < 0.66) move = 'laser';
      else if (roll < 0.86) move = 'barrage';
      else move = 'dash_flank';
    } else if (dist > 76) {
      if (roll < 0.24) move = 'charge';
      else if (roll < 0.48) move = 'dash_flank';
      else if (roll < 0.68) move = 'barrage';
      else if (roll < 0.85) move = 'laser';
      else move = 'tornado';
    } else {
      if (roll < 0.36) move = 'flurry';
      else if (roll < 0.66) move = 'slam';
      else if (roll < 0.86) move = 'tornado';
      else move = 'dash_flank';
    }

    e.currentMove = move;
    e.aiState = 'windup';
    e.squashX = 0.82;
    e.squashY = 1.22;
    soundEngine.playTelegraph();

    const leadWeight = this.round >= 2 ? Math.min(0.85, 0.3 + this.round * 0.08) : 0;

    if (move === 'charge') {
      const ang = predictLeadAngle(e.x, e.y, p.x, p.y, p.vx, p.vy, 360, leadWeight * 0.65);
      e.chargeDirX = Math.cos(ang);
      e.chargeDirY = Math.sin(ang);
      e.stateTimer = e.enraged ? 0.37 : 0.47;
    } else if (move === 'laser') {
      e.facingAngle = leadWeight > 0
        ? predictLeadAngle(e.x, e.y, p.x, p.y, p.vx, p.vy, 520, leadWeight * 0.55)
        : Math.atan2(dy, dx);
      e.stateTimer = e.enraged ? 0.4 : 0.5;
    } else if (move === 'barrage' || move === 'tornado') {
      e.facingAngle = predictLeadAngle(e.x, e.y, p.x, p.y, p.vx, p.vy, 260, leadWeight);
      e.stateTimer = e.enraged ? 0.31 : 0.41;
    } else if (move === 'slam') {
      e.stateTimer = e.enraged ? 0.39 : 0.49;
    } else if (move === 'dash_flank') {
      e.stateTimer = 0.22;
    } else {
      e.moveComboLeft = e.enraged || this.round >= 2 ? (e.isBoss ? 3 : 2) : 1;
      e.stateTimer = e.enraged ? 0.26 : 0.34;
    }
  }

  private spawnAfterimage(
    x: number,
    y: number,
    angle: number,
    color: string,
    isPlayer: boolean,
    enemy?: EnemyState
  ): void {
    const af = this.afterimages[this.afterimageCursor];
    this.afterimageCursor = (this.afterimageCursor + 1) % this.afterimages.length;
    af.active = true;
    af.x = x;
    af.y = y;
    af.angle = angle;
    af.color = color;
    af.alpha = 0.55;
    af.ttl = 0.18;
    af.maxTtl = 0.18;
    af.isPlayer = isPlayer;
    if (enemy) {
      af.archetype = enemy.archetype;
      af.paletteIndex = enemy.paletteIndex;
      af.isBoss = enemy.isBoss;
    }
  }

  private updateAfterimages(dt: number): void {
    for (const af of this.afterimages) {
      if (!af.active) continue;
      af.ttl -= dt;
      if (af.ttl <= 0) {
        af.active = false;
      } else {
        af.alpha = 0.55 * (af.ttl / af.maxTtl);
      }
    }
  }

  private spawnShockwave(
    x: number,
    y: number,
    maxRadius: number,
    damage: number,
    color: string,
    fromPlayer = false,
    speed = 235
  ): void {
    for (const sw of this.shockwaves) {
      if (!sw.active) {
        sw.active = true;
        sw.x = x;
        sw.y = y;
        sw.radius = 12;
        sw.maxRadius = maxRadius;
        sw.speed = speed;
        sw.damage = damage;
        sw.fromPlayer = fromPlayer;
        sw.color = color;
        sw.hitTarget = false;
        return;
      }
    }
  }

  private updateShockwaves(dt: number): void {
    const p = this.player;
    for (const sw of this.shockwaves) {
      if (!sw.active) continue;
      sw.radius += sw.speed * dt;
      if (!sw.fromPlayer && !sw.hitTarget && sw.damage > 0) {
        const d = Math.hypot(p.x - sw.x, p.y - sw.y);
        if (Math.abs(d - sw.radius) <= p.radius + 5) {
          if (p.invulnTimer <= 0 && p.dashTimer <= 0) {
            sw.hitTarget = true;
            this.damagePlayer(sw.damage, Math.atan2(p.y - sw.y, p.x - sw.x));
          } else if (p.dashTimer > 0) {
            sw.hitTarget = true;
            this.addStyle(65, '+УКЛОНЕНИЕ');
            this.spawnFloatingText(p.x, p.y - 18, 'ЧИСТО!', '#38bdf8', 0.9);
          }
        }
      }
      if (sw.radius >= sw.maxRadius) {
        sw.active = false;
      }
    }
  }

  private spawnLaser(x1: number, y1: number, x2: number, y2: number, color: string, width: number): void {
    for (const lb of this.lasers) {
      if (!lb.active) {
        lb.active = true;
        lb.x1 = x1;
        lb.y1 = y1;
        lb.x2 = x2;
        lb.y2 = y2;
        lb.color = color;
        lb.width = width;
        lb.ttl = 0.22;
        lb.maxTtl = 0.22;
        return;
      }
    }
  }

  private updateLasers(dt: number): void {
    for (const lb of this.lasers) {
      if (!lb.active) continue;
      lb.ttl -= dt;
      if (lb.ttl <= 0) lb.active = false;
    }
  }

  private updateCarts(dt: number): void {
    const p = this.player;
    for (const c of this.carts) {
      c.hitFlash = Math.max(0, c.hitFlash - dt);
      const speed = Math.hypot(c.vx, c.vy);
      if (speed > 2) {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.angle += (speed * dt) / 28;
        c.vx *= Math.pow(0.14, dt);
        c.vy *= Math.pow(0.14, dt);
      } else {
        c.vx = 0;
        c.vy = 0;
      }

      const col = this.resolveActorCollisions(c);
      if (col && speed > 90) {
        this.damageShelvesInRadius(c.x, c.y, c.radius + 10, 28);
        c.vx *= -0.55;
        c.vy *= -0.55;
        soundEngine.playHit(false, false);
      }

      if (circleIntersect(p.x, p.y, p.radius, c.x, c.y, c.radius)) {
        const angle = Math.atan2(c.y - p.y, c.x - p.x);
        c.vx += Math.cos(angle) * 165;
        c.vy += Math.sin(angle) * 165;
      }

      if (speed > 120) {
        for (const e of this.enemies) {
          if (e.aiState === 'ko') continue;
          if (circleIntersect(c.x, c.y, c.radius + 3, e.x, e.y, e.radius)) {
            const angle = Math.atan2(c.vy, c.vx);
            this.damageEnemy(e, 38, angle, 295, true, true, false);
            this.addStyle(125, '+ВЗРЫВ ТЕЛЕЖКОЙ');
            c.vx *= -0.45;
            c.vy *= -0.45;
          }
        }
      }
    }
  }

  private updatePickups(dt: number): void {
    this.pickupSpawnTimer -= dt;
    if (this.pickupSpawnTimer <= 0 && this.pickups.length < 2) {
      this.pickupSpawnTimer = 6.5;
      this.spawnRandomPickup();
    }

    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const item = this.pickups[i];
      item.bobPhase += dt * 5;
      item.ttl -= dt;
      if (item.ttl <= 0) {
        this.pickups.splice(i, 1);
        continue;
      }

      if (circleIntersect(p.x, p.y, p.radius + 5, item.x, item.y, 10)) {
        soundEngine.playPickup();
        if (item.kind === 'croissant') {
          p.hp = Math.min(p.maxHp, p.hp + 30);
          p.ghostHp = Math.max(p.ghostHp, p.hp);
          this.spawnFloatingText(p.x, p.y - 18, '+30 HP', '#4ade80', 1.05);
          this.spawnBurst(item.x, item.y, '#4ade80', 14, true);
        } else if (item.kind === 'energy_drink') {
          p.stamina = p.maxStamina;
          p.coins = p.maxCoins;
          p.railCharge = 100;
          p.shotgunCooldown = 0;
          this.spawnFloatingText(p.x, p.y - 18, 'УЛЬТРА ЗАРЯД!', '#38bdf8', 1.05);
          this.spawnBurst(item.x, item.y, '#38bdf8', 14, true);
        } else {
          const opp = this.enemies[0];
          const ang = opp ? Math.atan2(opp.y - p.y, opp.x - p.x) : p.facingAngle;
          const projKind = item.kind === 'watermelon' ? 'watermelon' : item.kind === 'soda_bomb' ? 'soda_bomb' : 'baguette';
          this.spawnProjectile(
            p.x + Math.cos(ang) * 14,
            p.y + Math.sin(ang) * 14,
            Math.cos(ang) * 355,
            Math.sin(ang) * 355,
            38,
            true,
            projKind
          );
          this.spawnFloatingText(p.x, p.y - 18, 'СНАРЯД!', '#facc15', 1.0);
          this.addStyle(50, '+СУПЕР-ТОВАР');
        }
        this.pickups.splice(i, 1);
      }
    }
  }

  private spawnRandomPickup(): void {
    const spot = PICKUP_SPAWN_POINTS[Math.floor(Math.random() * PICKUP_SPAWN_POINTS.length)];
    const kinds: PickupKind[] = ['watermelon', 'baguette', 'soda_bomb', 'energy_drink', 'croissant'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    this.spawnPickupAt(kind, spot.x + (Math.random() - 0.5) * 16, spot.y + (Math.random() - 0.5) * 16);
  }

  private spawnPickupAt(kind: PickupKind, x: number, y: number): void {
    this.pickups.push({
      id: `item-${++this.entitySeq}`,
      kind,
      x,
      y,
      bobPhase: Math.random() * Math.PI * 2,
      ttl: 22,
    });
  }

  private updateProjectiles(dt: number): void {
    const p = this.player;
    for (const pr of this.projectiles) {
      if (!pr.active) continue;
      pr.ttl -= dt;
      pr.age += dt;
      if (pr.ttl <= 0) {
        pr.active = false;
        continue;
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.spin += dt * 15;

      if (pr.fromPlayer && (pr.kind === 'pellet' || pr.kind === 'boost_pellet')) {
        let hitCoinIdx = -1;
        for (let ci = 0; ci < this.coins.length; ci++) {
          const c = this.coins[ci];
          if (!c.active) continue;
          if (Math.hypot(c.x - pr.x, c.y - pr.y) <= 22) {
            hitCoinIdx = ci;
            break;
          }
        }
        if (hitCoinIdx !== -1) {
          pr.active = false;
          this.triggerCoinRicochet(hitCoinIdx, false);
          continue;
        }
      }

      let hitSolid =
        pr.x < WALL_THICKNESS + pr.radius ||
        pr.x > ARENA_WIDTH - WALL_THICKNESS - pr.radius ||
        pr.y < WALL_THICKNESS + pr.radius ||
        pr.y > ARENA_HEIGHT - WALL_THICKNESS - pr.radius;

      if (!hitSolid) {
        for (const s of this.shelves) {
          if (s.destroyed) continue;
          if (resolveCircleRect(pr.x, pr.y, pr.radius, s).collided) {
            hitSolid = true;
            this.applyShelfDamage(s, pr.boosted || pr.parried ? 32 : 8, pr.x, pr.y);
            break;
          }
        }
      }

      if (hitSolid) {
        this.detonateProjectile(pr);
        continue;
      }

      if (pr.fromPlayer) {
        for (const e of this.enemies) {
          if (e.aiState === 'ko') continue;
          if (circleIntersect(pr.x, pr.y, pr.radius, e.x, e.y, e.radius)) {
            const angle = Math.atan2(pr.vy, pr.vx);
            const heavy = pr.boosted || pr.parried || pr.kind === 'soda_bomb' || pr.kind === 'watermelon';
            this.damageEnemy(e, pr.damage, angle, heavy ? 250 : 65, heavy, heavy, !pr.parried);
            this.detonateProjectile(pr);
            break;
          }
        }
      } else {
        if (circleIntersect(pr.x, pr.y, pr.radius, p.x, p.y, p.radius)) {
          this.damagePlayer(pr.damage, Math.atan2(pr.vy, pr.vx));
          this.detonateProjectile(pr);
        }
      }
    }
  }

  private detonateProjectile(pr: Projectile): void {
    pr.active = false;
    if (pr.kind === 'soda_bomb' || pr.kind === 'boost_pellet' || pr.parried) {
      this.trauma = Math.min(1, this.trauma + 0.38);
      this.lighting.spawnFlash(pr.x, pr.y, pr.kind === 'boost_pellet' ? '#fb923c' : '#38bdf8', 150, 1.0, 0.22);
      this.spawnBurst(pr.x, pr.y, pr.kind === 'boost_pellet' ? '#fb923c' : '#f8fafc', 24, true);
      this.spawnShockwave(pr.x, pr.y, 70, 0, pr.kind === 'boost_pellet' ? '#fb923c' : '#38bdf8', true);
      this.stampFloorDecal(pr.x, pr.y, '#ef4444', 10);
      soundEngine.playHit(true, true);
      this.damageShelvesInRadius(pr.x, pr.y, 64, 30);
      for (const e of this.enemies) {
        if (e.aiState === 'ko') continue;
        if (Math.hypot(e.x - pr.x, e.y - pr.y) <= 68) {
          this.damageEnemy(e, 22, Math.atan2(e.y - pr.y, e.x - pr.x), 230, true, true, false);
        }
      }
    } else if (pr.kind === 'pellet') {
      this.spawnBurst(pr.x, pr.y, '#fde047', 5, true);
    } else {
      this.spawnBurst(pr.x, pr.y, '#fde047', 10, false);
      soundEngine.playHit(false, false);
    }
  }

  private resolveActorCollisions(actor: { x: number; y: number; radius: number }): boolean {
    let hit = false;
    const minX = WALL_THICKNESS + actor.radius;
    const maxX = ARENA_WIDTH - WALL_THICKNESS - actor.radius;
    const minY = WALL_THICKNESS + actor.radius;
    const maxY = ARENA_HEIGHT - WALL_THICKNESS - actor.radius;

    if (actor.x < minX) {
      actor.x = minX;
      hit = true;
    } else if (actor.x > maxX) {
      actor.x = maxX;
      hit = true;
    }
    if (actor.y < minY) {
      actor.y = minY;
      hit = true;
    } else if (actor.y > maxY) {
      actor.y = maxY;
      hit = true;
    }

    for (const shelf of this.shelves) {
      if (shelf.destroyed) continue;
      const res = resolveCircleRect(actor.x, actor.y, actor.radius, shelf);
      if (res.collided) {
        actor.x = res.x;
        actor.y = res.y;
        hit = true;
      }
    }
    return hit;
  }

  private spawnProjectile(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    fromPlayer: boolean,
    kind: Projectile['kind']
  ): void {
    for (const pr of this.projectiles) {
      if (!pr.active) {
        pr.active = true;
        pr.x = x;
        pr.y = y;
        pr.vx = vx;
        pr.vy = vy;
        pr.radius = kind === 'pellet' ? 3 : kind === 'watermelon' ? 7 : 5;
        pr.damage = damage;
        pr.fromPlayer = fromPlayer;
        pr.parried = false;
        pr.boosted = false;
        pr.kind = kind;
        pr.spin = 0;
        pr.ttl = kind === 'pellet' ? 0.55 : 1.7;
        pr.age = 0;
        return;
      }
    }
  }

  private spawnParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    size: number,
    color: string,
    ttl: number,
    additive: boolean
  ): void {
    const pt = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % this.particles.length;
    pt.active = true;
    pt.x = x;
    pt.y = y;
    pt.z = z;
    pt.vx = vx;
    pt.vy = vy;
    pt.vz = vz;
    pt.size = size;
    pt.color = color;
    pt.alpha = 1;
    pt.ttl = ttl;
    pt.maxTtl = ttl;
    pt.gravity = 210;
    pt.drag = 0.93;
    pt.additive = additive;
  }

  private spawnBurst(x: number, y: number, color: string, count: number, additive: boolean): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 55 + Math.random() * 195;
      this.spawnParticle(
        x,
        y,
        3 + Math.random() * 6,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        55 + Math.random() * 95,
        Math.random() < 0.45 ? 3 : 2,
        color,
        0.24 + Math.random() * 0.28,
        additive
      );
    }
  }

  private updateParticles(dt: number): void {
    for (const pt of this.particles) {
      if (!pt.active) continue;
      pt.ttl -= dt;
      if (pt.ttl <= 0) {
        pt.active = false;
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      const damp = Math.pow(pt.drag, dt * 60);
      pt.vx *= damp;
      pt.vy *= damp;
      pt.vz -= pt.gravity * dt;
      pt.z += pt.vz * dt;
      if (pt.z < 0) {
        pt.z = 0;
        pt.vz *= -0.4;
      }
      pt.alpha = Math.max(0, pt.ttl / pt.maxTtl);
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, scale = 1): void {
    const ft = this.floatingTexts[this.textCursor];
    this.textCursor = (this.textCursor + 1) % this.floatingTexts.length;
    ft.active = true;
    ft.x = x;
    ft.y = y;
    ft.vy = -30;
    ft.text = text;
    ft.color = color;
    ft.scale = scale;
    ft.ttl = 0.65;
    ft.maxTtl = 0.65;
  }

  private updateFloatingTexts(dt: number): void {
    for (const ft of this.floatingTexts) {
      if (!ft.active) continue;
      ft.ttl -= dt;
      if (ft.ttl <= 0) {
        ft.active = false;
        continue;
      }
      ft.y += ft.vy * dt;
      ft.vy *= Math.pow(0.25, dt);
    }
  }

  private screenFlash(color: string, alpha: number): void {
    this.screenFlashColor = color;
    this.screenFlashAlpha = alpha;
  }

  private stampFloorDecal(x: number, y: number, color: string, size: number): void {
    const dctx = this.decalCtx;
    dctx.save();
    dctx.globalAlpha = 0.38;
    dctx.fillStyle = color;
    dctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    dctx.fillRect(Math.round(x + size * 0.4), Math.round(y - size * 0.2), Math.max(2, size >> 1), Math.max(2, size >> 1));
    dctx.restore();
  }

  private updateCamera(dt: number): void {
    const p = this.player;
    const opp = this.enemies[0];
    let targetX = p.x + Math.cos(p.facingAngle) * 18;
    let targetY = p.y + Math.sin(p.facingAngle) * 14;
    if (opp && opp.aiState !== 'ko') {
      targetX = lerp(targetX, (p.x + opp.x) * 0.5, 0.28);
      targetY = lerp(targetY, (p.y + opp.y) * 0.5, 0.28);
    }

    this.camX = lerp(this.camX, targetX, Math.min(1, dt * 10));
    this.camY = lerp(this.camY, targetY, Math.min(1, dt * 10));

    const halfViewW = this.viewportW / (2 * this.camZoom);
    const halfViewH = this.viewportH / (2 * this.camZoom);

    this.camX = halfViewW * 2 >= ARENA_WIDTH ? ARENA_WIDTH / 2 : clamp(this.camX, halfViewW, ARENA_WIDTH - halfViewW);
    this.camY = halfViewH * 2 >= ARENA_HEIGHT ? ARENA_HEIGHT / 2 : clamp(this.camY, halfViewH, ARENA_HEIGHT - halfViewH);
  }

  private screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.displayCanvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - this.viewportW / 2) / this.camZoom + this.camX,
      y: (sy - this.viewportH / 2) / this.camZoom + this.camY,
    };
  }

  private render(): void {
    const wctx = this.worldCtx;
    wctx.imageSmoothingEnabled = false;

    wctx.drawImage(this.atlas.arenaBg, 0, 0);
    wctx.drawImage(this.decalCanvas, 0, 0);

    // Batch destroyed shelf outlines in one canvas state block
    let hasDestroyed = false;
    for (let i = 0; i < this.shelves.length; i++) {
      if (this.shelves[i].destroyed) {
        hasDestroyed = true;
        break;
      }
    }
    if (hasDestroyed) {
      wctx.save();
      wctx.lineWidth = 1.5;
      wctx.setLineDash([4, 4]);
      const blink = 0.35 + 0.35 * Math.sin(this.elapsedRealSec * 16);
      for (let i = 0; i < this.shelves.length; i++) {
        const s = this.shelves[i];
        if (!s.destroyed) continue;
        wctx.strokeStyle = s.respawnTimer <= 1.8 ? `rgba(56, 189, 248, ${blink.toFixed(2)})` : 'rgba(148, 163, 184, 0.22)';
        wctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
      }
      wctx.restore();
    }

    // Active destructible shelves
    for (let i = 0; i < this.shelves.length; i++) {
      const s = this.shelves[i];
      if (s.destroyed) continue;

      const spr = this.atlas.shelfSprites[s.id];
      if (!spr) continue;
      const sx = s.shakeTimer > 0 ? (Math.random() - 0.5) * 3 : 0;
      const sy = s.shakeTimer > 0 ? (Math.random() - 0.5) * 3 : 0;
      wctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
      wctx.fillRect(Math.round(s.x + 4), Math.round(s.y + 5), Math.round(s.w * s.popScale), Math.round((s.h + 3) * s.popScale));

      const img = s.hitFlashTimer > 0 ? spr.flash : spr.normal;
      if (Math.abs(s.popScale - 1) < 0.02 && sx === 0 && sy === 0) {
        // Fast path: direct drawImage without save/translate/scale/restore!
        wctx.drawImage(img, s.x - 2, s.y - 2);
      } else {
        wctx.save();
        wctx.translate(Math.round(s.x + s.w / 2 + sx), Math.round(s.y + s.h / 2 + sy));
        wctx.scale(s.popScale, s.popScale);
        wctx.drawImage(img, -img.width / 2, -img.height / 2);
        wctx.restore();
      }

      // Crisp pixel damage cracks via fast fillRect (no path allocation!)
      if (s.hp < s.maxHp * 0.6) {
        wctx.fillStyle = '#0f172a';
        const cx = Math.round(s.x + s.w * 0.5);
        const cy = Math.round(s.y + s.h * 0.5);
        wctx.fillRect(cx - 5, cy - 4, 4, 2);
        wctx.fillRect(cx - 1, cy - 2, 4, 2);
        wctx.fillRect(cx + 3, cy, 4, 2);
      }
    }

    this.renderTelegraphs(wctx);

    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) continue;
      wctx.globalAlpha = Math.max(0.15, 1 - sw.radius / sw.maxRadius);
      wctx.strokeStyle = sw.color;
      wctx.lineWidth = 4;
      wctx.beginPath();
      wctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      wctx.stroke();
    }
    wctx.globalAlpha = 1;

    for (let i = 0; i < this.pickups.length; i++) {
      const item = this.pickups[i];
      const sprite = this.atlas.items[item.kind];
      const bob = Math.sin(item.bobPhase) * 2;
      wctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      wctx.fillRect(Math.round(item.x - 5), Math.round(item.y + 4), 10, 4);
      wctx.drawImage(sprite, Math.round(item.x - 8), Math.round(item.y - 8 + bob));
    }

    for (let i = 0; i < this.carts.length; i++) {
      const c = this.carts[i];
      wctx.save();
      wctx.translate(Math.round(c.x), Math.round(c.y));
      wctx.rotate(c.angle);
      wctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
      wctx.fillRect(-9, -6, 20, 16);
      wctx.drawImage(this.atlas.cart, -11, -9);
      wctx.restore();
    }

    // Dash Afterimages
    for (let i = 0; i < this.afterimages.length; i++) {
      const af = this.afterimages[i];
      if (!af.active) continue;
      wctx.save();
      wctx.globalAlpha = af.alpha;
      wctx.translate(Math.round(af.x), Math.round(af.y));
      wctx.rotate(af.angle);
      const spr = af.isPlayer
        ? this.atlas.player.flash
        : (this.atlas.enemies[`${af.archetype}-${af.paletteIndex}-${af.isBoss ? 1 : 0}`]?.flash ?? this.atlas.player.flash);
      wctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
      wctx.restore();
    }
    wctx.globalAlpha = 1;

    // Zero-allocation Y-sorted actor rendering (1v1!)
    const opp = this.enemies[0];
    if (this.phase === 'title') {
      if (opp) this.renderEnemy(wctx, opp);
    } else if (!opp || this.player.y <= opp.y) {
      this.renderPlayer(wctx);
      if (opp) this.renderEnemy(wctx, opp);
    } else {
      this.renderEnemy(wctx, opp);
      this.renderPlayer(wctx);
    }

    for (const c of this.coins) {
      if (!c.active) continue;
      wctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      wctx.fillRect(Math.round(c.x - 3), Math.round(c.y + 4), 6, 3);
      const scaleW = Math.max(2, Math.abs(Math.cos(c.spin)) * 6);
      wctx.fillStyle = '#0f172a';
      wctx.fillRect(Math.round(c.x - scaleW / 2 - 1), Math.round(c.y - c.z - 4), Math.round(scaleW + 2), 8);
      wctx.fillStyle = '#fde047';
      wctx.fillRect(Math.round(c.x - scaleW / 2), Math.round(c.y - c.z - 3), Math.round(scaleW), 6);
    }

    for (const pr of this.projectiles) {
      if (!pr.active) continue;
      if (pr.kind === 'pellet' || pr.kind === 'boost_pellet') {
        wctx.fillStyle = pr.kind === 'boost_pellet' ? '#fb923c' : '#fde047';
        wctx.beginPath();
        wctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
        wctx.fill();
      } else {
        wctx.save();
        wctx.translate(Math.round(pr.x), Math.round(pr.y));
        wctx.rotate(pr.spin);
        const itemSprite =
          pr.kind === 'watermelon'
            ? this.atlas.items.watermelon
            : pr.kind === 'baguette'
              ? this.atlas.items.baguette
              : this.atlas.items.soda_bomb;
        wctx.drawImage(itemSprite, -8, -8);
        wctx.restore();
      }
    }

    for (const pt of this.particles) {
      if (!pt.active || pt.additive) continue;
      wctx.globalAlpha = pt.alpha;
      wctx.fillStyle = pt.color;
      wctx.fillRect(Math.round(pt.x - pt.size / 2), Math.round(pt.y - pt.z - pt.size / 2), pt.size, pt.size);
    }
    wctx.globalAlpha = 1;

    this.lighting.render(
      wctx,
      this.elapsedRealSec,
      this.phase === 'title' ? ARENA_WIDTH / 2 : this.player.x,
      this.phase === 'title' ? ARENA_HEIGHT / 2 : this.player.y,
      this.phase !== 'title' && this.currentPlan.isEmergencyLight
    );

    wctx.save();
    wctx.globalCompositeOperation = 'lighter';
    for (const pt of this.particles) {
      if (!pt.active || !pt.additive) continue;
      wctx.globalAlpha = pt.alpha;
      wctx.fillStyle = pt.color;
      wctx.fillRect(Math.round(pt.x - pt.size / 2), Math.round(pt.y - pt.z - pt.size / 2), pt.size, pt.size);
    }
    for (const lb of this.lasers) {
      if (!lb.active) continue;
      wctx.globalAlpha = lb.ttl / lb.maxTtl;
      wctx.strokeStyle = lb.color;
      wctx.lineWidth = lb.width;
      wctx.beginPath();
      wctx.moveTo(lb.x1, lb.y1);
      wctx.lineTo(lb.x2, lb.y2);
      wctx.stroke();
    }
    wctx.restore();

    if (this.phase !== 'title') {
      this.renderPlayerSlashArc(wctx);
      this.renderParryShield(wctx);
    }

    for (const ft of this.floatingTexts) {
      if (!ft.active) continue;
      const alpha = Math.min(1, (ft.ttl / ft.maxTtl) * 1.4);
      wctx.save();
      wctx.globalAlpha = alpha;
      wctx.font = `bold ${Math.round(10 * ft.scale)}px "JetBrains Mono", monospace`;
      wctx.textAlign = 'center';
      wctx.fillStyle = '#0f172a';
      wctx.fillText(ft.text, Math.round(ft.x) + 1, Math.round(ft.y) + 1);
      wctx.fillStyle = ft.color;
      wctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
      wctx.restore();
    }

    const dctx = this.displayCtx;
    dctx.save();
    dctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    dctx.fillStyle = '#0b0e14';
    dctx.fillRect(0, 0, this.viewportW, this.viewportH);

    const shakeAmp = this.trauma * this.trauma * 11;
    const shakeX = (Math.random() * 2 - 1) * shakeAmp;
    const shakeY = (Math.random() * 2 - 1) * shakeAmp;

    dctx.imageSmoothingEnabled = false;
    dctx.translate(this.viewportW / 2 + shakeX, this.viewportH / 2 + shakeY);
    dctx.scale(this.camZoom, this.camZoom);
    dctx.drawImage(this.worldCanvas, -this.camX, -this.camY);

    dctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.screenFlashAlpha > 0.01) {
      dctx.fillStyle = this.screenFlashColor;
      dctx.globalAlpha = this.screenFlashAlpha;
      dctx.fillRect(0, 0, this.viewportW, this.viewportH);
      dctx.globalAlpha = 1;
    }

    if (this.phase === 'playing' && this.player.hp <= 30) {
      const pulse = 0.2 + 0.14 * Math.sin(this.elapsedRealSec * 8);
      dctx.globalAlpha = pulse;
      dctx.drawImage(this.lowHpVignetteCanvas, 0, 0, this.viewportW, this.viewportH);
      dctx.globalAlpha = 1;
    }

    dctx.restore();
  }

  private renderTelegraphs(ctx: CanvasRenderingContext2D): void {
    for (const e of this.enemies) {
      if (e.aiState !== 'windup') continue;
      const pulse = 0.45 + 0.35 * Math.sin(this.elapsedRealSec * 30);

      if (e.currentMove === 'charge') {
        ctx.save();
        ctx.strokeStyle = e.parryableWindow ? `rgba(253, 224, 71, ${pulse.toFixed(2)})` : `rgba(239, 68, 68, ${pulse.toFixed(2)})`;
        ctx.lineWidth = 11;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + e.chargeDirX * 165, e.y + e.chargeDirY * 165);
        ctx.stroke();
        ctx.restore();
      } else if (e.currentMove === 'laser') {
        ctx.save();
        ctx.strokeStyle = e.parryableWindow ? '#fde047' : `rgba(244, 63, 94, ${pulse.toFixed(2)})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.facingAngle) * 420, e.y + Math.sin(e.facingAngle) * 420);
        ctx.stroke();
        ctx.restore();
      } else if (e.currentMove === 'slam') {
        ctx.save();
        ctx.fillStyle = `rgba(239, 68, 68, ${(pulse * 0.32).toFixed(2)})`;
        ctx.strokeStyle = e.parryableWindow ? '#fde047' : `rgba(248, 113, 113, ${pulse.toFixed(2)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 72, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (e.currentMove === 'barrage' || e.currentMove === 'tornado') {
        ctx.save();
        ctx.strokeStyle = e.parryableWindow ? '#fde047' : `rgba(250, 204, 21, ${pulse.toFixed(2)})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        for (const off of [-0.26, 0, 0.26]) {
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          ctx.lineTo(e.x + Math.cos(e.facingAngle + off) * 180, e.y + Math.sin(e.facingAngle + off) * 180);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = e.parryableWindow ? `rgba(253, 224, 71, ${(pulse * 0.48).toFixed(2)})` : `rgba(239, 68, 68, ${(pulse * 0.36).toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.arc(e.x, e.y, 40, e.facingAngle - Math.PI * 0.48, e.facingAngle + Math.PI * 0.48);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    const p = this.player;
    const bob = Math.sin(p.walkDist * 0.32) * 1.5;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 8, 9, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (p.invulnTimer > 0 && p.dashTimer <= 0 && Math.floor(this.elapsedRealSec * 24) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }

    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y + bob));
    ctx.rotate(p.facingAngle);
    ctx.scale(p.squashX, p.squashY);

    const sprite = p.hitFlashTimer > 0 ? this.atlas.player.flash : this.atlas.player.normal;
    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private renderPlayerSlashArc(ctx: CanvasRenderingContext2D): void {
    const p = this.player;
    if (p.attackPhase !== 'active') return;
    const reach = p.comboStep >= 3 ? 44 : 36;
    const halfArc = p.comboStep >= 3 ? Math.PI * 0.74 : Math.PI * 0.54;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = p.comboStep >= 3 ? '#facc15' : '#38bdf8';
    ctx.lineWidth = p.comboStep >= 3 ? 6.5 : 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, reach - 6, p.facingAngle - halfArc, p.facingAngle + halfArc);
    ctx.stroke();
    ctx.restore();
  }

  private renderParryShield(ctx: CanvasRenderingContext2D): void {
    const p = this.player;
    if (p.parryTimer <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 25, p.facingAngle - Math.PI * 0.64, p.facingAngle + Math.PI * 0.64);
    ctx.stroke();
    ctx.restore();
  }

  private renderEnemy(ctx: CanvasRenderingContext2D, e: EnemyState): void {
    const bob = e.aiState === 'ko' ? 0 : Math.sin(e.walkDist * 0.28) * 1.5;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + 8, e.radius * 0.85, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (e.enraged && e.aiState !== 'ko') {
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.82)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.isBoss && e.aiState !== 'ko') {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y + bob));
    ctx.rotate(e.facingAngle);
    ctx.scale(e.squashX, e.squashY);

    const key = `${e.archetype}-${e.paletteIndex}-${e.isBoss ? 1 : 0}`;
    const set = this.atlas.enemies[key] ?? this.atlas.enemies['brawler-0-0'];
    const img = e.hitFlashTimer > 0 ? set.flash : set.normal;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    if (e.aiState === 'windup') {
      ctx.rotate(-e.facingAngle);
      ctx.fillStyle = e.parryableWindow ? '#fde047' : '#ef4444';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(e.parryableWindow ? '★' : '!', 0, -e.radius - 7);
    }

    ctx.restore();
  }

  private saveBestScore(): void {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
      } catch {
        // Ignore storage error
      }
    }
  }

  private syncHud(force: boolean): void {
    if (!force) return;
    const p = this.player;
    this.lastSyncedHp = Math.round(p.hp);
    this.lastSyncedPhase = this.phase;

    const opp = this.enemies[0] ?? null;

    this.onHudSync({
      phase: this.phase,
      round: this.round,
      roundTitle: this.currentPlan.title,
      zoneId: this.currentZone.id,
      zoneName: this.currentZone.name,
      isEmergencyLight: this.currentPlan.isEmergencyLight,
      hp: Math.round(p.hp),
      maxHp: Math.round(p.maxHp),
      ghostHp: Math.round(p.ghostHp),
      dashCharges: p.stamina / 100,
      maxDashCharges: Math.round(p.maxStamina / 100),
      coinCount: p.coins,
      maxCoins: p.maxCoins,
      railCharge: Math.round(p.railCharge),
      shotgunCooldownRatio: clamp(p.shotgunCooldown / 0.44, 0, 1),
      parryCooldownRatio: clamp(p.parryCooldown / 0.34, 0, 1),
      heldItem: p.heldItem,
      score: Math.round(this.score),
      bestScore: Math.round(this.bestScore),
      comboCount: this.comboCount,
      styleRank: this.styleRank,
      stylePoints: Math.round(this.stylePoints),
      styleFeed: [...this.styleFeed],
      opponentName: opp ? opp.name : null,
      opponentTitle: opp ? (opp.isBoss ? 'БОСС ДУЭЛИ' : `РАУНД ${this.round}`) : null,
      opponentHp: opp ? Math.round(opp.hp) : 0,
      opponentMaxHp: opp ? Math.round(opp.maxHp) : 0,
      opponentGhostHp: opp ? Math.round(opp.ghostHp) : 0,
      opponentEnraged: opp ? opp.enraged : false,
      kosTotal: this.kosTotal,
      parriesTotal: this.parriesTotal,
      damageTaken: Math.round(this.damageTaken),
      maxCombo: this.maxCombo,
      elapsedSeconds: Math.round(this.runTimeSec),
      upgradeChoices: this.upgradeChoices,
      announcement: this.announcementText,
      muted: soundEngine.isMuted(),
      isFullscreen: Boolean(typeof document !== 'undefined' && document.fullscreenElement),
    });
  }
}
