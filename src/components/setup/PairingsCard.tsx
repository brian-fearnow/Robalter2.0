import type { Player, MatchSegment, GameMode } from '../../types';

interface PairingsCardProps {
  gameMode: GameMode;
  activePlayers: Player[];
  segments: MatchSegment[];
  onTeamSelection: (segmentIndex: number, p1: string, p2: string) => void;
  getPlayerWheelCount: (playerId: string, currentSegmentIndex: number) => number;
  isPairingDuplicate: (player1Id: string, player2Id: string, currentSegmentIndex: number) => boolean;
  getTeamNamesByIds: (playerIds: string[], isFullName?: boolean) => string;
}

export function PairingsCard({
  gameMode,
  activePlayers,
  segments,
  onTeamSelection,
  getPlayerWheelCount,
  isPairingDuplicate,
  getTeamNamesByIds,
}: PairingsCardProps) {
  return (
    <div className="card">
      <h3>PAIRINGS</h3>
      {gameMode === 'four-ball' ? (
        <div className="seg-card">
          <h4>Match Pairings</h4>
          <div className="team-row">
            <span>Team 1:</span>
            <div className="team-selects-wrapper">
              <select
                value={segments[0].team1[0] || ''}
                onChange={e => onTeamSelection(0, e.target.value, segments[0].team1[1] || '')}
              >
                <option value="">P1</option>
                {activePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select
                value={segments[0].team1[1] || ''}
                onChange={e => onTeamSelection(0, segments[0].team1[0] || '', e.target.value)}
              >
                <option value="">P2</option>
                {activePlayers.map(p => (
                  <option key={p.id} value={p.id} disabled={p.id === (segments[0].team1[0] || '')}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          {segments[0].team2.length > 0 && (
            <div className="team-row opponent-row">
              <span>Team 2:</span>
              <div className="auto-pair-inline">{getTeamNamesByIds(segments[0].team2, true)}</div>
            </div>
          )}
        </div>
      ) : (
        [{ l: 'First Six', i: 0 }, { l: 'Second Six', i: 1 }, { l: 'Third Six', i: 2 }].map(({ l, i }) => (
          <div key={i} className="seg-card">
            <h4>{l}</h4>
            <div className="team-row">
              <span>{gameMode === 'wheel' ? 'Wheel:' : 'Team 1:'}</span>
              <div className="team-selects-wrapper">
                <select
                  value={segments[i].team1[0] || ''}
                  onChange={e => onTeamSelection(i, e.target.value, segments[i].team1[1] || '')}
                >
                  <option value="">P1</option>
                  {activePlayers.map(p => (
                    <option key={p.id} value={p.id} disabled={gameMode === 'wheel' && getPlayerWheelCount(p.id, i) >= 2}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={segments[i].team1[1] || ''}
                  onChange={e => onTeamSelection(i, segments[i].team1[0] || '', e.target.value)}
                >
                  <option value="">P2</option>
                  {activePlayers.map(p => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={
                        p.id === (segments[i].team1[0] || '') ||
                        (gameMode === 'wheel' && (
                          getPlayerWheelCount(p.id, i) >= 2 ||
                          isPairingDuplicate(segments[i].team1[0] || '', p.id, i)
                        ))
                      }
                    >
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {segments[i].team2.length > 0 && (
              <div className="team-row opponent-row">
                <span>{gameMode === 'wheel' ? 'Ops:' : 'Team 2:'}</span>
                <div className="auto-pair-inline">{getTeamNamesByIds(segments[i].team2, true)}</div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
