import React from 'react';
import { Maximize2, Minimize2, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { STYLE_RANK_COLORS } from '../game/constants';
import { HudSnapshot } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onToggleFullscreen: () => void;
  onRestart: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  onToggleMute,
  onTogglePause,
  onToggleFullscreen,
  onRestart,
}) => {
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const ghostPct = Math.max(hpPct, Math.min(100, (hud.ghostHp / Math.max(1, hud.maxHp)) * 100));
  const railPct = Math.max(0, Math.min(100, hud.railCharge));
  const railReady = railPct >= 100;

  const oppPct =
    hud.opponentMaxHp > 0
      ? Math.max(0, Math.min(100, (hud.opponentHp / hud.opponentMaxHp) * 100))
      : 0;
  const oppGhostPct =
    hud.opponentMaxHp > 0
      ? Math.max(oppPct, Math.min(100, (hud.opponentGhostHp / hud.opponentMaxHp) * 100))
      : 0;

  const styleColor = STYLE_RANK_COLORS[hud.styleRank];

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-1.5 sm:p-4 [@media(max-height:500px)]:p-1.5">
      {/* Top Row: Player Vitality + 1v1 Duelist HP + Utility Controls */}
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-start justify-between gap-1 sm:gap-4 w-full">
          {/* Top-Left: Player HP, 3-Charge Dash Pips, Railcannon Charge, Coins */}
          <div className="flex flex-col gap-1 w-[106px] sm:w-[218px] shrink-0 bg-[#0f172a]/92 border-2 border-slate-700/90 rounded-lg px-1.5 py-1 sm:px-2.5 sm:py-2 [@media(max-height:500px)]:py-1 shadow-[0_3px_0_rgba(2,6,23,0.9)]">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" aria-hidden="true">
                  <path
                    d="M12 21s-7-4.5-9.2-9C1 8.4 3.2 4.5 6.8 4.5c2 0 3.7 1 5.2 2.7 1.5-1.7 3.2-2.7 5.2-2.7 3.6 0 5.8 3.9 4 7.5C19 16.5 12 21 12 21z"
                    fill="#ef4444"
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                </svg>
                <span className="text-[9px] sm:text-[11px] font-bold tracking-wider text-slate-300">HP</span>
              </div>
              <span className="font-mono-num text-[10px] sm:text-sm font-bold text-white">
                {hud.hp}/{hud.maxHp}
              </span>
            </div>

            {/* HP Bar with ghost trail */}
            <div className="relative h-2 sm:h-2.5 [@media(max-height:500px)]:h-1.5 w-full bg-slate-950 rounded-sm overflow-hidden border border-slate-800">
              <div
                className="absolute inset-y-0 left-0 bg-amber-300/80 transition-all duration-150"
                style={{ width: `${ghostPct}%` }}
              />
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-75 ${
                  hpPct <= 30 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>

            {/* 3-Charge Dash Pips + Coins */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-0.5 sm:gap-1 flex-1">
                {Array.from({ length: Math.min(4, hud.maxDashCharges) }).map((_, idx) => {
                  const fill = Math.max(0, Math.min(1, hud.dashCharges - idx));
                  return (
                    <div
                      key={idx}
                      className="h-1.5 flex-1 bg-slate-950 rounded-sm overflow-hidden border border-slate-800"
                    >
                      <div
                        className={`h-full ${fill >= 1 ? 'bg-sky-400' : 'bg-sky-700'}`}
                        style={{ width: `${Math.round(fill * 100)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <span className="font-mono-num text-[9px] sm:text-[11px] font-extrabold text-amber-300 whitespace-nowrap">
                ₽{hud.coinCount}
              </span>
            </div>

            {/* Railcannon Charge Meter */}
            <div className="flex items-center gap-1">
              <span
                className={`text-[8px] sm:text-[10px] font-extrabold tracking-tight whitespace-nowrap ${
                  railReady ? 'text-cyan-300' : 'text-slate-400'
                }`}
              >
                {railReady ? 'ЛУЧ [C]' : 'ЛУЧ'}
              </span>
              <div className="relative h-1.5 flex-1 bg-slate-950 rounded-sm overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-75 ${
                    railReady ? 'bg-cyan-300' : 'bg-cyan-600'
                  }`}
                  style={{ width: `${railPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Top-Center: 1v1 Opponent Duel Bar + Active Zone */}
          <div className="flex flex-col items-center text-center min-w-0 flex-1 max-w-[154px] sm:max-w-[300px] bg-[#0f172a]/92 border-2 border-slate-700/90 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 [@media(max-height:500px)]:py-1 shadow-[0_3px_0_rgba(2,6,23,0.9)]">
            <div className="flex items-center justify-center gap-1 sm:gap-2 text-[9px] sm:text-xs font-bold max-w-full whitespace-nowrap">
              <span className="text-amber-300 shrink-0">Р{hud.round}</span>
              <span className="text-slate-500 shrink-0" aria-hidden="true">·</span>
              <span className={`truncate max-w-[74px] sm:max-w-none ${hud.opponentEnraged ? 'text-rose-400' : 'text-cyan-300'}`}>
                {hud.opponentEnraged ? 'ЯРОСТЬ' : hud.zoneName}
              </span>
              <span className="sm:hidden text-slate-500 shrink-0" aria-hidden="true">·</span>
              <span className="sm:hidden font-mono-num text-amber-300 shrink-0">{hud.score}</span>
            </div>

            <div className="text-[9px] sm:text-xs text-slate-100 truncate max-w-full font-bold">
              {hud.opponentName ?? hud.roundTitle}
            </div>

            {hud.opponentMaxHp > 0 && (
              <div className="relative w-full h-2 sm:h-2.5 [@media(max-height:500px)]:h-1.5 bg-slate-950 rounded-sm overflow-hidden border border-rose-500/60 mt-0.5 sm:mt-1">
                <div
                  className="absolute inset-y-0 left-0 bg-amber-300/80 transition-all duration-150"
                  style={{ width: `${oppGhostPct}%` }}
                />
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-75 ${
                    hud.opponentEnraged ? 'bg-rose-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${oppPct}%` }}
                />
              </div>
            )}
          </div>

          {/* Top-Right: Score + 4 Compact Utility Buttons */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden sm:flex flex-col items-end bg-[#0f172a]/92 border-2 border-slate-700/90 rounded-lg px-3 py-1.5 [@media(max-height:500px)]:py-1 shadow-[0_3px_0_rgba(2,6,23,0.9)]">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">СЧЁТ</span>
                <span className="font-mono-num text-sm font-extrabold text-amber-300">{hud.score}</span>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1 pointer-events-auto">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleMute();
                  }}
                  className="min-h-[32px] min-w-[32px] sm:min-h-[40px] sm:min-w-[40px] rounded-lg bg-[#0f172a]/92 border-2 border-slate-700 hover:border-amber-400 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label={hud.muted ? 'Включить звук [M]' : 'Выключить звук [M]'}
                  title="Звук [M]"
                >
                  {hud.muted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleFullscreen();
                  }}
                  className="min-h-[32px] min-w-[32px] sm:min-h-[40px] sm:min-w-[40px] rounded-lg bg-[#0f172a]/92 border-2 border-slate-700 hover:border-amber-400 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label={hud.isFullscreen ? 'Выйти из полного экрана' : 'Полный экран'}
                  title="Полный экран"
                >
                  {hud.isFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
                  )}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onTogglePause();
                  }}
                  className="min-h-[32px] min-w-[32px] sm:min-h-[40px] sm:min-w-[40px] rounded-lg bg-[#0f172a]/92 border-2 border-slate-700 hover:border-amber-400 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Пауза [P]"
                  title="Пауза [P]"
                >
                  <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onRestart();
                  }}
                  className="min-h-[32px] min-w-[32px] sm:min-h-[40px] sm:min-w-[40px] rounded-lg bg-[#0f172a]/92 border-2 border-slate-700 hover:border-amber-400 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Заново [R]"
                  title="Заново [R]"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Compact ULTRAKILL Style Rank Box */}
            {(hud.stylePoints > 0 || hud.styleFeed.length > 0) && (
              <div className="bg-[#0f172a]/90 border-2 border-slate-700/90 rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 text-right shadow-[0_3px_0_rgba(2,6,23,0.9)]">
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">СТИЛЬ</span>
                  <span
                    className="font-pixel text-xs sm:text-base"
                    style={{ color: styleColor }}
                  >
                    {hud.styleRank === 'ULTRA' ? 'УЛЬТРА!' : hud.styleRank}
                  </span>
                </div>
                {hud.styleFeed.length > 0 && (
                  <div className="hidden sm:flex [@media(max-height:500px)]:hidden flex-col items-end mt-0.5 space-y-0.5">
                    {hud.styleFeed.slice(0, 3).map((tag, idx) => (
                      <span
                        key={`${tag}-${idx}`}
                        className="text-[10px] font-bold text-amber-200/90 leading-none"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upper-Center Transient Round / Combo Callout (kept clear of center fighters & lower touch controls) */}
      <div className="flex flex-col items-center justify-start pointer-events-none mt-1.5 sm:mt-4 mb-auto">
        {hud.announcement && (
          <div className="max-w-[calc(100vw-1.5rem)] sm:max-w-xl px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[#0f172a]/92 border-2 border-amber-400 text-amber-300 font-pixel text-[9px] sm:text-xs leading-snug tracking-wide text-center shadow-[0_4px_0_#020617]">
            {hud.announcement}
          </div>
        )}
        {hud.comboCount >= 2 && (
          <div className="mt-1.5 font-pixel text-xs sm:text-sm text-amber-300 hud-text-stroke">
            КОМБО x{hud.comboCount}
          </div>
        )}
      </div>

      <div className="h-1" />
    </div>
  );
};

