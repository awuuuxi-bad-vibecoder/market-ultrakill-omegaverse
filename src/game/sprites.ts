import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ARENA_ZONES,
  ENEMY_PALETTES,
  PLAYER_PALETTE,
  TILE_SIZE,
  WALL_THICKNESS,
} from './constants';
import { ArenaZoneConfig, DestructibleShelf, EnemyArchetype, PickupKind, ShelfObstacle } from './types';

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function getPixelCtx(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/**
 * Generates ONLY the supermarket floor + walls for the given zone
 * so shelves can be rendered dynamically, smashed apart, and auto-restocked!
 */
export function buildArenaBackground(zone: ArenaZoneConfig = ARENA_ZONES[0]): HTMLCanvasElement {
  const canvas = makeCanvas(ARENA_WIDTH, ARENA_HEIGHT);
  const ctx = getPixelCtx(canvas);

  for (let ty = 0; ty < ARENA_HEIGHT; ty += TILE_SIZE) {
    for (let tx = 0; tx < ARENA_WIDTH; tx += TILE_SIZE) {
      const checker = ((tx / TILE_SIZE) + (ty / TILE_SIZE)) % 2 === 0;
      ctx.fillStyle = checker ? zone.tileColorA : zone.tileColorB;
      ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

      ctx.fillStyle = zone.id === 'vip_night' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.06)';
      ctx.fillRect(tx, ty, TILE_SIZE, 1);
      ctx.fillRect(tx, ty, 1, TILE_SIZE);

      const hash = (tx * 73 + ty * 37) % 19;
      if (hash < 4) {
        ctx.fillStyle = zone.id === 'frozen' ? 'rgba(224, 242, 254, 0.36)' : 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(tx + (hash * 3 + 2), ty + ((hash * 5 + 3) % 12), 2, 2);
      } else if (hash === 7) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
        ctx.fillRect(tx + 9, ty + 11, 2, 2);
      }
    }
  }

  // Zone-specific floor markings
  if (zone.id === 'frozen') {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.fillRect(156, 86, 456, 340);
    if (zone.icePatches) {
      for (const patch of zone.icePatches) {
        ctx.fillStyle = 'rgba(186, 230, 253, 0.56)';
        ctx.fillRect(patch.x, patch.y, patch.w, patch.h);
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
        ctx.lineWidth = 2;
        ctx.strokeRect(patch.x + 1, patch.y + 1, patch.w - 2, patch.h - 2);
        // Glossy diagonal ice sheen strips
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        for (let sx = patch.x + 10; sx < patch.x + patch.w - 18; sx += 26) {
          ctx.fillRect(sx, patch.y + 8, 12, 3);
          ctx.fillRect(sx + 6, patch.y + 13, 8, 2);
          ctx.fillRect(sx + 2, patch.y + patch.h - 14, 10, 3);
        }
      }
    }
  } else if (zone.id === 'warehouse') {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
    for (let x = 80; x < ARENA_WIDTH - 80; x += 28) {
      ctx.fillRect(x, 252, 14, 6);
    }
    if (zone.conveyors) {
      for (const belt of zone.conveyors) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(belt.x - 2, belt.y - 2, belt.w + 4, belt.h + 4);
        ctx.fillStyle = '#334155';
        ctx.fillRect(belt.x, belt.y, belt.w, belt.h);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(belt.x, belt.y, belt.w, 2);
        ctx.fillRect(belt.x, belt.y + belt.h - 2, belt.w, 2);
      }
    }
  }

  // Central combat promo zone
  ctx.fillStyle = zone.promoFill;
  ctx.fillRect(236, 92, 296, 326);
  ctx.strokeStyle = zone.promoStroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(237, 93, 294, 324);

  // Hazard floor stripes
  ctx.fillStyle = zone.stripeColor;
  for (let x = 76; x < ARENA_WIDTH - 76; x += 12) {
    ctx.fillRect(x, 70, 6, 2);
    ctx.fillRect(x, 434, 6, 2);
  }

  // Center floor seal
  ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.fillRect(334, 232, 100, 44);
  ctx.fillStyle = zone.promoStroke;
  ctx.fillRect(336, 234, 96, 40);
  ctx.fillStyle = zone.id === 'vip_night' ? '#fdf4ff' : 'rgba(15, 23, 42, 0.72)';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(zone.floorText, 384, 257);

  // Perimeter store walls
  ctx.fillStyle = zone.wallColor;
  ctx.fillRect(0, 0, ARENA_WIDTH, WALL_THICKNESS);
  ctx.fillRect(0, ARENA_HEIGHT - WALL_THICKNESS, ARENA_WIDTH, WALL_THICKNESS);
  ctx.fillRect(0, 0, WALL_THICKNESS, ARENA_HEIGHT);
  ctx.fillRect(ARENA_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, ARENA_HEIGHT);

  ctx.fillStyle = zone.wallTrim;
  ctx.fillRect(WALL_THICKNESS - 4, WALL_THICKNESS - 4, ARENA_WIDTH - WALL_THICKNESS * 2 + 8, 4);
  ctx.fillRect(WALL_THICKNESS - 4, ARENA_HEIGHT - WALL_THICKNESS, ARENA_WIDTH - WALL_THICKNESS * 2 + 8, 4);
  ctx.fillRect(WALL_THICKNESS - 4, WALL_THICKNESS, 4, ARENA_HEIGHT - WALL_THICKNESS * 2);
  ctx.fillRect(ARENA_WIDTH - WALL_THICKNESS, WALL_THICKNESS, 4, ARENA_HEIGHT - WALL_THICKNESS * 2);

  ctx.fillStyle = zone.accentLine;
  ctx.fillRect(WALL_THICKNESS, WALL_THICKNESS - 7, ARENA_WIDTH - WALL_THICKNESS * 2, 2);

  return canvas;
}


