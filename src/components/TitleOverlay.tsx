import React from 'react';
import { Volume2, VolumeX, Smartphone, Monitor, Maximize2, Minimize2, SlidersHorizontal } from 'lucide-react';
import { TouchMode } from '../game/types';

interface TitleOverlayProps {
  bestScore: number;
  muted: boolean;
  touchMode: TouchMode;
  isFullscreen: boolean;
  onStart: () => void;
  onToggleMute: () => void;
  onCycleTouchMode: () => void;
  onToggleFullscreen: () => void;
  onOpenTouchCustomizer: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  bestScore,
  muted,
  touchMode,
  isFullscreen,
  onStart,
  onToggleMute,
  onCycleTouchMode,
  onToggleFullscreen,
  onOpenTouchCustomizer,
}) => {
  const touchLabel =
    touchMode === 'auto'
      ? 'Авто'
      : touchMode === 'on'
        ? 'Тач'
        : 'ПК';

  return (
    <div
      className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-8 [@media(max-height:500px)]:p-3 pointer-events-none"
      style={{
        background:
          'radial-gradient(circle at 50% 42%, rgba(11,14,20,0.28) 0%, rgba(11,14,20,0.82) 72%, rgba(11,14,20,0.94) 100%)',
      }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 pointer-events-auto">
        <div className="text-[11px] sm:text-sm font-medium text-amber-300/90 tracking-wide hud-text-stroke truncate">
          МЕГАМАРТ 24/7 · НОЧНАЯ СМЕНА
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleTouchMode();
            }}
            className="min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Переключить раскладку управления"
          >
            {touchMode === 'off' ? <Monitor className="w-4 h-4 text-sky-400" /> : <Smartphone className="w-4 h-4 text-amber-400" />}
            <span>Упр: {touchLabel}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenTouchCustomizer();
            }}
            className="min-h-[40px] min-w-[40px] sm:min-h-[44px] px-2 sm:px-3 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            aria-label="Настроить кнопки управления"
            title="Настроить кнопки"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Кнопки</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleFullscreen();
            }}
            className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] px-2 sm:px-3 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            aria-label={isFullscreen ? 'Выйти из полного экрана' : 'Полный экран и горизонтальный режим'}
            title={isFullscreen ? 'Обычный экран' : 'На весь экран'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-cyan-300" />
            ) : (
              <Maximize2 className="w-4 h-4 text-cyan-300" />
            )}
            <span className="hidden sm:inline">{isFullscreen ? 'Свернуть' : 'Экран'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] rounded-lg bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Center Lockup */}
      <div className="flex flex-col items-center text-center my-auto max-w-xl mx-auto pointer-events-auto">
        {/* Bespoke inline SVG supermarket price-tag & fist emblem */}
        <svg
          viewBox="0 0 320 86"
          className="w-64 sm:w-88 [@media(max-height:500px)]:w-52 h-auto mb-2 sm:mb-3 drop-shadow-[0_6px_0_rgba(15,23,42,0.95)]"
          aria-hidden="true"
        >
          {/* Price-tag plaque */}
          <path
            d="M20 12 L292 12 L308 43 L292 74 L20 74 Q8 74 8 62 L8 24 Q8 12 20 12 Z"
            fill="#dc2626"
            stroke="#0f172a"
            strokeWidth="5"
          />
          <path
            d="M24 18 L288 18 L300 43 L288 68 L24 68 Q14 68 14 58 L14 28 Q14 18 24 18 Z"
            fill="none"
            stroke="#fde047"
            strokeWidth="2.5"
            strokeDasharray="6 4"
          />
          {/* Tag hole */}
          <circle cx="26" cy="43" r="6" fill="#0b0e14" stroke="#fde047" strokeWidth="2" />
          {/* Barcode strips */}
          <g fill="#0f172a" opacity="0.28">
            <rect x="262" y="24" width="3" height="38" />
            <rect x="268" y="24" width="6" height="38" />
            <rect x="277" y="24" width="2" height="38" />
            <rect x="282" y="24" width="5" height="38" />
          </g>
          {/* Pixel Fist Icon */}
          <g transform="translate(40, 25)">
            <rect x="2" y="8" width="22" height="18" rx="2" fill="#fbbf24" stroke="#0f172a" strokeWidth="3" />
            <rect x="4" y="3" width="5" height="7" fill="#fde047" stroke="#0f172a" strokeWidth="2" />
            <rect x="10" y="2" width="5" height="8" fill="#fde047" stroke="#0f172a" strokeWidth="2" />
            <rect x="16" y="3" width="5" height="7" fill="#fde047" stroke="#0f172a" strokeWidth="2" />
            <rect x="6" y="26" width="14" height="8" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
          </g>
          {/* Tag Text */}
          <text
            x="164"
            y="38"
            textAnchor="middle"
            fill="#fef08a"
            fontFamily="Rubik, sans-serif"
            fontWeight="800"
            fontSize="13"
            letterSpacing="1.8"
          >
            СУПЕРМАРКЕТ 24/7
          </text>
          <text
            x="164"
            y="59"
            textAnchor="middle"
            fill="#ffffff"
            fontFamily="Rubik, sans-serif"
            fontWeight="800"
            fontSize="19"
            letterSpacing="1"
          >
            АКЦИЯ: УДАР!
          </text>
        </svg>

        <h1 className="font-pixel text-xl sm:text-4xl [@media(max-height:500px)]:text-lg text-white tracking-tight leading-snug mb-2 sm:mb-3 hud-text-stroke [text-wrap:balance]">
          КАССОВЫЙ РАЗНОС
        </h1>

        <p className="text-xs sm:text-base [@media(max-height:500px)]:text-xs text-slate-200 max-w-md mb-4 sm:mb-6 [@media(max-height:500px)]:mb-3 leading-relaxed hud-text-stroke">
          Ультра-жёсткие дуэли 1 на 1 в разрушаемом супермаркете: круши полки, пали из рельсо-лазера, парируй и сбивай монетки в воздухе!
        </p>

        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            onStart();
          }}
          className="min-h-[48px] sm:min-h-[52px] px-7 sm:px-8 py-2.5 sm:py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-slate-950 font-extrabold text-sm sm:text-lg tracking-wide border-2 border-slate-950 shadow-[0_5px_0_#0f172a] transition-all cursor-pointer whitespace-nowrap"
        >
          Начать дуэль
        </button>

        {bestScore > 0 && (
          <div className="mt-3 [@media(max-height:500px)]:mt-2 text-xs sm:text-sm font-mono-num text-amber-300 hud-text-stroke">
            Лучший счёт: {bestScore}
          </div>
        )}
      </div>

      {/* Flat single-line bottom control hint */}
      <div className="text-center text-[10px] sm:text-xs text-slate-300/90 tracking-wide hud-text-stroke truncate">
        WASD — Бег · ЛКМ / J — Удар · F / ПКМ — Парир · E — Дробовик · Q — Монета · C — Рельсо-луч · Пробел — Рывок
      </div>
    </div>
  );
};

