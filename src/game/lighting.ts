import { ARENA_HEIGHT, ARENA_WIDTH, ARENA_ZONES } from './constants';
import { ArenaZoneConfig, LightSource } from './types';

/**
 * Ultra-fast Mobile-Optimized 2D Dynamic Lighting Renderer.
 * - Pre-bakes 64x64 radial glow sprites once per color (ZERO createRadialGradient calls per frame!).
 * - Pre-bakes non-flickering zone lights into a static offscreen buffer on zone transitions.
 * - Composites 1/4-resolution lightmap via 'multiply' + subtle additive bloom for flashes.
 */
export class LightingSystem {
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  private staticLightCanvas: HTMLCanvasElement;
  private staticLightCtx: CanvasRenderingContext2D;
  private readonly scale = 0.25;
  private dynamicLights: LightSource[] = [];
  private lightSeq = 0;
  private lightStamps = new Map<string, HTMLCanvasElement>();
  private zone: ArenaZoneConfig = ARENA_ZONES[0];
  private flickeringLights: LightSource[] = [];

  constructor() {
    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = Math.round(ARENA_WIDTH * this.scale);
    this.lightCanvas.height = Math.round(ARENA_HEIGHT * this.scale);
    this.lightCtx = this.lightCanvas.getContext('2d', { alpha: false })!;

    this.staticLightCanvas = document.createElement('canvas');
    this.staticLightCanvas.width = this.lightCanvas.width;
    this.staticLightCanvas.height = this.lightCanvas.height;
    this.staticLightCtx = this.staticLightCanvas.getContext('2d')!;

    this.setZone(ARENA_ZONES[0]);
  }

  public setZone(zone: ArenaZoneConfig): void {
    this.zone = zone;
    this.flickeringLights = [];

    const sctx = this.staticLightCtx;
    sctx.clearRect(0, 0, this.staticLightCanvas.width, this.staticLightCanvas.height);
    sctx.globalCompositeOperation = 'lighter';

    for (const light of zone.lights) {
      if (light.flickerSpeed || light.id.startsWith('tube-')) {
        this.flickeringLights.push(light);
      } else {
        this.blitLight(
          sctx,
          light.x * this.scale,
          light.y * this.scale,
          light.radius * this.scale,
          light.color,
          light.intensity
        );
      }
    }
    sctx.globalAlpha = 1;
    sctx.globalCompositeOperation = 'source-over';
  }

  public spawnFlash(
    x: number,
    y: number,
    color: string,
    radius = 95,
    intensity = 0.95,
    ttl = 0.16
  ): void {
    if (this.dynamicLights.length >= 8) {
      this.dynamicLights.shift();
    }
    this.dynamicLights.push({
      id: `dyn-${++this.lightSeq}`,
      x,
      y,
      radius,
      color,
      intensity,
      dynamic: true,
      ttl,
      maxTtl: ttl,
    });
  }

  public update(dt: number): void {
    for (let i = this.dynamicLights.length - 1; i >= 0; i--) {
      const l = this.dynamicLights[i];
      if (l.ttl !== undefined) {
        l.ttl -= dt;
        if (l.ttl <= 0) {
          this.dynamicLights.splice(i, 1);
        }
      }
    }
  }