export function buildShelfSprite(shelf: ShelfObstacle): HTMLCanvasElement {
  const pad = 2;
  const c = makeCanvas(shelf.w + pad * 2, shelf.h + pad * 2);
  const ctx = getPixelCtx(c);
  const x = pad;
  const y = pad;
  const { w, h, style } = shelf;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);

  if (style === 'crate') {
    // Wooden supermarket produce crate / pallet
    ctx.fillStyle = '#92400e';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x + 4, y + Math.floor(h / 2) - 1, w - 8, 2);
    ctx.fillRect(x + Math.floor(w / 2) - 1, y + 4, 2, h - 8);
    // Bright fruit/cans peeking on top
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x + 5, y + 5, 6, 6);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + w - 12, y + 5, 6, 6);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x + 6, y + h - 11, 6, 6);
    return c;
  }

  if (style === 'fridge') {
    ctx.fillStyle = '#334155';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#475569';
    ctx.fillRect(x + 2, y + 2, w - 4, h - 10);

    const bays = 4;
    const bayW = Math.floor((w - 12) / bays);
    for (let i = 0; i < bays; i++) {
      const bx = x + 4 + i * (bayW + 2);
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(bx, y + h - 11, bayW, 7);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(bx + 2, y + h - 10, bayW - 4, 2);
      ctx.fillStyle = i % 2 === 0 ? '#e0f2fe' : '#fde047';
      for (let k = 0; k < bayW - 6; k += 5) {
        ctx.fillRect(bx + 3 + k, y + 6, 3, 6);
      }
    }
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x + 2, y + h - 3, w - 4, 2);
    return c;
  }

  if (style === 'checkout') {
    ctx.fillStyle = '#475569';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 6, y + 5, w - 46, h - 14);
    ctx.fillStyle = '#334155';
    for (let cx = x + 10; cx < x + w - 44; cx += 10) {
      ctx.fillRect(cx, y + 6, 2, h - 16);
    }
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + w - 34, y + 4, 26, 16);
    ctx.fillStyle = shelf.emissiveColor ?? '#fbbf24';
    ctx.fillRect(x + w - 31, y + 6, 20, 9);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x, y + h - 7, w, 7);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(x, y + h - 3, w, 3);
    return c;
  }

  // Standard gondola shelf / promo rack
  ctx.fillStyle = '#64748b';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 10);

  ctx.fillStyle = '#334155';
  ctx.fillRect(x + 2, y + Math.floor((h - 8) / 2), w - 4, 2);

  ctx.fillStyle = '#334155';
  ctx.fillRect(x, y + h - 7, w, 7);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(x + 4, y + h - 5, w - 8, 2);

  const itemColors: Record<string, string[]> = {
    produce: ['#22c55e', '#ef4444', '#f97316', '#eab308'],
    snacks: ['#ef4444', '#3b82f6', '#facc15', '#ec4899'],
    drinks: ['#06b6d4', '#ef4444', '#22c55e', '#f59e0b'],
    bakery: ['#f59e0b', '#d97706', '#fde68a', '#b45309'],
  };
  const palette = itemColors[style] ?? itemColors.snacks;

  for (let px = x + 5; px < x + w - 9; px += 9) {
    const colA = palette[(px / 9) % palette.length | 0];
    const colB = palette[((px / 9) + 2) % palette.length | 0];
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px, y + 4, 7, 6);
    ctx.fillStyle = colA;
    ctx.fillRect(px + 1, y + 5, 5, 4);
    if (h >= 30) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px, y + 14, 7, 6);
      ctx.fillStyle = colB;
      ctx.fillRect(px + 1, y + 15, 5, 4);
    }
  }

  return c;
}

