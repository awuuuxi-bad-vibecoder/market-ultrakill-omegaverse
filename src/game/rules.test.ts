import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyUpgradeToPlayer,
  circleIntersect,
  computeCoinRicochetChain,
  computePlayerHit,
  computeStyleRank,
  createDestructibleShelves,
  damageShelf,
  generateRoundEncounter,
  getZoneForRound,
  isInStrikeCone,
  pointToSegmentDist,
  predictLeadAngle,
  resolveCircleRect,
  tickShelfRespawn,
} from './rules';
import { ARENA_SHELVES } from './constants';
import {
  clampTouchOffset,
  clampTouchScale,
  computeEffectiveTouchScale,
  createDefaultTouchLayout,
} from './touchSettings';
import { PlayerState } from './types';

function makePlayer(): PlayerState {
  return {
    x: 384,
    y: 276,
    vx: 0,
    vy: 0,
    radius: 11,
    facingAngle: 0,
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
    dashDirX: 1,
    dashDirY: 0,
    invulnTimer: 0,
    hitFlashTimer: 0,
    squashX: 1,
    squashY: 1,
    walkDist: 0,
    heldItem: null,
    hitEnemyIdsThisSwing: new Set<string>(),
  };
}

test('generateRoundEncounter ALWAYS spawns strictly 1v1 duels with zone changes every 5 rounds', () => {
  for (const r of [1, 3, 5, 6, 10, 11, 16]) {
    const plan = generateRoundEncounter(r, r * 42);
    assert.equal(plan.enemies.length, 1);
  }
  assert.equal(getZoneForRound(1).id, 'grocery');
  assert.equal(getZoneForRound(5).id, 'grocery');
  assert.equal(getZoneForRound(6).id, 'frozen');
  assert.equal(getZoneForRound(10).id, 'frozen');
  assert.equal(getZoneForRound(11).id, 'warehouse');
  assert.equal(getZoneForRound(16).id, 'vip_night');
  assert.equal(getZoneForRound(21).id, 'grocery');

  const r5 = generateRoundEncounter(5, 10);
  assert.equal(r5.enemies[0].isBoss, true);
  assert.ok(r5.enemies[0].hp >= 1000);
});

test('destructible shelves break on damage and automatically regenerate after cooldown', () => {
  const shelves = createDestructibleShelves(ARENA_SHELVES);
  assert.ok(shelves.length >= 15);
  const crate = shelves.find((s) => s.style === 'crate')!;
  assert.equal(crate.destroyed, false);

  const broke = damageShelf(crate, 999);
  assert.equal(broke, true);
  assert.equal(crate.destroyed, true);
  assert.ok(crate.respawnTimer > 0);

  let respawned = false;
  for (let i = 0; i < 100; i++) {
    if (tickShelfRespawn(crate, 0.1)) {
      respawned = true;
    }
  }
  assert.equal(respawned, true);
  assert.equal(crate.destroyed, false);
  assert.equal(crate.hp, crate.maxHp);
});

test('pointToSegmentDist and predictLeadAngle work accurately', () => {
  assert.equal(pointToSegmentDist(50, 10, 0, 0, 100, 0), 10);
  assert.equal(pointToSegmentDist(150, 0, 0, 0, 100, 0), 50);

  const staticAng = predictLeadAngle(0, 0, 200, 0, 0, 0, 400, 1);
  const leadAng = predictLeadAngle(0, 0, 200, 0, 0, 200, 400, 1);
  assert.equal(staticAng, 0);
  assert.ok(leadAng > 0.25);
});

test('touchSettings clamps scales and offsets safely', () => {
  const def = createDefaultTouchLayout();
  assert.ok(def.scale >= 1.1);
  assert.equal(clampTouchScale(99), 1.4);
  assert.equal(clampTouchScale(0.1), 0.85);
  assert.deepEqual(clampTouchOffset({ dx: 999, dy: -999 }), { dx: 160, dy: -160 });
  assert.ok(computeEffectiveTouchScale(1.15, 390, 844) < 1.05);
  assert.ok(computeEffectiveTouchScale(1.15, 844, 390) <= 1.02);
  assert.equal(computeEffectiveTouchScale(1.15, 900, 700), 1.15);
});

test('computeStyleRank and coin ricochet chains work accurately', () => {
  assert.equal(computeStyleRank(950), 'ULTRA');
  const coins = [
    { active: true, x: 100, y: 100 },
    { active: true, x: 160, y: 110 },
  ];
  const res = computeCoinRicochetChain(0, coins, { x: 300, y: 180 });
  assert.deepEqual(res.coinIndices, [0, 1]);
  assert.ok(res.damage >= 75);
});

test('resolveCircleRect, circleIntersect, strike cone, and upgrades remain valid', () => {
  assert.equal(resolveCircleRect(95, 120, 10, { x: 100, y: 100, w: 50, h: 40 }).collided, true);
  assert.equal(circleIntersect(0, 0, 10, 15, 0, 6), true);
  assert.equal(isInStrikeCone(0, 0, 0, 28, 4, 10, 32, Math.PI * 0.4), true);

  const hit = computePlayerHit({
    baseDamage: 18,
    damageMultiplier: 1.0,
    comboStep: 3,
    critChance: 1.0,
    roll: 0.1,
  });
  assert.equal(hit.isCrit, true);

  const p = makePlayer();
  applyUpgradeToPlayer(p, 'turbo_sneakers');
  assert.equal(p.maxStamina, 400);
});