  public render(
    targetCtx: CanvasRenderingContext2D,
    timeSec: number,
    playerX: number,
    playerY: number,
    isEmergencyLight: boolean
  ): void {
    const lctx = this.lightCtx;
    const lw = this.lightCanvas.width;
    const lh = this.lightCanvas.height;
    const s = this.scale;

    // 1. Ambient base fill (zone-themed or pulsing emergency blackout)
    lctx.globalCompositeOperation = 'source-over';
    lctx.globalAlpha = 1;
    if (isEmergencyLight) {
      const alarm = 0.5 + 0.5 * Math.sin(timeSec * 4.5);
      const [er, eg, eb] = this.zone.emergencyRgb;
      const r = Math.min(255, Math.round(er + alarm * 42));
      const g = Math.min(255, Math.round(eg + alarm * 6));
      lctx.fillStyle = `rgb(${r},${g},${eb})`;
    } else {
      const [ar, ag, ab] = this.zone.ambientRgb;
      lctx.fillStyle = `rgb(${ar},${ag},${ab})`;
    }
    lctx.fillRect(0, 0, lw, lh);

    // 2. Additive light pools into the 1/4-res lightmap
    lctx.globalCompositeOperation = 'lighter';

    // Single fast blit for all static neon/fridge/counter glows!
    lctx.drawImage(this.staticLightCanvas, 0, 0);

    // Flickering & overhead ceiling tubes
    for (let i = 0; i < this.flickeringLights.length; i++) {
      const light = this.flickeringLights[i];
      let intensity = light.intensity;
      if (isEmergencyLight && light.id.startsWith('tube-')) {
        intensity *= 0.25 + 0.15 * Math.sin(timeSec * 14 + light.x);
      } else if (light.flickerSpeed) {
        const wave = Math.sin(timeSec * light.flickerSpeed + (light.flickerPhase ?? 0));
        if (wave > 0.72) intensity *= light.flickerMin ?? 0.6;
      }
      this.blitLight(lctx, light.x * s, light.y * s, light.radius * s, light.color, intensity);
    }

    // Player visibility halo
    this.blitLight(
      lctx,
      playerX * s,
      playerY * s,
      (isEmergencyLight ? 150 : 120) * s,
      '#fffbeb',
      isEmergencyLight ? 0.94 : 0.68
    );

    // Dynamic combat flashes
    for (let i = 0; i < this.dynamicLights.length; i++) {
      const dyn = this.dynamicLights[i];
      const ratio = dyn.ttl && dyn.maxTtl ? Math.max(0, dyn.ttl / dyn.maxTtl) : 1;
      this.blitLight(
        lctx,
        dyn.x * s,
        dyn.y * s,
        dyn.radius * s * (0.7 + 0.3 * ratio),
        dyn.color,
        dyn.intensity * ratio
      );
    }
    lctx.globalAlpha = 1;

    // 3. Multiply lightmap onto the world canvas
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'multiply';
    targetCtx.imageSmoothingEnabled = true;
    targetCtx.drawImage(this.lightCanvas, 0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // 4. Crisp additive bloom for active combat flashes (also via pre-baked sprite!)
    if (this.dynamicLights.length > 0) {
      targetCtx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.dynamicLights.length; i++) {
        const dyn = this.dynamicLights[i];
        const ratio = dyn.ttl && dyn.maxTtl ? Math.max(0, dyn.ttl / dyn.maxTtl) : 1;
        this.blitLight(
          targetCtx,
          dyn.x,
          dyn.y,
          dyn.radius * 0.65,
          dyn.color,
          dyn.intensity * ratio * 0.14
        );
      }
      targetCtx.globalAlpha = 1;
    }
    targetCtx.restore();
  }

  private getLightStamp(hexColor: string): HTMLCanvasElement {
    let stamp = this.lightStamps.get(hexColor);
    if (stamp) return stamp;

    const size = 64;
    const half = size / 2;
    stamp = document.createElement('canvas');
    stamp.width = size;
    stamp.height = size;
    const ctx = stamp.getContext('2d')!;
    const clean = hexColor.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16) || 255;
    const g = parseInt(clean.slice(2, 4), 16) || 255;
    const b = parseInt(clean.slice(4, 6), 16) || 255;

    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.45, `rgba(${r},${g},${b},0.45)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    this.lightStamps.set(hexColor, stamp);
    return stamp;
  }

  private blitLight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    hexColor: string,
    intensity: number
  ): void {
    const a = Math.max(0, Math.min(1, intensity));
    if (a <= 0.01 || radius <= 1) return;
    const stamp = this.getLightStamp(hexColor);
    ctx.globalAlpha = a;
    ctx.drawImage(stamp, x - radius, y - radius, radius * 2, radius * 2);
  }
}
