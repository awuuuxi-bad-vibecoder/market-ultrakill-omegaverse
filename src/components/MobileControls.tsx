import React, { useRef, useState } from 'react';
import {
  computeEffectiveTouchScale,
  TouchControlId,
  TouchLayoutConfig,
} from '../game/touchSettings';

interface MobileControlsProps {
  coinCount: number;
  dashCharges: number;
  railCharge: number;
  shotgunCooldownRatio: number;
  parryCooldownRatio: number;
  layout: TouchLayoutConfig;
  onMove: (x: number, y: number) => void;
  onAttack: () => void;
  onDash: () => void;
  onParry: () => void;
  onShotgun: () => void;
  onCoin: () => void;
  onRailcannon: () => void;
}

export const BUTTON_BASE_POS: Record<
  Exclude<TouchControlId, 'stick'>,
  { xFromEdge: number; yFromBottom: number; size: number }
> = {
  attack: { xFromEdge: 0, yFromBottom: 0, size: 74 },
  dash: { xFromEdge: 82, yFromBottom: 0, size: 58 },
  parry: { xFromEdge: 140, yFromBottom: 56, size: 56 },
  shotgun: { xFromEdge: 4, yFromBottom: 84, size: 56 },
  coin: { xFromEdge: 72, yFromBottom: 96, size: 54 },
  rail: { xFromEdge: 138, yFromBottom: 122, size: 52 },
};

