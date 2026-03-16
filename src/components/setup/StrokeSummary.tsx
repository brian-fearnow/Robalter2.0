import { ListChecks, ChevronDown, ChevronUp } from 'lucide-react';
import type { Player, GameSettings, GameMode } from '../../types';

interface StrokeSummaryProps {
  activePlayers: Player[];
  baselineCH: number;
  settings: GameSettings;
  gameMode: GameMode;
  visibleSummary: boolean;
  strokeSummaryInputs: { [playerId: string]: string };
  onToggleSummary: () => void;
  onManualStrokesToggle: () => void;
  onStrokeSummaryInputChange: (pId: string, value: string) => void;
  onFinalizeDecimalEntry: (id: string, isSummary: boolean) => void;
  computeStrokesPerSixHoles: (player: Player) => number;
}

export function StrokeSummary({
  activePlayers,
  baselineCH,
  settings,
  gameMode,
  visibleSummary,
  strokeSummaryInputs,
  onToggleSummary,
  onManualStrokesToggle,
  onStrokeSummaryInputChange,
  onFinalizeDecimalEntry,
  computeStrokesPerSixHoles,
}: StrokeSummaryProps) {
  const isDividedSixes = (gameMode === 'sixes' || gameMode === 'wheel') && settings.strokeAllocation === 'divided';

  return (
    <div className="card stroke-summary-card">
      <div className="collapsible-header" onClick={onToggleSummary}>
        <h3><ListChecks size={14} /> STROKE SUMMARY</h3>
        <div
          className="slider-toggle-container"
          onClick={e => { e.stopPropagation(); onManualStrokesToggle(); }}
        >
          <span>Adjust Strokes</span>
          <div className={`slider-track ${settings.useManualStrokes ? 'active' : ''}`}>
            <div className="slider-thumb" />
          </div>
        </div>
        {visibleSummary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {visibleSummary && (
        <div className="summary-grid">
          <div className="summary-header">
            <span>Player</span>
            <span>CH</span>
            <span>{isDividedSixes ? 'Rel' : 'Strokes'}</span>
            {isDividedSixes && <span>Per 6</span>}
          </div>
          {activePlayers.filter(p => p.name).map(p => (
            <div key={p.id} className="summary-row">
              <strong>{p.name}</strong>
              <span>{p.courseHandicap}</span>

              {/* Column 3 */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {(settings.useManualStrokes && (!isDividedSixes)) ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className="manual-stroke-input"
                    value={strokeSummaryInputs[p.id] !== undefined ? strokeSummaryInputs[p.id] : p.manualRelativeStrokes.toString()}
                    onChange={e => onStrokeSummaryInputChange(p.id, e.target.value)}
                    onBlur={() => onFinalizeDecimalEntry(p.id, true)}
                    onKeyDown={e => e.key === 'Enter' && onFinalizeDecimalEntry(p.id, true)}
                  />
                ) : (
                  <span>{p.courseHandicap - baselineCH}</span>
                )}
              </div>

              {/* Column 4 (Divided Sixes only) */}
              {isDividedSixes && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {settings.useManualStrokes ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className="manual-stroke-input"
                      value={strokeSummaryInputs[p.id] !== undefined ? strokeSummaryInputs[p.id] : p.manualRelativeStrokes.toString()}
                      onChange={e => onStrokeSummaryInputChange(p.id, e.target.value)}
                      onBlur={() => onFinalizeDecimalEntry(p.id, true)}
                      onKeyDown={e => e.key === 'Enter' && onFinalizeDecimalEntry(p.id, true)}
                    />
                  ) : (
                    <strong>{computeStrokesPerSixHoles(p)}</strong>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
