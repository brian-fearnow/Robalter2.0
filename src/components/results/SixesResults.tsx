import { ChevronDown, ChevronUp, X } from 'lucide-react';
import type { AppState } from '../../hooks/useAppState';
import { AuditTable } from '../AuditTable';

interface SixesResultsProps {
  appState: AppState;
}

export function SixesResults({ appState }: SixesResultsProps) {
  const {
    segments,
    gameMode,
    settings,
    manualPresses,
    mainStake,
    pressStake,
    pressInputs, setPressInputs,
    showMatchDetails,
    getTeamNamesByIds,
    toggleMatchDetail,
    addSegmentManualPress,
    removeManualPress,
    computeSegmentFull,
  } = appState;

  const segLabels = [
    { l: 'First Six', id: 0 },
    { l: 'Second Six', id: 1 },
    { l: 'Third Six', id: 2 },
  ];

  return (
    <>
      {segLabels.map(seg => {
        const res = computeSegmentFull(seg.id);
        const mPrs = manualPresses[seg.id] || { 0: [] };

        return (
          <div key={seg.id} className="card result-seg-card">
            <h3>
              {seg.l}
              {gameMode === 'wheel' && segments[seg.id].team1.length === 2
                ? ` Wheel - ${getTeamNamesByIds(segments[seg.id].team1, true)}`
                : ''}
            </h3>
            {res.matches.map((m, mi) => {
              const winN = m.result.main > 0
                ? getTeamNamesByIds(segments[seg.id].team1)
                : getTeamNamesByIds(m.opponent);
              const detailId = `sixes-${seg.id}-${mi}`;
              const mainAmt = m.result.main === 0 ? 0 : mainStake;
              const matchManual = (mPrs as Record<number, number[]>)[mi] || [];

              return (
                <div key={mi} className="match-detail-group">
                  <div className="res-row main" onClick={() => toggleMatchDetail(detailId)}>
                    <div className="res-main-label">
                      <div className="teams-vs-block">
                        {gameMode === 'sixes' ? (
                          <>
                            <div className="team-names">{getTeamNamesByIds(segments[seg.id].team1)} vs</div>
                            <div className="team-names">{getTeamNamesByIds(m.opponent)}</div>
                          </>
                        ) : (
                          <div className="team-names">{getTeamNamesByIds(m.opponent)}</div>
                        )}
                      </div>
                      {showMatchDetails[detailId] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                    <strong>
                      {m.result.main === 0 ? 'AS' : `${winN} ${Math.abs(m.result.main)} UP`}
                      {mainAmt > 0 ? ` ($${mainAmt})` : ''}
                    </strong>
                  </div>
                  {showMatchDetails[detailId] && (
                    <AuditTable
                      entries={m.result.holeByHole}
                      label1={getTeamNamesByIds(segments[seg.id].team1)}
                      label2={getTeamNamesByIds(m.opponent)}
                    />
                  )}
                  {!settings.useAutoPress && (
                    <div className="manual-press-entry-group">
                      <div className="manual-press-input-row">
                        <input
                          type="number"
                          placeholder="H#"
                          value={pressInputs[`seg-${seg.id}-${mi}`] || ''}
                          onChange={e => setPressInputs({ ...pressInputs, [`seg-${seg.id}-${mi}`]: e.target.value })}
                        />
                        <button className="add-press-btn green sm" onClick={() => addSegmentManualPress(seg.id, mi)}>Press</button>
                      </div>
                    </div>
                  )}
                  {m.result.presses.map((p, pi) => {
                    const pAmt = p.score === 0 ? 0 : pressStake;
                    const pressDetailId = `sixes-${seg.id}-${mi}-p-${p.startHole}`;

                    return (
                      <div key={pi} className="press-audit-group">
                        <div className="res-row press" onClick={() => toggleMatchDetail(pressDetailId)}>
                          <div className="res-main-label">
                            <span>
                              Press (#{p.startHole})
                              {matchManual.includes(p.startHole) && (
                                <button className="delete-btn-xs" onClick={e => { e.stopPropagation(); removeManualPress('segment', seg.id.toString(), p.startHole, mi); }}>
                                  <X size={10} />
                                </button>
                              )}
                            </span>
                            {showMatchDetails[pressDetailId] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </div>
                          <strong>
                            {p.score === 0 ? 'AS' : `${p.score > 0 ? getTeamNamesByIds(segments[seg.id].team1) : getTeamNamesByIds(m.opponent)} ${Math.abs(p.score)} UP`}
                            {pAmt > 0 ? ` ($${pAmt})` : ''}
                          </strong>
                        </div>
                        {showMatchDetails[pressDetailId] && p.holeByHole && (
                          <AuditTable
                            entries={p.holeByHole as import('../../types').HoleAuditEntry[]}
                            label1={getTeamNamesByIds(segments[seg.id].team1)}
                            label2={getTeamNamesByIds(m.opponent)}
                            isPressAudit
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
