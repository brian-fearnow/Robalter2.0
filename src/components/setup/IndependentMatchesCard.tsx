import { ChevronDown, ChevronUp, Plus, Trash2, RotateCcw } from 'lucide-react';
import type { IndependentMatch, Player } from '../../types';

interface IndependentMatchesCardProps {
  independentMatches: IndependentMatch[];
  activePlayers: Player[];
  players: Player[];
  visibleIndependent: boolean;
  imStrokeInputs: { [matchId: string]: string };
  pressInputs: { [key: string]: string };
  onToggleIndependent: () => void;
  onAddMatch: () => void;
  onUpdateMatch: (id: string, field: keyof IndependentMatch, value: IndependentMatch[keyof IndependentMatch]) => void;
  onDeleteMatch: (id: string) => void;
  onImStrokeChange: (id: string, value: string) => void;
  onSetImStrokeInputs: (v: React.SetStateAction<{ [matchId: string]: string }>) => void;
  onSetPressInputs: (v: React.SetStateAction<{ [key: string]: string }>) => void;
  setIndependentMatches: (v: React.SetStateAction<IndependentMatch[]>) => void;
}

import type React from 'react';

export function IndependentMatchesCard({
  independentMatches,
  activePlayers,
  players,
  visibleIndependent,
  imStrokeInputs,
  onToggleIndependent,
  onAddMatch,
  onUpdateMatch,
  onDeleteMatch,
  onImStrokeChange,
  onSetImStrokeInputs,
  setIndependentMatches,
}: IndependentMatchesCardProps) {
  return (
    <div className="card independent-matches-card">
      <div className="collapsible-header" onClick={onToggleIndependent}>
        <h3>INDEPENDENT MATCHES</h3>
        {visibleIndependent ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {visibleIndependent && (
        <div className="independent-matches-grid">
          {independentMatches.map(match => {
            const p1 = players.find(p => p.id === match.player1Id);
            const p2 = players.find(p => p.id === match.player2Id);
            const diff = (p1?.courseHandicap ?? 0) - (p2?.courseHandicap ?? 0);
            const recipient = diff >= 0 ? p1?.name?.split(' ')[0] : p2?.name?.split(' ')[0];

            return (
              <div key={match.id} className="independent-match-row">
                <div className="im-header-row">
                  <div className="im-pair">
                    <select value={match.player1Id} onChange={e => onUpdateMatch(match.id, 'player1Id', e.target.value)}>
                      {activePlayers.map(p => <option key={p.id} value={p.id}>{p.name || `P${p.id}`}</option>)}
                    </select>
                    <span>vs</span>
                    <select value={match.player2Id} onChange={e => onUpdateMatch(match.id, 'player2Id', e.target.value)}>
                      {activePlayers.map(p => <option key={p.id} value={p.id}>{p.name || `P${p.id}`}</option>)}
                    </select>
                  </div>
                </div>

                <div className="im-stroke-adjustment-row">
                  <div className="im-calc-strokes">
                    {(!p1 || !p2) ? <span>...</span> : (
                      diff === 0 && match.manualStrokes === undefined ? (
                        <span>Even match</span>
                      ) : (
                        <div className="im-stroke-editor">
                          <span>{recipient} receives</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="im-stroke-input-compact"
                            value={imStrokeInputs[match.id] !== undefined ? imStrokeInputs[match.id] : (match.manualStrokes ?? Math.abs(diff)).toString()}
                            onChange={e => onImStrokeChange(match.id, e.target.value)}
                            onBlur={() => {
                              const val = imStrokeInputs[match.id];
                              if (val === '' || val === '-' || val === '.') {
                                onSetImStrokeInputs(prev => {
                                  const next = { ...prev };
                                  delete next[match.id];
                                  return next;
                                });
                              }
                            }}
                          />
                          <span>strokes</span>
                          {match.manualStrokes !== undefined && (
                            <button
                              className="reset-strokes-btn sm"
                              onClick={() => {
                                onUpdateMatch(match.id, 'manualStrokes', undefined);
                                onSetImStrokeInputs(prev => {
                                  const next = { ...prev };
                                  delete next[match.id];
                                  return next;
                                });
                              }}
                              title="Reset to calculated"
                            >
                              <RotateCcw size={10} />
                            </button>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="im-settings">
                  <div className="im-type-select-row">
                    <select value={match.type} onChange={e => onUpdateMatch(match.id, 'type', e.target.value as IndependentMatch['type'])}>
                      <option value="18-hole">18-Hole Bet</option>
                      <option value="nassau">Nassau Bet</option>
                    </select>
                  </div>
                  {match.type === '18-hole' ? (
                    <div className="im-stake-column">
                      <div className="im-stake-input">
                        <span>Main $</span>
                        <input type="number" value={match.stake || ''} placeholder="0"
                          onChange={e => setIndependentMatches(prev => prev.map(im => im.id === match.id ? { ...im, stake: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) } : im))} />
                      </div>
                      <div className="im-stake-input">
                        <span>Press $</span>
                        <input type="number" value={match.pressStake || ''} placeholder="0"
                          onChange={e => onUpdateMatch(match.id, 'pressStake', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} />
                      </div>
                    </div>
                  ) : (
                    <div className="nassau-stakes-group-vertical">
                      <div className="im-stake-row">
                        <div className="im-stake-input"><span>Front $</span><input type="number" value={match.stake9 || ''} placeholder="0" onChange={e => onUpdateMatch(match.id, 'stake9', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} /></div>
                        <div className="im-stake-input"><span>Press-Front $</span><input type="number" value={match.pressStake9 || ''} placeholder="0" onChange={e => onUpdateMatch(match.id, 'pressStake9', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} /></div>
                      </div>
                      <div className="im-stake-row">
                        <div className="im-stake-input"><span>Back $</span><input type="number" value={match.stake9 || ''} placeholder="0" onChange={e => onUpdateMatch(match.id, 'stake9', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} /></div>
                        <div className="im-stake-input"><span>Press-Back $</span><input type="number" value={match.pressStake9 || ''} placeholder="0" onChange={e => onUpdateMatch(match.id, 'pressStake9', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} /></div>
                      </div>
                      <div className="im-stake-row">
                        <div className="im-stake-input"><span>Overall $</span><input type="number" value={match.stake18 || ''} placeholder="0" onChange={e => onUpdateMatch(match.id, 'stake18', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} /></div>
                        <div className="im-stake-input"><span>Press-Overall $</span><input type="number" value={match.pressStake18 || ''} placeholder="0" onChange={e => onUpdateMatch(match.id, 'pressStake18', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} /></div>
                      </div>
                    </div>
                  )}
                  <button className="icon-btn remove-im" onClick={() => onDeleteMatch(match.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          <button className="add-btn" onClick={onAddMatch} disabled={activePlayers.filter(p => p.name).length < 2}>
            <Plus size={14} /> Add Match
          </button>
        </div>
      )}
    </div>
  );
}
