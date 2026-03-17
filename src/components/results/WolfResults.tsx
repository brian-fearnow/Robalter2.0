import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { AppState } from '../../hooks/useAppState';

interface WolfResultsProps {
  appState: AppState;
}

export function WolfResults({ appState }: WolfResultsProps) {
  const { activePlayers, wolfStake, wolfDecisions, computeWolfResults } = appState;
  const [showHoles, setShowHoles] = useState(false);

  const res = computeWolfResults();
  const namedPlayers = activePlayers.filter(p => p.name);
  const decidedHoles = res.holeResults.filter(hr => hr.decision !== null);

  // Dynamic grid: all columns equal width (hole + one per player)
  const colCount = namedPlayers.length + 1;
  const gridCols = `repeat(${colCount}, 1fr)`;

  return (
    <div className="card result-seg-card">
      <h3>Wolf Results</h3>

      <div className="wolf-results-grid">
        <div className="wolf-res-header">
          <span>Player</span>
          <span>Points</span>
          <span>Payout</span>
        </div>
        {namedPlayers.map(player => {
          const points = res.totalPoints[player.id] ?? 0;
          const payout = res.payouts[player.id] ?? 0;
          return (
            <div key={player.id} className="wolf-res-row">
              <strong>{player.name}</strong>
              <span className={`wolf-pts ${points > 0 ? 'pos' : points < 0 ? 'neg' : ''}`}>
                {points > 0 ? `+${points}` : `${points}`}
              </span>
              <strong className={payout >= 0 ? 'pos' : 'neg'}>
                {payout >= 0 ? `+$${payout}` : `-$${Math.abs(payout)}`}
              </strong>
            </div>
          );
        })}
      </div>

      {decidedHoles.length > 0 && (
        <div
          className="wolf-holes-toggle"
          onClick={() => setShowHoles(p => !p)}
        >
          <span>Hole Breakdown ({decidedHoles.length} holes)</span>
          {showHoles ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      )}

      {showHoles && (
        <div className="wolf-hole-breakdown">
          {/* Header row */}
          <div className="wolf-hole-row wolf-hole-header" style={{ gridTemplateColumns: gridCols }}>
            <span></span>
            {namedPlayers.map(p => (
              <span key={p.id} title={p.name}>{p.name.split(' ')[0]}</span>
            ))}
          </div>

          {res.holeResults.map(hr => {
            if (!hr.decision) return null;
            const isLoneWolf = hr.decision.partnerId === null;
            const isBlindWolf = hr.decision.blindWolf;
            const rowClass = isBlindWolf
              ? 'wolf-hole-row blind-wolf-row'
              : isLoneWolf
              ? 'wolf-hole-row lone-wolf-row'
              : 'wolf-hole-row';

            return (
              <div
                key={hr.holeNumber}
                className={rowClass}
                style={{ gridTemplateColumns: gridCols }}
              >
                <span className="wolf-hole-num">H{hr.holeNumber}</span>
                {namedPlayers.map(p => {
                  const pts = hr.pointDeltas[p.id] ?? 0;
                  const isWolf = p.id === hr.wolfPlayerId;
                  return (
                    <span
                      key={p.id}
                      className={`${pts > 0 ? 'pos' : pts < 0 ? 'neg' : 'wolf-pts-zero'}${isWolf ? ' wolf-cell-wolf' : ''}`}
                    >
                      {pts > 0 ? `+${pts}` : pts !== 0 ? `${pts}` : '—'}
                    </span>
                  );
                })}
              </div>
            );
          }).filter(Boolean)}
        </div>
      )}

      <div className="bb-explanation">
        <p>
          If wolf selects a partner, each player wins or loses 1 point per hole won or lost.
          Lone wolf wins or loses 2 points, while all other players win or lose 1 point.
          Blind wolf wins or loses 4 points, while all other players win or lose 2 points.
          Payout: pts × ${wolfStake}/pt.
        </p>
        {Object.keys(wolfDecisions).length === 0 && (
          <p style={{ marginTop: '4px', color: 'var(--heritage-gold)', fontWeight: '600' }}>
            Enter wolf decisions in the Scores tab.
          </p>
        )}
      </div>
    </div>
  );
}
