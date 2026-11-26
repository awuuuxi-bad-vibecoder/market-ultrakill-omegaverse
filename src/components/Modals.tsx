import React from 'react';
import { HudSnapshot, TouchMode, UpgradeOption } from '../game/types';

interface PauseModalProps {
  touchMode: TouchMode;
  isFullscreen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onCycleTouchMode: () => void;
  onOpenTouchCustomizer: () => void;
  onToggleFullscreen: () => void;
  onTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  touchMode,
  isFullscreen,
  onResume,
  onRestart,
  onCycleTouchMode,
  onOpenTouchCustomizer,
  onToggleFullscreen,
  onTitle,
}) => {
  const touchLabel =
    touchMode === 'auto'
      ? 'Управление: Авто'
      : touchMode === 'on'
        ? 'Управление: Тач (Вкл)'
        : 'Управление: ПК (Выкл)';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-[#070a10]/80 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        className="w-full max-w-sm rounded-2xl bg-[#0f172a] border-2 border-slate-700 p-4 sm:p-6 shadow-[0_8px_0_#020617] text-center"
      >
        <h2 id="pause-title" className="font-pixel text-base sm:text-lg text-amber-300 mb-1.5">
          ПАУЗА
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Перерыв в отделе бакалеи.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onResume}
            className="min-h-[44px] w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm border-2 border-slate-950 shadow-[0_3px_0_#020617] cursor-pointer"
          >
            Продолжить
          </button>

          <button
            type="button"
            onClick={onCycleTouchMode}
            className="min-h-[40px] w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs sm:text-sm border border-slate-600 cursor-pointer"
          >
            {touchLabel}
          </button>

          <button
            type="button"
            onClick={onOpenTouchCustomizer}
            className="min-h-[40px] w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs sm:text-sm border border-slate-600 cursor-pointer"
          >
            Настроить кнопки (размер и место)
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="min-h-[40px] w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs sm:text-sm border border-slate-600 cursor-pointer"
          >
            {isFullscreen ? 'Выйти из полного экрана' : 'Полный экран (горизонт.)'}
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="min-h-[40px] w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs sm:text-sm border border-slate-600 cursor-pointer"
          >
            Начать заново
          </button>

          <button
            type="button"
            onClick={onTitle}
            className="min-h-[40px] w-full rounded-xl bg-transparent hover:bg-slate-800/70 text-slate-300 font-medium text-xs sm:text-sm border border-slate-700 cursor-pointer"
          >
            В главное меню
          </button>
        </div>
      </div>
    </div>
  );
};

interface UpgradeModalProps {
  round: number;
  choices: UpgradeOption[];
  onSelect: (id: string) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  round,
  choices,
  onSelect,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#070a10]/82">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        className="w-full max-w-2xl rounded-2xl bg-[#0f172a] border-2 border-amber-400/80 p-5 sm:p-6 shadow-[0_8px_0_#020617]"
      >
        <div className="text-center mb-4">
          <div className="text-xs font-bold text-emerald-400 tracking-wider mb-1">
            РАУНД {round} ПРОЙДЕН
          </div>
          <h2 id="upgrade-title" className="font-pixel text-base sm:text-xl text-white">
            ПЕРЕКУС НА ХОДУ
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Выбери бонус перед следующей волной покупателей
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {choices.map((opt, idx) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className="group text-left rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-400 p-4 transition-all active:scale-[0.98] flex sm:flex-col items-center sm:items-start gap-3 cursor-pointer"
            >
              <div
                className="w-11 h-11 rounded-lg border-2 border-slate-950 flex items-center justify-center shrink-0 font-pixel text-sm text-slate-950"
                style={{ backgroundColor: opt.accentColor }}
              >
                {idx + 1}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm sm:text-base text-white group-hover:text-amber-300">
                  {opt.title}
                </div>
                <div className="text-xs text-slate-300 mt-0.5 leading-snug">
                  {opt.subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  hud: HudSnapshot;
  onRetry: () => void;
  onTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  hud,
  onRetry,
  onTitle,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#070a10]/85">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gameover-title"
        className="w-full max-w-md rounded-2xl bg-[#0f172a] border-2 border-rose-500/80 p-6 shadow-[0_8px_0_#020617] text-center"
      >
        <div className="text-xs font-bold text-rose-400 tracking-wider mb-1">
          СМЕНА ОКОНЧЕНА
        </div>
        <h2 id="gameover-title" className="font-pixel text-xl text-white mb-4">
          СБИТ ТЕЛЕЖКОЙ
        </h2>

        <div className="grid grid-cols-2 gap-2.5 mb-5 text-left">
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
            <div className="text-[11px] text-slate-400">Раунд</div>
            <div className="font-mono-num text-xl font-extrabold text-white">{hud.round}</div>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
            <div className="text-[11px] text-slate-400">Счёт / Рекорд</div>
            <div className="font-mono-num text-xl font-extrabold text-amber-300">
              {hud.score} / {hud.bestScore}
            </div>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
            <div className="text-[11px] text-slate-400">Парирований</div>
            <div className="font-mono-num text-xl font-extrabold text-emerald-400">{hud.parriesTotal}</div>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
            <div className="text-[11px] text-slate-400">Макс. комбо</div>
            <div className="font-mono-num text-xl font-extrabold text-sky-400">x{hud.maxCombo}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onRetry}
            className="min-h-[48px] flex-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm border-2 border-slate-950 shadow-[0_3px_0_#020617] cursor-pointer"
          >
            Играть снова
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="min-h-[48px] sm:w-36 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-600 cursor-pointer"
          >
            В меню
          </button>
        </div>
      </div>
    </div>
  );
};
