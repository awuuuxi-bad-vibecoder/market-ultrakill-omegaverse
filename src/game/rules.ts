import {
  ARENA_ZONES,
  BOSS_NAMES,
  CANISTER_RESPAWN_DELAY,
  ENEMY_PALETTES,
  ROUND_TITLES,
  SHELF_RESPAWN_DELAY,
  SHOPPER_NAMES,
  UPGRADE_CATALOG,
} from './constants';
import {
  ArenaZoneConfig,
  CoinEntity,
  DestructibleShelf,
  EnemyArchetype,
  EnemyState,
  ExplosiveCanister,
  PlayerState,
  Rect,
  RoundEnemySpec,
  RoundPlan,
  RunRecord,
  ShelfObstacle,
  StyleRank,
  UpgradeOption,
} from './types';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function angleDiff(a: number, b: number): number {
  return normalizeAngle(b - a);
}

export function pointInRect(px: number, py: number, rect: Rect): boolean {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

export function isPointOnIce(px: number, py: number, zone: ArenaZoneConfig): boolean {
  if (!zone.icePatches || zone.icePatches.length === 0) return false;
  for (const patch of zone.icePatches) {
    if (pointInRect(px, py, patch)) return true;
  }
  return false;
}

export function getConveyorPushAt(px: number, py: number, zone: ArenaZoneConfig): { vx: number; vy: number } {
  if (!zone.conveyors || zone.conveyors.length === 0) return { vx: 0, vy: 0 };
  for (const belt of zone.conveyors) {
    if (pointInRect(px, py, belt)) {
      return { vx: belt.vx, vy: belt.vy };
    }
  }
  return { vx: 0, vy: 0 };
}

export function computeWhiplashMode(
  enemy: Pick<EnemyState, 'archetype' | 'isBoss'>
): 'pull_player' | 'pull_enemy' {
  if (enemy.isBoss || enemy.archetype === 'heavy' || enemy.archetype === 'charger') {
    return 'pull_player';
  }
  return 'pull_enemy';
}

export function tickCanisterRespawn(canister: ExplosiveCanister, dt: number): boolean {
  canister.hitFlashTimer = Math.max(0, canister.hitFlashTimer - dt);
  if (!canister.destroyed) return false;
  canister.respawnTimer -= dt;
  if (canister.respawnTimer <= 0) {
    canister.destroyed = false;
    canister.hp = canister.maxHp;
    canister.respawnTimer = 0;
    canister.hitFlashTimer = 0.14;
    return true;
  }
  return false;
}

export function sortRunLeaderboard(records: RunRecord[], maxEntries = 6): RunRecord[] {
  return [...records]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.round !== a.round) return b.round - a.round;
      return b.timestamp - a.timestamp;
    })
    .slice(0, maxEntries);
}

export function resolveCircleRect(
  cx: number,
  cy: number,
  r: number,
  rect: Rect
): { x: number; y: number; collided: boolean; nx: number; ny: number } {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= r * r) {
    return { x: cx, y: cy, collided: false, nx: 0, ny: 0 };
  }

  if (distSq > 0.0001) {
    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = r - dist;
    return {
      x: cx + nx * overlap,
      y: cy + ny * overlap,
      collided: true,
      nx,
      ny,
    };
  }

  const leftPen = cx - rect.x;
  const rightPen = rect.x + rect.w - cx;
  const topPen = cy - rect.y;
  const bottomPen = rect.y + rect.h - cy;
  const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);

  if (minPen === leftPen) return { x: rect.x - r, y: cy, collided: true, nx: -1, ny: 0 };
  if (minPen === rightPen) return { x: rect.x + rect.w + r, y: cy, collided: true, nx: 1, ny: 0 };
  if (minPen === topPen) return { x: cx, y: rect.y - r, collided: true, nx: 0, ny: -1 };
  return { x: cx, y: rect.y + rect.h + r, collided: true, nx: 0, ny: 1 };
}

export function circleIntersect(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const sumR = ar + br;
  return dx * dx + dy * dy <= sumR * sumR;
}

