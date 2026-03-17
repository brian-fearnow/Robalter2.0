import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { AppState } from '../../hooks/useAppState';

interface BookItResultsProps {
  appState: AppState;
}

export function BookItResults({ appState }: BookItResultsProps) {
  const {
    activePlayers,
    scores,
    bookedHoles,
    settings,
    bookItStake,
    selectedCourse,
    computeBookItResults,
    getNetScore,
  } = appState;

  const [expandedPlayers, setExpandedPlayers] = useState<Record<string, boolean>>({});

  const togglePlayer = (id: string) =>
    setExpandedPlayers(prev => ({ ...prev, [id]: !prev[id] }));

  const res = computeBookItResults();
  const namedPlayers = activePlayers.filter(p => p.name);
  const holesRequired = settings.useBookItSegmented
    ? settings.bookItSegmentRequired * 3
    : settings.bookItHolesRequired;

  return (
    <div className="card result-seg-card">
      <h3>Book-It Results</h3>

      {/* Per-player booked holes summary */}
      {namedPlayers.map(player => {
        const booked = (bookedHoles[player.id] || []).slice().sort((a, b) => a - b);
        const netToPar = res.netToPar[player.id] ?? 0;
        const payout = res.payouts[player.id] ?? 0;
        const remaining = holesRequired - booked.length;
        const isExpanded = !!expandedPlayers[player.id];

        return (
          <div key={player.id} className="book-it-player-block">
            <div
              className="book-it-player-header"
              onClick={() => booked.length > 0 && togglePlayer(player.id)}
              style={{ cursor: booked.length > 0 ? 'pointer' : 'default' }}
            >
              <strong>{player.name}</strong>
              <span className={`book-it-count ${booked.length >= holesRequired ? 'booked-full' : ''}`}>
                {booked.length}/{holesRequired} booked
              </span>
              {remaining > 0 && (
                <span className="book-it-remaining">{remaining} left</span>
              )}
              <span className={`book-it-total-par ${netToPar < 0 ? 'under' : netToPar > 0 ? 'over' : 'even'}`}>
                {netToPar === 0 ? 'E' : netToPar > 0 ? `+${netToPar}` : `${netToPar}`}
              </span>
              <span className={`book-it-payout-inline ${payout >= 0 ? 'pos' : 'neg'}`}>
                {payout >= 0 ? `+$${payout}` : `-$${Math.abs(payout)}`}
              </span>
              {booked.length > 0 && (
                <span className="book-it-chevron">
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              )}
            </div>

            {isExpanded && booked.length > 0 && (
              <div className="book-it-holes-list">
                <div className="book-it-hole-row book-it-col-header">
                  <span className="bi-hole-num">Hole</span>
                  <span className="bi-gross">Gross</span>
                  <span className="bi-net">Net</span>
                  <span className="bi-to-par">+/-</span>
                </div>
                {booked.map(hNum => {
                  const hole = selectedCourse.holes.find(h => h.number === hNum);
                  const gross = scores[player.id]?.[hNum];
                  const net = getNetScore(player.id, hNum);
                  const toPar = net != null && hole ? net - hole.par : null;
                  return (
                    <div key={hNum} className="book-it-hole-row">
                      <span className="bi-hole-num">H{hNum}</span>
                      <span className="bi-gross">{gross ?? '—'}</span>
                      <span className="bi-net">{net ?? '—'}</span>
                      <span className={`bi-to-par ${toPar != null ? (toPar < 0 ? 'under' : toPar > 0 ? 'over' : 'even') : ''}`}>
                        {toPar != null ? (toPar === 0 ? 'E' : toPar > 0 ? `+${toPar}` : `${toPar}`) : '—'}
                      </span>
                    </div>
                  );
                })}
                <div className="book-it-hole-row total-row">
                  <span className="bi-hole-num"><strong>Total</strong></span>
                  <span className="bi-gross"></span>
                  <span className="bi-net"></span>
                  <span className={`bi-to-par ${netToPar < 0 ? 'under' : netToPar > 0 ? 'over' : 'even'}`}>
                    <strong>{netToPar === 0 ? 'E' : netToPar > 0 ? `+${netToPar}` : `${netToPar}`}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="bb-explanation">
        <p>Payouts based on net-to-par difference over booked holes × ${bookItStake}/stroke.</p>
        {settings.useBookItSegmented && (
          <p style={{ marginTop: '4px', color: 'var(--mackenzie-green)', fontWeight: '600' }}>
            Segmented mode: {settings.bookItSegmentRequired} holes per 6-hole segment.
          </p>
        )}
      </div>
    </div>
  );
}
