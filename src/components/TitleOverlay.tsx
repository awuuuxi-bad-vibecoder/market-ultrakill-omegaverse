import React, { useState } from 'react';
import { Volume2, VolumeX, Smartphone, Monitor, Maximize2, Minimize2, SlidersHorizontal, Trophy, X } from 'lucide-react';
import { STYLE_RANK_COLORS } from '../game/constants';
import { RunRecord, TouchMode } from '../game/types';

interface TitleOverlayProps {
  bestScore: number;
  leaderboard: RunRecord[];
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
  leaderboard,
  muted,
  touchMode,
  isFullscreen,
  onStart,
  onToggleMute,
  onCycleTouchMode,
  onToggleFullscreen,
  onOpenTouchCustomizer,
}) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const touchLabel =
    touchMode === 'auto'
      ? 'Auto'
      : touchMode === 'on'
        ? 'Touch'
        : 'PC';

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
          MEGAMART 24/7 · NIGHT SHIFT
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              setShowLeaderboard(true);
            }}
            className="min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Best Runs leaderboard"
            title="Best Runs"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Best Runs</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleTouchMode();
            }}
            className="min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Switch input mode"
          >
            {touchMode === 'off' ? <Monitor className="w-4 h-4 text-sky-400" /> : <Smartphone className="w-4 h-4 text-amber-400" />}
            <span>Input: {touchLabel}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenTouchCustomizer();
            }}
            className="min-h-[40px] min-w-[40px] sm:min-h-[44px] px-2 sm:px-3 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            aria-label="Customize touch controls"
            title="Customize controls"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Layout</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleFullscreen();
            }}
            className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] px-2 sm:px-3 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Windowed' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-cyan-300" />
            ) : (
              <Maximize2 className="w-4 h-4 text-cyan-300" />
            )}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Full'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] rounded-lg bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
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
          <g transform="translate(35, 25)">
            <rect x="2" y="8" width="22" height="18" rx="2" fill="#fbbf24" stroke="#0f172a" strokeWidth="3" />
            <rect x="4" y="3" width="5" height="7" fill="#fde047" stroke="#0f172a" strokeWidth="2" />
            <rect x="10" y="2" width="5" height="8" fill="#fde047" stroke="#0f172a" strokeWidth="2" />
            <rect x="16" y="3" width="5" height="7" fill="#fde047" stroke="#0f172a" strokeWidth="2" />
            <rect x="6" y="26" width="14" height="8" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
          </g>
          {/* Tag Text */}
          <text
            x="174"
            y="38"
            textAnchor="middle"
            fill="#fef08a"
            fontFamily="Rubik, sans-serif"
            fontWeight="800"
            fontSize="12.5"
            letterSpacing="1.6"
          >
            SUPERMARKET 24/7
          </text>
          <text
            x="174"
            y="59"
            textAnchor="middle"
            fill="#ffffff"
            fontFamily="Rubik, sans-serif"
            fontWeight="800"
            fontSize="16"
            letterSpacing="0.8"
          >
            FLASH SALE: PUNCH!
          </text>
        </svg>

        <h1 className="font-pixel text-xl sm:text-4xl [@media(max-height:500px)]:text-lg text-white tracking-tight leading-snug mb-2 sm:mb-3 hud-text-stroke [text-wrap:balance]">
          CHECKOUT CARNAGE
        </h1>

        <p className="text-xs sm:text-base [@media(max-height:500px)]:text-xs text-slate-200 max-w-md mb-4 sm:mb-6 [@media(max-height:500px)]:mb-3 leading-relaxed hud-text-stroke">
          Relentless 1v1 duels in a destructible supermarket: smash shelves for buffs, grapple with Whiplash tape, ricochet coins, and parry department bosses!
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
          Start Brawl
        </button>

        {bestScore > 0 && (
          <div className="mt-3 [@media(max-height:500px)]:mt-2 text-xs sm:text-sm font-mono-num text-amber-300 hud-text-stroke">
            Best Score: {bestScore}
          </div>
        )}
      </div>

      {/* Flat single-line bottom control hint */}
      <div className="text-center text-[10px] sm:text-xs text-slate-300/90 tracking-wide hud-text-stroke truncate">
        WASD Move · LMB/J Punch · F/RMB Parry · G Hook · E Shotgun · Q Coin · C Railbeam · Space Dash
      </div>

      {/* Best Runs Leaderboard Modal */}
      {showLeaderboard && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#070a10]/85 pointer-events-auto"
          onClick={() => setShowLeaderboard(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Best Runs Leaderboard"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-[#0f172a] border-2 border-amber-400/80 p-5 shadow-[0_8px_0_#020617]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="font-pixel text-sm sm:text-base text-amber-300">BEST RUNS</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaderboard(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 flex items-center justify-center cursor-pointer"
                aria-label="Close leaderboard"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {leaderboard.length === 0 ? (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 text-center text-xs sm:text-sm text-slate-400">
                No completed shifts yet. Clock in and punch a shopper!
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
                {leaderboard.map((run, idx) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono-num text-xs font-extrabold text-slate-400 w-5">
                        #{idx + 1}
                      </span>
                      <span
                        className="font-pixel text-xs px-1.5 py-1 rounded bg-slate-950 border border-slate-700 shrink-0"
                        style={{ color: STYLE_RANK_COLORS[run.styleRank] }}
                      >
                        {run.styleRank === 'ULTRA' ? 'ULT' : run.styleRank}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          R{run.round} · {run.zoneName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {run.kos} KOs · {run.parries} Parries
                        </div>
                      </div>
                    </div>
                    <div className="font-mono-num text-sm font-extrabold text-amber-300 shrink-0">
                      {run.score}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