export const MobileControls: React.FC<MobileControlsProps> = ({
  coinCount,
  dashCharges,
  railCharge,
  shotgunCooldownRatio,
  parryCooldownRatio,
  layout,
  onMove,
  onAttack,
  onDash,
  onParry,
  onShotgun,
  onCoin,
  onRailcannon,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickActive, setJoystickActive] = useState(false);

  const effectiveScale = computeEffectiveTouchScale(layout.scale);
  const maxRadius = 40;
  const railReady = railCharge >= 100;
  const isLeftHanded = layout.handedness === 'left';

  const updateStickFromPointer = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (clientX - cx) / effectiveScale;
    const dy = (clientY - cy) / effectiveScale;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const ox = dist > 0.5 ? Math.cos(angle) * clamped : 0;
    const oy = dist > 0.5 ? Math.sin(angle) * clamped : 0;
    setKnobOffset({ x: ox, y: oy });
    onMove(ox / maxRadius, oy / maxRadius);
  };

  const resetStick = () => {
    activePointerId.current = null;
    setJoystickActive(false);
    setKnobOffset({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const getBtnStyle = (id: Exclude<TouchControlId, 'stick'>): React.CSSProperties => {
    const base = BUTTON_BASE_POS[id];
    const off = layout.offsets[id];
    return {
      width: `${base.size}px`,
      height: `${base.size}px`,
      bottom: `${base.yFromBottom - off.dy}px`,
      ...(isLeftHanded
        ? { left: `${base.xFromEdge + off.dx}px` }
        : { right: `${base.xFromEdge - off.dx}px` }),
    };
  };

  const stickOffset = layout.offsets.stick;

  return (
    <div
      data-testid="mobile-controls"
      className={`fixed inset-x-0 bottom-0 z-20 pointer-events-none flex items-end justify-between px-3.5 pb-4 pt-2 sm:px-6 sm:pb-6 [@media(max-height:500px)]:px-4 [@media(max-height:500px)]:pb-2.5 ${
        isLeftHanded ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Movement Thumb Zone: Virtual Analog Joystick */}
      <div
        style={{
          transform: `translate3d(${stickOffset.dx}px, ${stickOffset.dy}px, 0) scale(${effectiveScale})`,
          transformOrigin: isLeftHanded ? 'bottom right' : 'bottom left',
        }}
      >
        <div
          ref={padRef}
          role="group"
          aria-label="Джойстик движения"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (activePointerId.current !== null) return;
            activePointerId.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            setJoystickActive(true);
            updateStickFromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.pointerId !== activePointerId.current) return;
            e.preventDefault();
            updateStickFromPointer(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (e.pointerId !== activePointerId.current) return;
            resetStick();
          }}
          onPointerCancel={(e) => {
            if (e.pointerId !== activePointerId.current) return;
            resetStick();
          }}
          className={`pointer-events-auto relative w-[114px] h-[114px] rounded-full flex items-center justify-center touch-none transition-opacity ${
            joystickActive ? 'opacity-100' : 'opacity-85'
          }`}
          style={{
            background: 'rgba(15, 23, 42, 0.72)',
            border: '2px solid rgba(148, 163, 184, 0.55)',
            boxShadow: '0 4px 0 rgba(2, 6, 23, 0.85)',
          }}
        >
          <div className="absolute inset-3 rounded-full border border-slate-500/35 pointer-events-none" />
          <div
            className="w-12 h-12 rounded-full bg-amber-400 border-2 border-slate-950 shadow-[0_3px_0_#0f172a] pointer-events-none"
            style={{
              transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
            }}
          />
        </div>
      </div>

      {/* Action Thumb Zone: Bigger 6-Action Customizable Arc */}
      <div
        className="pointer-events-none relative w-[198px] h-[176px]"
        style={{
          transform: `scale(${effectiveScale})`,
          transformOrigin: isLeftHanded ? 'bottom left' : 'bottom right',
        }}
      >
        {/* Railcannon Piercing Laser */}
        <button
          type="button"
          style={getBtnStyle('rail')}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRailcannon();
          }}
          className={`pointer-events-auto absolute rounded-full border-2 border-slate-950 flex flex-col items-center justify-center shadow-[0_3px_0_#0f172a] active:translate-y-0.5 transition-transform overflow-hidden cursor-pointer touch-none ${
            railReady
              ? 'bg-cyan-300 text-slate-950 ring-2 ring-cyan-200/80'
              : 'bg-slate-800 text-cyan-200'
          }`}
          aria-label="Рельсо-лазер"
        >
          {!railReady && (
            <div
              className="absolute inset-x-0 bottom-0 bg-cyan-500/45 pointer-events-none"
              style={{ height: `${Math.round(railCharge)}%` }}
            />
          )}
          <span className="text-[10px] font-extrabold leading-none relative z-10">ЛУЧ</span>
          <span className="font-mono-num text-[8px] font-bold leading-none mt-0.5 relative z-10">
            {railReady ? '100%' : `${Math.floor(railCharge)}%`}
          </span>
        </button>

        {/* Coin Toss */}
        <button
          type="button"
          style={getBtnStyle('coin')}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCoin();
          }}
          className={`pointer-events-auto absolute rounded-full border-2 border-slate-950 flex flex-col items-center justify-center shadow-[0_3px_0_#0f172a] active:translate-y-0.5 transition-transform cursor-pointer touch-none ${
            coinCount > 0 ? 'bg-amber-300 text-slate-950' : 'bg-slate-800 text-slate-400'
          }`}
          aria-label="Бросить монету"
        >
          <span className="font-mono-num text-xs font-extrabold leading-none">₽{coinCount}</span>
          <span className="text-[7px] font-extrabold leading-none mt-0.5">МОНЕТА</span>
        </button>

        {/* Price-Gun Shotgun */}
        <button
          type="button"
          style={getBtnStyle('shotgun')}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onShotgun();
          }}
          className="pointer-events-auto absolute rounded-full bg-orange-500 border-2 border-slate-950 text-slate-950 flex flex-col items-center justify-center shadow-[0_4px_0_#0f172a] active:translate-y-0.5 transition-transform overflow-hidden cursor-pointer touch-none"
          aria-label="Дробовик-сканер"
        >
          {shotgunCooldownRatio > 0 && (
            <div
              className="absolute inset-x-0 bottom-0 bg-slate-950/55 pointer-events-none"
              style={{ height: `${Math.round(shotgunCooldownRatio * 100)}%` }}
            />
          )}
          <span className="text-[10px] font-extrabold leading-none relative z-10">ДРОБЬ</span>
        </button>

        {/* Feedbacker Parry */}
        <button
          type="button"
          style={getBtnStyle('parry')}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onParry();
          }}
          className="pointer-events-auto absolute rounded-full bg-yellow-400 border-2 border-slate-950 text-slate-950 flex flex-col items-center justify-center shadow-[0_4px_0_#0f172a] active:translate-y-0.5 transition-transform overflow-hidden cursor-pointer touch-none"
          aria-label="Парирование"
        >
          {parryCooldownRatio > 0 && (
            <div
              className="absolute inset-x-0 bottom-0 bg-slate-950/55 pointer-events-none"
              style={{ height: `${Math.round(parryCooldownRatio * 100)}%` }}
            />
          )}
          <span className="text-[10px] font-extrabold leading-none relative z-10">ПАРИР</span>
        </button>

        {/* 3-Charge Dash */}
        <button
          type="button"
          style={getBtnStyle('dash')}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDash();
          }}
          className={`pointer-events-auto absolute rounded-full border-2 border-slate-950 text-slate-950 flex flex-col items-center justify-center shadow-[0_4px_0_#0f172a] active:translate-y-0.5 transition-transform cursor-pointer touch-none ${
            dashCharges >= 1 ? 'bg-sky-400' : 'bg-slate-700 text-slate-300'
          }`}
          aria-label="Рывок"
        >
          <span className="font-mono-num text-[11px] font-extrabold leading-none">
            x{Math.floor(dashCharges)}
          </span>
          <span className="text-[9px] font-extrabold leading-none mt-0.5">РЫВОК</span>
        </button>

        {/* Primary Melee Combo */}
        <button
          type="button"
          style={getBtnStyle('attack')}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAttack();
          }}
          className="pointer-events-auto absolute rounded-full bg-rose-500 active:bg-rose-400 border-[3px] border-slate-950 text-white flex flex-col items-center justify-center shadow-[0_5px_0_#0f172a] active:translate-y-0.5 transition-transform cursor-pointer touch-none"
          aria-label="Удар"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
            <rect x="5" y="9" width="14" height="10" rx="2" fill="#fde047" stroke="#0f172a" strokeWidth="2" />
            <rect x="6" y="5" width="3" height="5" fill="#fef08a" stroke="#0f172a" strokeWidth="1.5" />
            <rect x="10.5" y="4" width="3" height="6" fill="#fef08a" stroke="#0f172a" strokeWidth="1.5" />
            <rect x="15" y="5" width="3" height="5" fill="#fef08a" stroke="#0f172a" strokeWidth="1.5" />
          </svg>
          <span className="text-[11px] font-extrabold tracking-wide leading-none mt-0.5">
            УДАР
          </span>
        </button>
      </div>
    </div>
  );
};
