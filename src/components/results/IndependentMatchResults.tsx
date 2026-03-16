import { ChevronDown, ChevronUp, X } from 'lucide-react';
import type { AppState } from '../../hooks/useAppState';
import { AuditTable } from '../AuditTable';
import type { IndHoleAuditEntry } from '../../types';

interface IndependentMatchResultsProps {
  appState: AppState;
}

export function IndependentMatchResults({ appState }: IndependentMatchResultsProps) {
  const {
    independentMatches,
    indManualPresses,
    pressInputs, setPressInputs,
    showMatchDetails,
    getTeamNamesByIds,
    toggleMatchDetail,
    addIndManualPress,
    removeManualPress,
    computeIndependentMatchResult,
  } = appState;

  if (independentMatches.length === 0) return null;

  return (
    <div className="card independent-results-card">
      <h3>INDEPENDENT MATCHES</h3>
      {independentMatches.map(match => {
        const res = computeIndependentMatchResult(match);
        const mPrs = indManualPresses[match.id] || { overall: [], front: [], back: [] };

        return (
          <div key={match.id} className="im-result-group">
            <div className="im-res-main" onClick={() => toggleMatchDetail(match.id)}>
              <span>{getTeamNamesByIds([match.player1Id])} vs {getTeamNamesByIds([match.player2Id])}</span>
              <div className="im-res-summary-group">
                <strong>{res.payout === 0 ? 'AS' : `${res.payout > 0 ? '+' : ''}$${res.payout}`}</strong>
                {showMatchDetails[match.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {showMatchDetails[match.id] && (
              <div className="im-audit-container">
                {match.type === '18-hole' ? (
                  <AuditTable
                    entries={res.overall.holeByHole}
                    label1={getTeamNamesByIds([match.player1Id])}
                    label2={getTeamNamesByIds([match.player2Id])}
                    isIndependent
                  />
                ) : (
                  <div className="im-nassau-audit">
                    <div className="audit-table-group">
                      <div className="audit-label">Front 9</div>
                      <AuditTable
                        entries={(res.front?.holeByHole || []) as IndHoleAuditEntry[]}
                        label1={getTeamNamesByIds([match.player1Id])}
                        label2={getTeamNamesByIds([match.player2Id])}
                        isIndependent
                      />
                    </div>
                    <div className="audit-table-group">
                      <div className="audit-label">Back 9</div>
                      <AuditTable
                        entries={(res.back?.holeByHole || []) as IndHoleAuditEntry[]}
                        label1={getTeamNamesByIds([match.player1Id])}
                        label2={getTeamNamesByIds([match.player2Id])}
                        isIndependent
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {match.type === '18-hole' ? (
              <div className="im-leg-row">
                <span>Full 18:</span>
                <span className="im-leg-status">
                  {res.display} {res.overall && res.overall.score !== 0 ? `($${match.stake})` : ''}
                </span>
              </div>
            ) : (
              <div className="im-nassau-legs">
                <div className="im-leg-row">
                  <span>Front 9:</span>
                  <span className="im-leg-status">
                    {res.front ? (res.front.score === 0 ? 'AS' : `${res.front.score > 0 ? getTeamNamesByIds([match.player1Id]) : getTeamNamesByIds([match.player2Id])} ${Math.abs(res.front.score)} UP ($${match.stake9 || 5})`) : ''}
                  </span>
                </div>
                <div className="im-leg-row">
                  <span>Back 9:</span>
                  <span className="im-leg-status">
                    {res.back ? (res.back.score === 0 ? 'AS' : `${res.back.score > 0 ? getTeamNamesByIds([match.player1Id]) : getTeamNamesByIds([match.player2Id])} ${Math.abs(res.back.score)} UP ($${match.stake9 || 5})`) : ''}
                  </span>
                </div>
                <div className="im-leg-row">
                  <span>Full 18:</span>
                  <span className="im-leg-status">
                    {res.overall ? (res.overall.score === 0 ? 'AS' : `${res.overall.score > 0 ? getTeamNamesByIds([match.player1Id]) : getTeamNamesByIds([match.player2Id])} ${Math.abs(res.overall.score)} UP ($${match.stake18 || 10})`) : ''}
                  </span>
                </div>
              </div>
            )}

            {!match.useAutoPress && (
              <div className="manual-press-entry-group">
                <div className="manual-press-input-row compact">
                  <input
                    type="number"
                    placeholder="H#"
                    value={pressInputs[`ind-${match.id}`] || ''}
                    onChange={e => setPressInputs({ ...pressInputs, [`ind-${match.id}`]: e.target.value })}
                  />
                  <div className="compact-btn-column">
                    {match.type === '18-hole' ? (
                      <button className="add-press-btn green sm" onClick={() => addIndManualPress(match.id, 'overall')}>Press</button>
                    ) : (
                      <>
                        <button className="add-press-btn green sm" onClick={() => addIndManualPress(match.id, 'front')}>Front 9</button>
                        <button className="add-press-btn green sm" onClick={() => addIndManualPress(match.id, 'back')}>Back 9</button>
                        <button className="add-press-btn green sm" onClick={() => addIndManualPress(match.id, 'overall')}>Overall</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {res.pressDetail.length > 0 && (
              <div className="im-press-breakdown">
                {res.pressDetail.map((p, pi) => {
                  const typeKey = p.label?.toLowerCase()?.includes('front') ? 'front' : p.label?.toLowerCase()?.includes('back') ? 'back' : 'overall';
                  const isManual = mPrs[typeKey as 'overall' | 'front' | 'back']?.includes(p.startHole);
                  const pressDetailId = `ind-${match.id}-p-${p.startHole}-${typeKey}`;

                  return (
                    <div key={pi} className="press-audit-group">
                      <div className="im-press-row clickable" onClick={() => toggleMatchDetail(pressDetailId)}>
                        <span>
                          {p.label ? `${p.label} ` : ''}Press (Hole {p.startHole})
                          {isManual && (
                            <button className="delete-btn-xs" onClick={e => {
                              e.stopPropagation();
                              removeManualPress('ind', match.id, p.startHole, typeKey as 'overall' | 'front' | 'back');
                            }}>
                              <X size={10} />
                            </button>
                          )}
                        </span>
                        <div className="im-press-status-group">
                          <span className="im-press-status">{p.display} (${Math.abs(p.payout)})</span>
                          {showMatchDetails[pressDetailId] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </div>
                      </div>
                      {showMatchDetails[pressDetailId] && p.holeByHole && (
                        <AuditTable
                          entries={p.holeByHole as IndHoleAuditEntry[]}
                          label1={getTeamNamesByIds([match.player1Id])}
                          label2={getTeamNamesByIds([match.player2Id])}
                          isPressAudit
                          isIndependent
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
