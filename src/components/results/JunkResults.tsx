import { useState } from 'react';
import type { AppState } from '../../hooks/useAppState';
import { JUNK_LABELS, MANUAL_JUNK_TYPES, getBirdieEagleDots } from '../../utils/junk';
import type { JunkType } from '../../types';

interface JunkResultsProps {
  appState: AppState;
}

export function JunkResults({ appState }: JunkResultsProps) {
  const { settings, activePlayers, computeJunkResults, junkDots, scores, selectedCourse } = appState;
  const [showAudit, setShowAudit] = useState(false);

  if (!settings.useJunk) return null;

  const namedPlayers = activePlayers.filter(p => p.name);
  if (namedPlayers.length === 0) return null;

  const { playerResults, dotValue } = computeJunkResults();
  if (playerResults.every(r => r.totalDots === 0)) return null;

  const enabledTypes = [
    ...MANUAL_JUNK_TYPES.filter(t => settings.junkTypes[t]),
    ...(settings.junkTypes.birdieEagle ? (['birdieEagle'] as const) : []),
  ];

  // Build audit rows — only holes with any junk
  const auditRows = Array.from({ length: 18 }, (_, i) => i + 1).filter(holeNum => {
    const holeJunk = junkDots[holeNum] || {};
    const hasManual = namedPlayers.some(p => (holeJunk[p.id] || []).length > 0);
    const hasAuto = settings.junkTypes.birdieEagle &&
      namedPlayers.some(p => getBirdieEagleDots(p.id, holeNum, scores, selectedCourse.holes) > 0);
    return hasManual || hasAuto;
  });

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

      {/* Hole-by-hole audit toggle */}
      {auditRows.length > 0 && (
        <>
          <button
            className="junk-audit-toggle"
            onClick={() => setShowAudit(v => !v)}
          >
            {showAudit ? '▲ Hide' : '▼ Show'} Hole-by-Hole Detail
          </button>

          {showAudit && (
            <div className="junk-audit-table">
              <div className="junk-audit-header">
                <span className="junk-audit-hole">Hole</span>
                {namedPlayers.map(p => (
                  <span key={p.id} className="junk-audit-player">{p.name.split(' ')[0]}</span>
                ))}
              </div>
              {auditRows.map(holeNum => {
                const holeJunk = junkDots[holeNum] || {};
                return (
                  <div key={holeNum} className="junk-audit-row">
                    <span className="junk-audit-hole">{holeNum}</span>
                    {namedPlayers.map(p => {
                      const manualTypes = (holeJunk[p.id] || []).filter(t => settings.junkTypes[t]);
                      const birdieEagleDots = settings.junkTypes.birdieEagle
                        ? getBirdieEagleDots(p.id, holeNum, scores, selectedCourse.holes)
                        : 0;
                      const parts: string[] = manualTypes.map(t => JUNK_LABELS[t]);
                      if (birdieEagleDots === 1) parts.push('Birdie');
                      if (birdieEagleDots === 3) parts.push('Eagle');
                      return (
                        <span key={p.id} className="junk-audit-player">
                          {parts.length > 0 ? parts.join(', ') : '—'}
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
