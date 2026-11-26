export type TouchControlId =
  | 'stick'
  | 'attack'
  | 'dash'
  | 'parry'
  | 'shotgun'
  | 'coin'
  | 'rail';

export type TouchHandedness = 'right' | 'left';

export interface TouchOffset {
  dx: number;
  dy: number;
}

export interface TouchLayoutConfig {
  scale: number;
  handedness: TouchHandedness;
  offsets: Record<TouchControlId, TouchOffset>;
}

const TOUCH_LAYOUT_STORAGE_KEY = 'kassoviy_raznos_touch_layout_v2';

export function createDefaultTouchLayout(): TouchLayoutConfig {
  return {
    scale: 1.15,
    handedness: 'right',
    offsets: {
      stick: { dx: 0, dy: 0 },
      attack: { dx: 0, dy: 0 },
      dash: { dx: 0, dy: 0 },
      parry: { dx: 0, dy: 0 },
      shotgun: { dx: 0, dy: 0 },
      coin: { dx: 0, dy: 0 },
      rail: { dx: 0, dy: 0 },
    },
  };
}

export function clampTouchScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1.15;
  return Math.max(0.85, Math.min(1.4, Number(scale.toFixed(2))));
}

export function clampTouchOffset(offset: TouchOffset): TouchOffset {
  const dx = Number.isFinite(offset.dx) ? Math.max(-160, Math.min(160, Math.round(offset.dx))) : 0;
  const dy = Number.isFinite(offset.dy) ? Math.max(-160, Math.min(160, Math.round(offset.dy))) : 0;
  return { dx, dy };
}

export function computeEffectiveTouchScale(
  scale: number,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 844,
  viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 390
): number {
  let factor = 1;
  if (viewportHeight < 500) {
    factor = Math.min(factor, 0.88);
  }
  if (viewportWidth < 460) {
    factor = Math.min(factor, Math.max(0.76, (viewportWidth - 28) / 425));
  }
  return Number((clampTouchScale(scale) * factor).toFixed(3));
}

export function loadTouchLayout(): TouchLayoutConfig {
  const def = createDefaultTouchLayout();
  if (typeof window === 'undefined') return def;
  try {
    const raw = localStorage.getItem(TOUCH_LAYOUT_STORAGE_KEY);
    if (!raw) return def;
    const parsed = JSON.parse(raw) as Partial<TouchLayoutConfig>;
    const handedness: TouchHandedness = parsed.handedness === 'left' ? 'left' : 'right';
    const scale = clampTouchScale(typeof parsed.scale === 'number' ? parsed.scale : def.scale);
    const offsets = { ...def.offsets };
    if (parsed.offsets && typeof parsed.offsets === 'object') {
      for (const key of Object.keys(def.offsets) as TouchControlId[]) {
        const candidate = parsed.offsets[key];
        if (candidate && typeof candidate.dx === 'number' && typeof candidate.dy === 'number') {
          offsets[key] = clampTouchOffset(candidate);
        }
      }
    }
    return { scale, handedness, offsets };
  } catch {
    return def;
  }
}

export function saveTouchLayout(config: TouchLayoutConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOUCH_LAYOUT_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}