export interface CharacterSpriteSet {
  normal: HTMLCanvasElement;
  flash: HTMLCanvasElement;
}

function makeFlashCopy(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = makeCanvas(src.width, src.height);
  const ctx = getPixelCtx(c);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function buildTopDownFighterCanvas(opts: {
  bodyColor: string;
  bodyShade: string;
  headColor: string;
  accentColor: string;
  scale: number;
  hasCart?: boolean;
  isBoss?: boolean;
  isPlayer?: boolean;
}): CharacterSpriteSet {
  const size = opts.hasCart ? 36 : 28;
  const c = makeCanvas(size, size);
  const ctx = getPixelCtx(c);
  const cx = Math.floor(size / 2) - (opts.hasCart ? 4 : 0);
  const cy = Math.floor(size / 2);

  const pxRect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  if (opts.hasCart) {
    pxRect(cx + 5, cy - 8, 13, 16, '#0f172a');
    pxRect(cx + 6, cy - 7, 11, 14, '#94a3b8');
    pxRect(cx + 8, cy - 5, 7, 10, '#475569');
    pxRect(cx + 10, cy - 5, 1, 10, '#cbd5e1');
    pxRect(cx + 13, cy - 5, 1, 10, '#cbd5e1');
    pxRect(cx + 4, cy - 7, 2, 14, '#ef4444');
  }

  const sw = Math.round(12 * opts.scale);
  const sh = Math.round(16 * opts.scale);
  pxRect(cx - sw / 2 - 1, cy - sh / 2 - 1, sw + 2, sh + 2, '#0f172a');
  pxRect(cx - sw / 2, cy - sh / 2, sw, sh, opts.bodyColor);
  pxRect(cx - sw / 2, cy, sw, sh / 2, opts.bodyShade);

  if (opts.isPlayer) {
    pxRect(cx - 2, cy - sh / 2 + 2, 5, sh - 4, '#ffffff');
    pxRect(cx + 1, cy - 3, 4, 6, '#facc15');
  } else if (opts.isBoss) {
    pxRect(cx + 1, cy - 2, 5, 4, '#facc15');
  } else {
    pxRect(cx - sw / 2, cy - 3, 3, 6, opts.accentColor);
  }

  pxRect(cx + 2, cy - sh / 2 - 3, 6, 5, '#0f172a');
  pxRect(cx + 3, cy - sh / 2 - 2, 4, 3, '#f6c8a6');
  pxRect(cx + 2, cy + sh / 2 - 2, 6, 5, '#0f172a');
  pxRect(cx + 3, cy + sh / 2 - 1, 4, 3, '#f6c8a6');

  pxRect(cx - 5, cy - 5, 10, 10, '#0f172a');
  pxRect(cx - 4, cy - 4, 8, 8, '#f6c8a6');
  pxRect(cx - 5, cy - 4, 5, 8, opts.headColor);
  if (opts.isPlayer) {
    pxRect(cx + 2, cy - 3, 4, 6, '#d97706');
    pxRect(cx - 4, cy - 4, 7, 8, '#fbbf24');
  } else if (opts.isBoss) {
    pxRect(cx - 2, cy - 5, 5, 10, '#facc15');
  }

  return {
    normal: c,
    flash: makeFlashCopy(c),
  };
}

export interface SpriteAtlas {
  arenaBg: HTMLCanvasElement;
  shelfSprites: Record<string, { normal: HTMLCanvasElement; flash: HTMLCanvasElement }>;
  player: CharacterSpriteSet;
  enemies: Record<string, CharacterSpriteSet>;
  cart: HTMLCanvasElement;
  canister: CharacterSpriteSet;
  items: Record<PickupKind, HTMLCanvasElement>;
}

function buildCartSprite(): HTMLCanvasElement {
  const c = makeCanvas(22, 18);
  const ctx = getPixelCtx(c);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(2, 1, 18, 16);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(3, 2, 16, 14);
  ctx.fillStyle = '#475569';
  ctx.fillRect(5, 4, 11, 10);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(8, 4, 1, 10);
  ctx.fillRect(12, 4, 1, 10);
  ctx.fillRect(5, 8, 11, 1);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(1, 2, 3, 14);
  return c;
}

function buildPickupSprites(): Record<PickupKind, HTMLCanvasElement> {
  const makeItem = (draw: (ctx: CanvasRenderingContext2D) => void) => {
    const c = makeCanvas(16, 16);
    const ctx = getPixelCtx(c);
    draw(ctx);
    return c;
  };

  return {
    watermelon: makeItem((ctx) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(3, 3, 10, 10);
      ctx.fillStyle = '#14532d';
      ctx.fillRect(5, 3, 2, 10);
      ctx.fillRect(9, 3, 2, 10);
      ctx.fillStyle = '#86efac';
      ctx.fillRect(4, 4, 2, 3);
    }),
    baguette: makeItem((ctx) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(1, 5, 14, 6);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(2, 6, 12, 4);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(4, 6, 2, 3);
      ctx.fillRect(8, 6, 2, 3);
      ctx.fillRect(11, 6, 2, 3);
    }),
    soda_bomb: makeItem((ctx) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(3, 2, 10, 12);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(4, 3, 8, 10);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(4, 3, 8, 2);
      ctx.fillRect(6, 6, 4, 4);
    }),
    energy_drink: makeItem((ctx) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(4, 2, 8, 12);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(5, 3, 6, 10);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(7, 5, 2, 6);
    }),
    croissant: makeItem((ctx) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(2, 4, 12, 8);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(3, 5, 10, 6);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(6, 5, 4, 2);
    }),
    buff_frenzy: makeItem((ctx) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(3, 1, 10, 14);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(4, 2, 8, 12);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(7, 3, 3, 4);
      ctx.fillRect(6, 7, 3, 5);
    }),
    buff_chili: makeItem((ctx) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(3, 3, 10, 11);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(4, 5, 8, 7);
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(6, 8, 5, 4);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(6, 2, 4, 3);
    }),
    buff_coin: makeItem((ctx) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(3, 3, 10, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(5, 4, 6, 3);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(7, 5, 2, 6);
    }),
  };
}

