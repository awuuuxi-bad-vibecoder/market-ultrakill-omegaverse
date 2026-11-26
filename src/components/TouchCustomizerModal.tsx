import React, { useRef } from 'react';
import { RotateCcw, Hand, Check } from 'lucide-react';
import {
  clampTouchOffset,
  clampTouchScale,
  computeEffectiveTouchScale,
  createDefaultTouchLayout,
  TouchControlId,
  TouchLayoutConfig,
} from '../game/touchSettings';
import { BUTTON_BASE_POS } from './MobileControls';

interface TouchCustomizerModalProps {
  layout: TouchLayoutConfig;
  onChange: (next: TouchLayoutConfig) => void;
  onClose: () => void;
}

const CONTROL_LABELS: Record<TouchControlId, { label: string; colorClass: string }> = {
  stick: { label: 'STICK', colorClass: 'bg-slate-800 text-amber-300 border-amber-400' },
  attack: { label: 'PUNCH', colorClass: 'bg-rose-500 text-white border-slate-950' },
  dash: { label: 'DASH', colorClass: 'bg-sky-400 text-slate-950 border-slate-950' },
  parry: { label: 'PARRY', colorClass: 'bg-yellow-400 text-slate-950 border-slate-950' },
  shotgun: { label: 'SHOT', colorClass: 'bg-orange-500 text-slate-950 border-slate-950' },
  coin: { label: 'COIN', colorClass: 'bg-amber-300 text-slate-950 border-slate-950' },
  whiplash: { label: 'HOOK', colorClass: 'bg-emerald-400 text-slate-950 border-slate-950' },
  rail: { label: 'BEAM', colorClass: 'bg-cyan-300 text-slate-950 border-slate-950' },
};

export const TouchCustomizerModal: React.FC<TouchCustomizerModalProps> = ({
  layout,
  onChange,
  onClose,
}) => {
  const dragState = useRef<{
    id: TouchControlId;
    startX: number;
    startY: number;
    origDx: number;
    origDy: number;
  } | null>(null);

  const effectiveScale = computeEffectiveTouchScale(layout.scale);
  const isLeftHanded = layout.handedness === 'left';

  const startDrag = (id: TouchControlId, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origDx: layout.offsets[id].dx,
      origDy: layout.offsets[id].dy,
    };
  };

  const moveDrag = (e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d) return;
    e.preventDefault();
    const dx = (e.clientX - d.startX) / effectiveScale;
    const dy = (e.clientY - d.startY) / effectiveScale;
    const nextOffset = clampTouchOffset({
      dx: d.origDx + dx,
      dy: d.origDy + dy,
    });
    onChange({
      ...layout,
      offsets: {
        ...layout.offsets,
        [d.id]: nextOffset,
      },
    });
  };

  const endDrag = () => {
    dragState.current = null;
  };

  const buttonIds: Exclude<TouchControlId, 'stick'>[] = [
    'attack',
    'dash',
    'parry',
    'shotgun',
    'coin',
    'whiplash',
    'rail',
  ];

  return (
    <div
      className="fixed inset-0 z-40 bg-[#070a10]/88 flex flex-col justify-between p-3 sm:p-5 select-none touch-none"
      role="dialog"
      aria-modal="true"
      aria-label="Touch Controls Customizer"
    >
      {/* Top Control Bar */}
      <div className="mx-auto w-full max-w-xl rounded-2xl bg-[#0f172a] border-2 border-amber-400/80 p-3 sm:p-4 shadow-[0_6px_0_#020617]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div>
            <h2 className="font-pixel text-xs sm:text-sm text-amber-300">
              TOUCH CUSTOMIZER
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
              Drag any button or stick anywhere you want!
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChange(createDefaultTouchLayout())}
              className="min-h-[36px] px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[36px] px-3 rounded-lg bg-amber-400 hover:bg-amber-300 border-2 border-slate-950 text-slate-950 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 flex-1 min-w-[190px] text-xs font-semibold text-slate-200">
            <span className="whitespace-nowrap">Size:</span>
            <input
              type="range"
              min={85}
              max={140}
              step={5}
              value={Math.round(layout.scale * 100)}
              onChange={(e) =>
                onChange({
                  ...layout,
                  scale: clampTouchScale(Number(e.target.value) / 100),
                })
              }
              className="w-full accent-amber-400 cursor-pointer"
            />
            <span className="font-mono-num text-amber-300 w-11 text-right">
              {Math.round(layout.scale * 100)}%
            </span>
          </label>

          <button
            type="button"
            onClick={() =>
              onChange({
                ...layout,
                handedness: layout.handedness === 'right' ? 'left' : 'right',
              })
            }
            className="min-h-[36px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Hand className="w-3.5 h-3.5 text-sky-400" />
            <span>{isLeftHanded ? 'Hand: Left' : 'Hand: Right'}</span>
          </button>
        </div>
      </div>

      {/* Live Draggable Preview Dock */}
      <div
        className={`flex items-end justify-between px-3.5 pb-4 sm:px-6 sm:pb-6 ${
          isLeftHanded ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Draggable Joystick */}
        <div
          style={{
            transform: `translate3d(${layout.offsets.stick.dx}px, ${layout.offsets.stick.dy}px, 0) scale(${effectiveScale})`,
            transformOrigin: isLeftHanded ? 'bottom right' : 'bottom left',
          }}
        >
          <div
            onPointerDown={(e) => startDrag('stick', e)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="relative w-[114px] h-[114px] rounded-full border-2 border-dashed border-amber-400 bg-slate-900/90 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[0_4px_0_#020617]"
          >
            <div className="w-12 h-12 rounded-full bg-amber-400 border-2 border-slate-950 flex items-center justify-center">
              <span className="text-[9px] font-extrabold text-slate-950">STICK</span>
            </div>
          </div>
        </div>

        {/* Draggable 7 Action Buttons */}
        <div
          className="relative w-[218px] h-[194px]"
          style={{
            transform: `scale(${effectiveScale})`,
            transformOrigin: isLeftHanded ? 'bottom left' : 'bottom right',
          }}
        >
          {buttonIds.map((id) => {
            const base = BUTTON_BASE_POS[id];
            const off = layout.offsets[id];
            const meta = CONTROL_LABELS[id];
            const style: React.CSSProperties = {
              width: `${base.size}px`,
              height: `${base.size}px`,
              bottom: `${base.yFromBottom - off.dy}px`,
              ...(isLeftHanded
                ? { left: `${base.xFromEdge + off.dx}px` }
                : { right: `${base.xFromEdge - off.dx}px` }),
            };
            return (
              <div
                key={id}
                style={style}
                onPointerDown={(e) => startDrag(id, e)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className={`absolute rounded-full border-2 border-dashed flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[0_3px_0_#020617] ${meta.colorClass}`}
              >
                <span className="text-[10px] font-extrabold leading-none pointer-events-none">
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
