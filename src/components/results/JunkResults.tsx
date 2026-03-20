import type { AppState } from '../../hooks/useAppState';
import { JUNK_LABELS, MANUAL_JUNK_TYPES } from '../../utils/junk';
import type { JunkType } from '../../types';

interface JunkResultsProps {
  appState: AppState;
}

export function JunkResults({ appState }: JunkResultsProps) {
  const { settings, activePlayers, computeJunkResults } = appState;
  if (!settings.useJunk) return null;

  const namedPlayers = activePlayers.filter(p => p.name);
  if (namedPlayers.length === 0) return null;

  const { playerResults, dotValue } = computeJunkResults();
  if (playerResults.every(r => r.totalDots === 0)) return null;

  const enabledTypes = [
    ...MANUAL_JUNK_TYPES.filter(t => settings.junkTypes[t]),
    ...(settings.junkTypes.birdieEagle ? (['birdieEagle'] as const) : []),
  ];

  return (
    <div className="card junk-results-card">
      <h3>JUNK / DOTS <span className="junk-results-rate">${dotValue}/dot</span></h3>

      {/* Dot breakdown table */}
      <div className="junk-results-table">
        <div className="junk-results-header">
          <span className="junk-col-label" />
          {namedPlayers.map(p => (
            <span key={p.id} className="junk-col-player">{p.name.split(' ')[0]}</span>
          ))}
        </div>
        {enabledTypes.map(type => {
          const label = JUNK_LABELS[type as JunkType | 'birdieEagle'];
          const hasDots = playerResults.some(r => (r.dotBreakdown[type as JunkType | 'birdieEagle'] || 0) > 0);
          if (!hasDots) return null;
          return (
            <div key={type} className="junk-results-row">
              <span className="junk-col-label">{label}</span>
              {playerResults.map(r => (
                <span key={r.playerId} className="junk-col-player">
                  {r.dotBreakdown[type as JunkType | 'birdieEagle'] || '—'}
                </span>
              ))}
            </div>
          );
        })}
        <div className="junk-results-row junk-results-total-row">
          <span className="junk-col-label">Total Dots</span>
          {playerResults.map(r => (
            <span key={r.playerId} className="junk-col-player junk-total-dots">{r.totalDots}</span>
          ))}
        </div>
      </div>

      {/* Payout summary */}
      <div className="junk-results-payouts">
        {playerResults.map(r => {
          const player = namedPlayers.find(p => p.id === r.playerId);
          if (!player) return null;
          return (
            <div key={r.playerId} className={`winnings-row ${r.netPayout >= 0 ? 'pos' : 'neg'}`}>
              <span>{player.name}</span>
              <strong>
                {r.netPayout === 0 ? '$0' : r.netPayout > 0 ? `+$${r.netPayout}` : `-$${Math.abs(r.netPayout)}`}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
