export type GamePhase = 'title' | 'playing' | 'paused' | 'upgrade' | 'gameover';

export type TouchMode = 'auto' | 'on' | 'off';

export type EnemyArchetype =
  | 'brawler'
  | 'charger'
  | 'thrower'
  | 'heavy'
  | 'flanker';

export type EnemyAIState =
  | 'seek'
  | 'windup'
  | 'attack'
  | 'recover'
  | 'stunned'
  | 'ko';

export type EnemyMoveKind =
  | 'flurry'
  | 'charge'
  | 'barrage'
  | 'slam'
  | 'laser'
  | 'tornado'
  | 'dash_flank'
  | 'ice_spikes'
  | 'forklift_ram'
  | 'vip_lasers';

export type PickupKind =
  | 'watermelon'
  | 'baguette'
  | 'soda_bomb'
  | 'energy_drink'
  | 'croissant'
  | 'buff_frenzy'
  | 'buff_chili'
  | 'buff_coin';

export type StyleRank = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'ULTRA';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ConveyorBelt extends Rect {
  id: string;
  vx: number;
  vy: number;
}

export interface ExplosiveCanister {
  id: string;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  respawnTimer: number;
  hitFlashTimer: number;
}

export interface FloorHazard {
  active: boolean;
  kind: 'ice_spike' | 'vip_laser' | 'chili_fire';
  x: number;
  y: number;
  x2: number;
  y2: number;
  radius: number;
  windupTimer: number;
  maxWindup: number;
  activeTimer: number;
  damage: number;
  fromPlayer: boolean;
  hitTarget: boolean;
  tickAccum: number;
}

export interface WhiplashState {
  active: boolean;
  phase: 'extend' | 'pull_player' | 'pull_enemy' | 'retract';
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetEnemyId: string | null;
  targetCanisterId: string | null;
  targetPickupId: string | null;
  timer: number;
}

export type ShelfStyle =
  | 'produce'
  | 'snacks'
  | 'drinks'
  | 'fridge'
  | 'checkout'
  | 'bakery'
  | 'crate';

export type ArenaZoneId = 'grocery' | 'frozen' | 'warehouse' | 'vip_night';

export interface ArenaZoneConfig {
  id: ArenaZoneId;
  name: string;
  floorText: string;
  tileColorA: string;
  tileColorB: string;
  promoFill: string;
  promoStroke: string;
  stripeColor: string;
  wallColor: string;
  wallTrim: string;
  accentLine: string;
  ambientRgb: [number, number, number];
  emergencyRgb: [number, number, number];
  shelves: ShelfObstacle[];
  lights: LightSource[];
  icePatches?: Rect[];
  conveyors?: ConveyorBelt[];
}

export interface ShelfObstacle extends Rect {
  id: string;
  style: ShelfStyle;
  label: string;
  emissiveColor?: string;
  maxHp: number;
}

export interface DestructibleShelf extends ShelfObstacle {
  hp: number;
  destroyed: boolean;
  respawnTimer: number;
  hitFlashTimer: number;
  shakeTimer: number;
  popScale: number;
}

export interface LightSource {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
  flickerSpeed?: number;
  flickerPhase?: number;
  flickerMin?: number;
  dynamic?: boolean;
  ttl?: number;
  maxTtl?: number;
}

export interface Afterimage {
  active: boolean;
  x: number;
  y: number;
  angle: number;
  color: string;
  alpha: number;
  ttl: number;
  maxTtl: number;
  isPlayer: boolean;
  archetype?: EnemyArchetype;
  paletteIndex?: number;
  isBoss?: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  facingAngle: number;
  hp: number;
  maxHp: number;
  ghostHp: number;
  stamina: number;
  maxStamina: number;
  speed: number;
  damageMultiplier: number;
  critChance: number;
  vampMultiplier: number;
  shotgunPellets: number;
  maxCoins: number;
  coins: number;
  coinRegenTimer: number;
  shotgunCooldown: number;
  railCharge: number; // 0..100
  parryTimer: number;
  parryCooldown: number;
  parryHitDone: boolean;
  whiplashCooldown: number;
  frenzyTimer: number;
  chiliTimer: number;
  chiliTrailAccum: number;
  comboStep: number;
  comboResetTimer: number;
  attackTimer: number;
  attackPhase: 'idle' | 'windup' | 'active' | 'recovery';
  attackBufferTimer: number;
  dashTimer: number;
  dashCooldown: number;
  dashBufferTimer: number;
  dashDirX: number;
  dashDirY: number;
  invulnTimer: number;
  hitFlashTimer: number;
  squashX: number;
  squashY: number;
  walkDist: number;
  heldItem: PickupKind | null;
  hitEnemyIdsThisSwing: Set<string>;
}

