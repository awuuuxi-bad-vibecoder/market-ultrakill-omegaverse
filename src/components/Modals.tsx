import React from 'react';
import { Trophy } from 'lucide-react';
import { STYLE_RANK_COLORS } from '../game/constants';
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
      ? 'Input: Auto'
      : touchMode === 'on'
        ? 'Input: Touch (On)'
        : 'Input: PC (Off)';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-[#070a10]/80 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        className="w-full max-w-sm rounded-2xl bg-[#0f172a] border-2 border-slate-700 p-4 sm:p-6 shadow-[0_8px_0_#020617] text-center"
      >
        <h2 id="pause-title" className="font-pixel text-base sm:text-lg text-amber-300 mb-1.5">
          PAUSED
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Quick break in the grocery aisle.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onResume}
            className="min-h-[44px] w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm border-2 border-slate-950 shadow-[0_3px_0_#020617] cursor-pointer"
          >
            Resume
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
            Customize Touch Buttons
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="min-h-[40px] w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs sm:text-sm border border-slate-600 cursor-pointer"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="min-h-[40px] w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs sm:text-sm border border-slate-600 cursor-pointer"
          >
            Restart Shift
          </button>

          <button
            type="button"
            onClick={onTitle}
            className="min-h-[40px] w-full rounded-xl bg-transparent hover:bg-slate-800/70 text-slate-300 font-medium text-xs sm:text-sm border border-slate-700 cursor-pointer"
          >
            Main Menu
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
            ROUND {round} CLEARED
          </div>
          <h2 id="upgrade-title" className="font-pixel text-base sm:text-xl text-white">
            MID-SHIFT PERK
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Pick an upgrade before the next angry shopper clocks in
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
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-[#070a10]/85 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gameover-title"
        className="w-full max-w-md rounded-2xl bg-[#0f172a] border-2 border-rose-500/80 p-5 sm:p-6 shadow-[0_8px_0_#020617] text-center my-auto"
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-xs font-bold text-rose-400 tracking-wider">
            SHIFT TERMINATED
          </span>
          {hud.isNewRecord && (
            <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-extrabold tracking-wide">
              NEW RECORD!
            </span>
          )}
        </div>
        <h2 id="gameover-title" className="font-pixel text-lg sm:text-xl text-white mb-4">
          RAMMED BY A CART
        </h2>

        <div className="grid grid-cols-2 gap-2.5 mb-4 text-left">
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 sm:p-3">
            <div className="text-[11px] text-slate-400">Round</div>
            <div className="font-mono-num text-lg sm:text-xl font-extrabold text-white">
              {hud.round} <span className="text-xs text-cyan-300 font-semibold">· {hud.zoneName}</span>
            </div>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 sm:p-3">
            <div className="text-[11px] text-slate-400">Score / Best</div>
            <div className="font-mono-num text-lg sm:text-xl font-extrabold text-amber-300">
              {hud.score} / {hud.bestScore}
            </div>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 sm:p-3">
            <div className="text-[11px] text-slate-400">Parries & KOs</div>
            <div className="font-mono-num text-lg sm:text-xl font-extrabold text-emerald-400">
              {hud.parriesTotal} <span className="text-xs text-slate-400">/ {hud.kosTotal} KOs</span>
            </div>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 sm:p-3">
            <div className="text-[11px] text-slate-400">Style & Combo</div>
            <div className="flex items-baseline gap-2">
              <span
                className="font-pixel text-sm"
                style={{ color: STYLE_RANK_COLORS[hud.styleRank] }}
              >
                {hud.styleRank === 'ULTRA' ? 'ULTRA!' : hud.styleRank}
              </span>
              <span className="font-mono-num text-sm font-extrabold text-sky-400">
                x{hud.maxCombo}
              </span>
            </div>
          </div>
        </div>

        {/* Local Best Runs Leaderboard */}
        {hud.leaderboard.length > 0 && (
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 mb-4 text-left">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 mb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>BEST RUNS</span>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto pr-0.5">
              {hud.leaderboard.slice(0, 4).map((run, idx) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-800/70 last:border-b-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono-num text-[11px] text-slate-400 w-4">#{idx + 1}</span>
                    <span
                      className="font-pixel text-[10px]"
                      style={{ color: STYLE_RANK_COLORS[run.styleRank] }}
                    >
                      {run.styleRank === 'ULTRA' ? 'ULT' : run.styleRank}
                    </span>
                    <span className="text-slate-200 truncate">
                      R{run.round} · {run.zoneName}
                    </span>
                  </div>
                  <span className="font-mono-num font-bold text-amber-300 shrink-0">{run.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onRetry}
            className="min-h-[48px] flex-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm border-2 border-slate-950 shadow-[0_3px_0_#020617] cursor-pointer"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="min-h-[48px] sm:w-36 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-600 cursor-pointer"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
