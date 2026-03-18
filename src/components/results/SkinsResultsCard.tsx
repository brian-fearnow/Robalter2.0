import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SkinsRoundState } from '../../hooks/useSkinsRound';

interface SkinsResultsCardProps {
  skinsState: SkinsRoundState;
}

function fmt(n: number): string {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

export function SkinsResultsCard({ skinsState }: SkinsResultsCardProps) {
  const [showHoleByHole, setShowHoleByHole] = useState(false);
  const { skinsResults, foursomes, buyIn, roomCode, roundId } = skinsState;

  if (!roundId) return null;

  if (!skinsResults || foursomes.length === 0) {
    return (
      <div className="card result-seg-card">
        <h3>SKINS {roomCode && <span className="skins-code-badge">{roomCode}</span>}</h3>
        <div className="no-data">No scores entered yet.</div>
      </div>
    );
  }

  const { holes, players, totalSkinsAwarded, totalPot, payoutPerSkin } = skinsResults;

  // Include foursomeId on each player so we can build compound keys for score lookups.
  const allPlayers = foursomes.flatMap(fs =>
    fs.players.filter(p => p.name).map(p => ({ ...p, foursomeId: fs.id, foursomeLabel: fs.label }))
  );

  const sortedPlayers = [...players].sort((a, b) => b.skinsWon - a.skinsWon || a.name.localeCompare(b.name));
  // Map uniqueId → player for fast winner-name lookups in the hole table.
  const playerByUniqueId = new Map(allPlayers.map(p => [`${p.foursomeId}:${p.id}`, p]));

  return (
    <div className="card result-seg-card">
      <h3>SKINS {roomCode && <span className="skins-code-badge">{roomCode}</span>}</h3>

      {/* Pot summary */}
      <div className="res-row">
        <span>Total pot ({allPlayers.length} players × {fmt(buyIn)})</span>
        <strong>{fmt(totalPot)}</strong>
      </div>
      {totalSkinsAwarded > 0 && (
        <div className="res-row">
          <span>Value per skin ({totalSkinsAwarded} awarded)</span>
          <strong>{fmt(payoutPerSkin)}</strong>
        </div>
      )}

      {/* Player results */}
      <div className="match-detail-group" style={{ marginTop: '0.5rem' }}>
        <div className="skins-res-header">
          <span>Player</span>
          <span>Skins</span>
          <span>Payout</span>
        </div>
        {sortedPlayers.map(p => (
          <div key={p.uniqueId} className="skins-res-row">
            <span>{p.name}</span>
            <span className={`skins-skin-count${p.skinsWon > 0 ? ' has-skins' : ''}`}>{p.skinsWon}</span>
            <span className={`skins-payout${p.totalPayout > 0 ? ' pos' : p.totalPayout < 0 ? ' neg' : ' zero'}`}>
              {p.totalPayout > 0 ? `+${fmt(p.totalPayout)}` : p.totalPayout < 0 ? `-${fmt(Math.abs(p.totalPayout))}` : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Hole-by-hole toggle */}
      <div className="skins-holes-toggle" onClick={() => setShowHoleByHole(v => !v)}>
        <span>HOLE-BY-HOLE</span>
        {showHoleByHole ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {showHoleByHole && (
        <div className="skins-hole-table-scroll">
          <table className="skins-hole-table">
            <thead>
              <tr>
                <th className="col-sticky">Hole</th>
                {allPlayers.map(p => (
                  <th key={`${p.foursomeId}:${p.id}`}>{p.name.split(' ')[0]}</th>
                ))}
                <th>Winner</th>
              </tr>
            </thead>
            <tbody>
              {holes.map(hole => {
                const winnerName = hole.skinAwarded
                  ? playerByUniqueId.get(hole.winners[0])?.name?.split(' ')[0] ?? '?'
                  : null;
                return (
                  <tr key={hole.holeNumber} className={hole.skinAwarded ? 'skin-won' : ''}>
                    <td className="col-sticky">{hole.holeNumber}</td>
                    {allPlayers.map(p => {
                      const uid = `${p.foursomeId}:${p.id}`;
                      const net = hole.allNetScores[uid];
                      const isWinner = hole.skinAwarded && hole.winners.includes(uid);
                      return (
                        <td key={uid} className={isWinner ? 'winner-cell' : ''}>
                          {net !== undefined ? net : '—'}
                        </td>
                      );
                    })}
                    <td className={hole.skinAwarded ? 'winner-cell' : 'tie-cell'}>
                      {winnerName ?? (hole.lowNet !== null ? 'Tie' : '—')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