function buildCanisterSprite(): CharacterSpriteSet {
  const c = makeCanvas(18, 20);
  const ctx = getPixelCtx(c);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(3, 2, 12, 16);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(4, 4, 10, 13);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(5, 5, 4, 10);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(6, 1, 6, 3);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(4, 9, 10, 3);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(7, 10, 4, 1);
  return {
    normal: c,
    flash: makeFlashCopy(c),
  };
}

export function buildShelfSpriteMap(
  shelves: DestructibleShelf[] | ShelfObstacle[]
): Record<string, { normal: HTMLCanvasElement; flash: HTMLCanvasElement }> {
  const shelfSprites: Record<string, { normal: HTMLCanvasElement; flash: HTMLCanvasElement }> = {};
  for (const s of shelves) {
    const normal = buildShelfSprite(s);
    shelfSprites[s.id] = { normal, flash: makeFlashCopy(normal) };
  }
  return shelfSprites;
}

export function createSpriteAtlas(
  shelves: DestructibleShelf[] | ShelfObstacle[],
  zone: ArenaZoneConfig = ARENA_ZONES[0]
): SpriteAtlas {
  const arenaBg = buildArenaBackground(zone);
  const shelfSprites = buildShelfSpriteMap(shelves);

  const player = buildTopDownFighterCanvas({
    bodyColor: PLAYER_PALETTE.vest,
    bodyShade: PLAYER_PALETTE.vestShade,
    headColor: PLAYER_PALETTE.cap,
    accentColor: '#facc15',
    scale: 1.0,
    isPlayer: true,
  });

  const enemies: Record<string, CharacterSpriteSet> = {};
  const archetypes: EnemyArchetype[] = ['brawler', 'charger', 'thrower', 'heavy', 'flanker'];

  for (const arch of archetypes) {
    for (let p = 0; p < ENEMY_PALETTES.length; p++) {
      const pal = ENEMY_PALETTES[p];
      for (const isBoss of [false, true]) {
        const key = `${arch}-${p}-${isBoss ? 1 : 0}`;
        enemies[key] = buildTopDownFighterCanvas({
          bodyColor: pal.jacket,
          bodyShade: pal.jacketShade,
          headColor: pal.hair,
          accentColor: pal.accent,
          scale: arch === 'heavy' ? 1.25 : arch === 'flanker' ? 0.92 : 1.0,
          hasCart: arch === 'charger',
          isBoss,
        });
      }
    }
  }

  return {
    arenaBg,
    shelfSprites,
    player,
    enemies,
    cart: buildCartSprite(),
    canister: buildCanisterSprite(),
    items: buildPickupSprites(),
  };
}