export function isInStrikeCone(
  attackerX: number,
  attackerY: number,
  aimAngle: number,
  targetX: number,
  targetY: number,
  targetRadius: number,
  reach: number,
  halfArcRad: number
): boolean {
  const dx = targetX - attackerX;
  const dy = targetY - attackerY;
  const dist = Math.hypot(dx, dy);
  if (dist > reach + targetRadius) return false;
  if (dist <= targetRadius + 8) return true;
  const targetAngle = Math.atan2(dy, dx);
  return Math.abs(angleDiff(aimAngle, targetAngle)) <= halfArcRad;
}

export function pointToSegmentDist(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.0001) return Math.hypot(px - x1, py - y1);
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function createDestructibleShelves(defs: ShelfObstacle[]): DestructibleShelf[] {
  return defs.map((s) => ({
    ...s,
    hp: s.maxHp,
    destroyed: false,
    respawnTimer: 0,
    hitFlashTimer: 0,
    shakeTimer: 0,
    popScale: 1,
  }));
}

export function damageShelf(shelf: DestructibleShelf, dmg: number): boolean {
  if (shelf.destroyed) return false;
  shelf.hp = Math.max(0, shelf.hp - dmg);
  shelf.hitFlashTimer = 0.08;
  shelf.shakeTimer = 0.14;
  if (shelf.hp <= 0) {
    shelf.destroyed = true;
    shelf.respawnTimer = SHELF_RESPAWN_DELAY;
    shelf.popScale = 0.1;
    return true;
  }
  return false;
}

export function damageCanister(canister: ExplosiveCanister, dmg: number): boolean {
  if (canister.destroyed) return false;
  canister.hp = Math.max(0, canister.hp - dmg);
  canister.hitFlashTimer = 0.1;
  if (canister.hp <= 0) {
    canister.destroyed = true;
    canister.respawnTimer = CANISTER_RESPAWN_DELAY;
    return true;
  }
  return false;
}

export function tickShelfRespawn(shelf: DestructibleShelf, dt: number): boolean {
  shelf.hitFlashTimer = Math.max(0, shelf.hitFlashTimer - dt);
  shelf.shakeTimer = Math.max(0, shelf.shakeTimer - dt);
  if (!shelf.destroyed) {
    shelf.popScale = lerp(shelf.popScale, 1, Math.min(1, dt * 14));
    return false;
  }
  shelf.respawnTimer -= dt;
  if (shelf.respawnTimer <= 0) {
    shelf.destroyed = false;
    shelf.hp = shelf.maxHp;
    shelf.respawnTimer = 0;
    shelf.popScale = 0.25;
    shelf.hitFlashTimer = 0.12;
    return true;
  }
  return false;
}

export interface HitCalculationInput {
  baseDamage: number;
  damageMultiplier: number;
  comboStep: number;
  critChance: number;
  roll: number;
}

export interface HitCalculationResult {
  damage: number;
  isCrit: boolean;
  knockback: number;
}

export function computePlayerHit(input: HitCalculationInput): HitCalculationResult {
  const comboBonus =
    input.comboStep >= 3
      ? 1.75
      : input.comboStep === 2
        ? 1.35
        : input.comboStep === 1
          ? 1.15
          : 1.0;
  const isCrit = input.roll < input.critChance;
  const critMult = isCrit ? 1.8 : 1.0;
  const raw = input.baseDamage * input.damageMultiplier * comboBonus * critMult;
  const damage = Math.max(1, Math.round(raw));
  const knockback = (input.comboStep >= 3 ? 290 : 150) * (isCrit ? 1.2 : 1.0);
  return { damage, isCrit, knockback };
}

export function computeStyleRank(points: number): StyleRank {
  if (points >= 900) return 'ULTRA';
  if (points >= 680) return 'SSS';
  if (points >= 500) return 'SS';
  if (points >= 340) return 'S';
  if (points >= 210) return 'A';
  if (points >= 115) return 'B';
  if (points >= 45) return 'C';
  return 'D';
}