export interface EnemyState {
  id: string;
  name: string;
  archetype: EnemyArchetype;
  isBoss: boolean;
  enraged: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  facingAngle: number;
  hp: number;
  maxHp: number;
  ghostHp: number;
  speed: number;
  damage: number;
  aiState: EnemyAIState;
  currentMove: EnemyMoveKind;
  moveComboLeft: number;
  parryableWindow: boolean;
  stateTimer: number;
  attackCooldown: number;
  dashCooldown: number;
  hasToken: boolean;
  chargeDirX: number;
  chargeDirY: number;
  strafeSign: number;
  hitFlashTimer: number;
  squashX: number;
  squashY: number;
  walkDist: number;
  paletteIndex: number;
  koTimer: number;
  didDealDamageThisSwing: boolean;
}

export interface Projectile {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  fromPlayer: boolean;
  parried: boolean;
  boosted: boolean;
  kind: 'can' | 'watermelon' | 'soda_bomb' | 'baguette' | 'pellet' | 'boost_pellet';
  spin: number;
  ttl: number;
  age: number;
}

export interface CoinEntity {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ttl: number;
  spin: number;
}

export interface ShockwaveRing {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  damage: number;
  fromPlayer: boolean;
  color: string;
  hitTarget: boolean;
}

export interface LaserBeam {
  active: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  ttl: number;
  maxTtl: number;
}

export interface PickupEntity {
  id: string;
  kind: PickupKind;
  x: number;
  y: number;
  bobPhase: number;
  ttl: number;
}

export interface ShoppingCart {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  hitFlash: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  alpha: number;
  ttl: number;
  maxTtl: number;
  gravity: number;
  drag: number;
  additive: boolean;
}

export interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  scale: number;
  ttl: number;
  maxTtl: number;
}

export interface UpgradeOption {
  id: string;
  title: string;
  subtitle: string;
  accentColor: string;
  iconKind: 'fist' | 'bolt' | 'croissant' | 'crit' | 'cart' | 'fridge';
}

export interface RunRecord {
  id: string;
  score: number;
  round: number;
  styleRank: StyleRank;
  zoneName: string;
  kos: number;
  parries: number;
  elapsedSeconds: number;
  timestamp: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  round: number;
  roundTitle: string;
  zoneId: ArenaZoneId;
  zoneName: string;
  isEmergencyLight: boolean;
  hp: number;
  maxHp: number;
  ghostHp: number;
  dashCharges: number;
  maxDashCharges: number;
  coinCount: number;
  maxCoins: number;
  railCharge: number;
  shotgunCooldownRatio: number;
  parryCooldownRatio: number;
  whiplashCooldownRatio: number;
  frenzySeconds: number;
  chiliSeconds: number;
  heldItem: PickupKind | null;
  score: number;
  bestScore: number;
  comboCount: number;
  styleRank: StyleRank;
  stylePoints: number;
  styleFeed: string[];
  opponentName: string | null;
  opponentTitle: string | null;
  opponentHp: number;
  opponentMaxHp: number;
  opponentGhostHp: number;
  opponentEnraged: boolean;
  kosTotal: number;
  parriesTotal: number;
  damageTaken: number;
  maxCombo: number;
  elapsedSeconds: number;
  upgradeChoices: UpgradeOption[];
  announcement: string | null;
  muted: boolean;
  isFullscreen: boolean;
  leaderboard: RunRecord[];
  isNewRecord: boolean;
}

export interface RoundEnemySpec {
  archetype: EnemyArchetype;
  name: string;
  isBoss: boolean;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  paletteIndex: number;
}

export interface RoundPlan {
  round: number;
  title: string;
  zoneId: ArenaZoneId;
  zoneName: string;
  isEmergencyLight: boolean;
  maxAttackTokens: number;
  enemies: RoundEnemySpec[];
}
