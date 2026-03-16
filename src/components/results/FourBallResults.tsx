import { ChevronDown, ChevronUp, X } from 'lucide-react';
import type { AppState } from '../../hooks/useAppState';
import type { FourBallSideResult } from '../../types';
import { AuditTable } from '../AuditTable';

interface FourBallResultsProps {
  appState: AppState;
}

export function FourBallResults({ appState }: FourBallResultsProps) {
  const {
    segments,
    fourBallStakes,
    settings,
    manualPresses,
    pressInputs, setPressInputs,
    showMatchDetails,
    getTeamNamesByIds,
    toggleMatchDetail,
    addSegmentManualPress,
    removeManualPress,
    computeFourBallFull,
  } = appState;

  const res = computeFourBallFull();
  const team1 = segments[0].team1;
  const team2 = segments[0].team2;

  if (team1.length < 2 || team2.length < 2) {
    return (
      <div className="card result-seg-card">
        <h3>Four Ball Match</h3>
        <div className="no-data">Set pairings to see results</div>
      </div>
    );
  }

  const renderNassauSide = (side: FourBallSideResult | null, label: string, legIdx: number) => {
    if (!side) return null;
    const winner = side.score > 0 ? getTeamNamesByIds(team1) : getTeamNamesByIds(team2);
    const up = side.score === 0 ? 'AS' : `${winner} ${Math.abs(side.score)} UP`;
    const detailId = `fourball-${legIdx}`;
    const legMainStake = legIdx === 0 ? fourBallStakes.mainFront : legIdx === 1 ? fourBallStakes.mainBack : fourBallStakes.mainOverall;
    const mainPayout = side.score === 0 ? 0 : legMainStake;

    return (
      <div className="match-detail-group">
        <div className="res-row main" onClick={() => toggleMatchDetail(detailId)}>
          <div className="res-main-label">
            <span>{label}</span>
            {showMatchDetails[detailId] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
          <strong>{up} {mainPayout > 0 ? `($${mainPayout})` : ''}</strong>
        </div>
        {showMatchDetails[detailId] && (
          <AuditTable
            entries={side.holeByHole}
            label1={getTeamNamesByIds(team1)}
            label2={getTeamNamesByIds(team2)}
          />
        )}
        {!settings.useAutoPress && (
          <div className="manual-press-entry-group">
            <div className="manual-press-input-row">
              <input
                type="number"
                placeholder="H#"
                value={pressInputs[`seg-0-${legIdx}`] || ''}
                onChange={e => setPressInputs({ ...pressInputs, [`seg-0-${legIdx}`]: e.target.value })}
              />
              <button className="add-press-btn green sm" onClick={() => addSegmentManualPress(0, legIdx)}>Press</button>
            </div>
          </div>
        )}
        {side.presses.map((p, pi) => {
          const legPressStake = legIdx === 0 ? fourBallStakes.pressFront : legIdx === 1 ? fourBallStakes.pressBack : fourBallStakes.pressOverall;
          const pressPayout = p.score === 0 ? 0 : legPressStake;
          const isManual = manualPresses[0]?.[legIdx]?.includes(p.startHole);
          const pressDetailId = `fourball-${legIdx}-p-${p.startHole}`;

          return (
            <div key={pi} className="press-audit-group">
              <div className="res-row press" onClick={() => toggleMatchDetail(pressDetailId)}>
                <div className="res-main-label">
                  <span>
                    Press (#{p.startHole})
                    {isManual && (
                      <button className="delete-btn-xs" onClick={e => { e.stopPropagation(); removeManualPress('segment', '0', p.startHole, legIdx); }}>
                        <X size={10} />
                      </button>
                    )}
                  </span>
                  {showMatchDetails[pressDetailId] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </div>
                <strong>
                  {p.score === 0 ? 'AS' : `${p.score > 0 ? getTeamNamesByIds(team1) : getTeamNamesByIds(team2)} ${Math.abs(p.score)} UP`}
                  {pressPayout > 0 ? ` ($${pressPayout})` : ''}
                </strong>
              </div>
              {showMatchDetails[pressDetailId] && p.holeByHole && (
                <AuditTable
                  entries={p.holeByHole as import('../../types').HoleAuditEntry[]}
                  label1={getTeamNamesByIds(team1)}
                  label2={getTeamNamesByIds(team2)}
                  isPressAudit
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="card result-seg-card">
      <h3>Four Ball Match</h3>
      <div className="team-summary-header">{getTeamNamesByIds(team1)} vs {getTeamNamesByIds(team2)}</div>
      {fourBallStakes.type === 'nassau' ? (
        <>
          {renderNassauSide(res.front, 'Front 9', 0)}
          {renderNassauSide(res.back, 'Back 9', 1)}
          {renderNassauSide(res.overall, 'Full 18', 2)}
        </>
      ) : (
        renderNassauSide(res.overall, '18-Hole Match', 2)
      )}
    </div>
  );
}