export function computeCoinRicochetChain(
  startCoinIndex: number,
  coins: Pick<CoinEntity, 'active' | 'x' | 'y'>[],
  enemy: { x: number; y: number }
): { chainPoints: { x: number; y: number }[]; coinIndices: number[]; damage: number } {
  const visited = new Set<number>([startCoinIndex]);
  const startCoin = coins[startCoinIndex];
  const chainPoints: { x: number; y: number }[] = [{ x: startCoin.x, y: startCoin.y }];
  const coinIndices: number[] = [startCoinIndex];

  let curX = startCoin.x;
  let curY = startCoin.y;

  for (let step = 0; step < coins.length; step++) {
    let bestIdx = -1;
    let bestDist = 460;
    for (let i = 0; i < coins.length; i++) {
      if (visited.has(i) || !coins[i].active) continue;
      const d = Math.hypot(coins[i].x - curX, coins[i].y - curY);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    visited.add(bestIdx);
    coinIndices.push(bestIdx);
    curX = coins[bestIdx].x;
    curY = coins[bestIdx].y;
    chainPoints.push({ x: curX, y: curY });
  }

  chainPoints.push({ x: enemy.x, y: enemy.y });
  const bounces = coinIndices.length;
  const damage = 44 + (bounces - 1) * 34;
  return { chainPoints, coinIndices, damage };
}

function pickFrom<T>(arr: T[], seed: number): T {
  const idx = Math.abs(Math.floor(seed)) % arr.length;
  return arr[idx];
}

export function getZoneForRound(round: number): ArenaZoneConfig {
  const r = Math.max(1, Math.floor(round));
  const idx = Math.floor((r - 1) / 5) % ARENA_ZONES.length;
  return ARENA_ZONES[idx];
}

export function predictLeadAngle(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  tvx: number,
  tvy: number,
  projectileSpeed: number,
  leadWeight: number
): number {
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.hypot(dx, dy);
  const t = clamp(dist / Math.max(120, projectileSpeed), 0, 0.5) * leadWeight;
  return Math.atan2(ty + tvy * t - sy, tx + tvx * t - sx);
}

export function createEnemySpec(
  archetype: EnemyArchetype,
  round: number,
  isBoss: boolean,
  seed: number
): RoundEnemySpec {
  const isZoneBoss = round % 5 === 0;
  const zone = getZoneForRound(round);
  const zoneIndex = ARENA_ZONES.findIndex((z) => z.id === zone.id);
  const roundScale = 1 + (round - 1) * 0.42;
  const speedScale = 1 + Math.min(0.88, (round - 1) * 0.095);

  const zoneBossArchetypes: Record<string, EnemyArchetype> = {
    grocery: 'brawler',
    frozen: 'heavy',
    warehouse: 'charger',
    vip_night: 'flanker',
  };

  const finalArchetype = isZoneBoss ? (zoneBossArchetypes[zone.id] ?? archetype) : archetype;

  const baseByArchetype: Record<
    EnemyArchetype,
    { hp: number; speed: number; damage: number; radius: number }
  > = {
    brawler: { hp: 370, speed: 146, damage: 16, radius: 12 },
    charger: { hp: 400, speed: 134, damage: 19, radius: 13 },
    thrower: { hp: 335, speed: 140, damage: 15, radius: 11 },
    heavy: { hp: 500, speed: 114, damage: 23, radius: 15 },
    flanker: { hp: 345, speed: 176, damage: 15, radius: 11 },
  };

  const base = baseByArchetype[finalArchetype];
  const bossMultHp = isZoneBoss ? 1.72 : isBoss ? 1.48 : 1.0;
  const bossMultDmg = isZoneBoss ? 1.24 : isBoss ? 1.15 : 1.0;
  const namePool = SHOPPER_NAMES[finalArchetype] ?? SHOPPER_NAMES.brawler;

  const bossName = isZoneBoss
    ? BOSS_NAMES[Math.max(0, zoneIndex) % BOSS_NAMES.length]
    : pickFrom(BOSS_NAMES, seed);

  return {
    archetype: finalArchetype,
    name: isBoss ? bossName : pickFrom(namePool, seed),
    isBoss,
    hp: Math.round(base.hp * roundScale * bossMultHp),
    speed: Math.round(base.speed * speedScale * (isZoneBoss ? 1.14 : isBoss ? 1.08 : 1.0)),
    damage: Math.round(base.damage * (1 + (round - 1) * 0.11) * bossMultDmg),
    radius: isBoss ? base.radius + 3 : base.radius,
    paletteIndex: Math.abs(Math.floor(seed)) % ENEMY_PALETTES.length,
  };
}

export function generateRoundEncounter(round: number, seed = round * 1337): RoundPlan {
  const r = Math.max(1, Math.floor(round));
  const zone = getZoneForRound(r);
  const title = ROUND_TITLES[(r - 1) % ROUND_TITLES.length];
  const isEmergencyLight = r >= 3 && r % 2 === 1;
  const isBossRound = r % 5 === 0 || r % 3 === 0;

  const pool: EnemyArchetype[] = ['brawler', 'flanker', 'charger', 'thrower', 'heavy'];
  const archetype: EnemyArchetype =
    r === 1
      ? seed % 2 === 0
        ? 'brawler'
        : 'flanker'
      : pool[(seed + r * 3) % pool.length];

  return {
    round: r,
    title,
    zoneId: zone.id,
    zoneName: zone.name,
    isEmergencyLight,
    maxAttackTokens: 1,
    enemies: [createEnemySpec(archetype, r, isBossRound, seed)],
  };
}

export function allocateAttackTokens(
  enemies: Pick<EnemyState, 'id' | 'x' | 'y' | 'aiState' | 'hasToken' | 'attackCooldown'>[],
  playerX: number,
  playerY: number,
  maxTokens: number
): Set<string> {
  const activeTokenIds = new Set<string>();
  for (const e of enemies) {
    if (e.aiState === 'ko') continue;
    if (e.hasToken && (e.aiState === 'windup' || e.aiState === 'attack')) {
      activeTokenIds.add(e.id);
    }
  }

  if (activeTokenIds.size >= maxTokens) {
    return activeTokenIds;
  }

  const candidates = enemies
    .filter((e) => e.aiState === 'seek' && e.attackCooldown <= 0 && !activeTokenIds.has(e.id))
    .map((e) => ({
      id: e.id,
      distSq: (e.x - playerX) ** 2 + (e.y - playerY) ** 2,
    }))
    .sort((a, b) => a.distSq - b.distSq);

  for (const c of candidates) {
    if (activeTokenIds.size >= maxTokens) break;
    activeTokenIds.add(c.id);
  }

  return activeTokenIds;
}

export function pickUpgradeChoices(seed: number): UpgradeOption[] {
  const copy = [...UPGRADE_CATALOG];
  let s = Math.abs(Math.floor(seed)) + 1;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, 3);
}

export function applyUpgradeToPlayer(player: PlayerState, upgradeId: string): void {
  switch (upgradeId) {
    case 'tape_fists':
      player.damageMultiplier = Number((player.damageMultiplier + 0.25).toFixed(2));
      break;
    case 'extra_coin':
      player.maxCoins += 1;
      player.coins = player.maxCoins;
      player.railCharge = 100;
      break;
    case 'hot_shotgun':
      player.shotgunPellets += 3;
      break;
    case 'juice_vamp':
      player.vampMultiplier = Number((player.vampMultiplier + 0.65).toFixed(2));
      break;
    case 'turbo_sneakers':
      player.speed = Math.round(player.speed * 1.15);
      player.maxStamina += 100;
      player.stamina = player.maxStamina;
      break;
    case 'steel_apron':
      player.maxHp += 40;
      player.hp = player.maxHp;
      player.ghostHp = player.maxHp;
      break;
    default:
      break;
  }
}
