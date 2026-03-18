import { useState, Fragment } from 'react';
import { ChevronDown, ChevronUp, Trash2, LogOut, Settings, X } from 'lucide-react';
import type { Player, Course } from '../../types';
import type { SkinsRoundState } from '../../hooks/useSkinsRound';

interface SkinsCardProps {
  skinsState: SkinsRoundState;
  activePlayers: Player[];
  onCourseChange: (course: Course) => void;
}

type SubView = null | 'create' | 'join' | 'edit';

/**
 * Default stroke inputs for the Adjust Strokes grid.
 * For skins (baseline = 0) a player's total strokes = courseHandicap.
 * The value stored is the pre-half-stroke relative handicap (matching
 * how StrokeSummary stores manualRelativeStrokes).
 */
function defaultStrokeInputs(players: Player[]): Record<string, string> {
  return Object.fromEntries(players.filter(p => p.name).map(p => [p.id, String(p.courseHandicap)]));
}

/** Build player array with manualRelativeStrokes set from the stroke inputs map */
function applyStrokeInputs(players: Player[], strokeInputs: Record<string, string>): Player[] {
  return players.map(p => ({
    ...p,
    manualRelativeStrokes: parseFloat(strokeInputs[p.id] ?? '') || 0,
  }));
}

export function SkinsCard({ skinsState, activePlayers, onCourseChange }: SkinsCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [subView, setSubView] = useState<SubView>(null);
  const [buyInInput, setBuyInInput] = useState('50');
  const [useHalfStrokes, setUseHalfStrokes] = useState(false);
  const [useManualSkinsStrokes, setUseManualSkinsStrokes] = useState(false);
  const [adjustStrokes, setAdjustStrokes] = useState(false);
  const [strokeInputs, setStrokeInputs] = useState<Record<string, string>>({});
  const [joinCode, setJoinCode] = useState('');

  const namedPlayers = activePlayers.filter(p => p.name);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(namedPlayers.map(p => p.id));

  // Edit-mode local state (mirrors active round values when opened)
  const [editBuyInInput, setEditBuyInInput] = useState('0');
  const [editHalfStrokes, setEditHalfStrokes] = useState(false);
  const [editManualSkinsStrokes, setEditManualSkinsStrokes] = useState(false);
  const [editAdjustStrokes, setEditAdjustStrokes] = useState(false);
  const [editStrokeInputs, setEditStrokeInputs] = useState<Record<string, string>>({});
  const [editSelectedIds, setEditSelectedIds] = useState<string[]>([]);
  const [editOtherStrokeInputs, setEditOtherStrokeInputs] = useState<Record<string, Record<string, string>>>({});

  const {
    roundId, foursomeId, round,
    roomCode, buyIn: activeBuyIn, useHalfStrokes: activeHalfStrokes,
    useManualSkinsStrokes: activeManualSkinsStrokes,
    myPlayers: skinsPlayers,
    foursomes, isHost, recentRooms, status, error,
    createRound, joinRound, leaveRound, deleteRound, updateSettings, updateMyGroupPlayers, removeGroup, updateOtherFoursomePlayers,
  } = skinsState;

  // Build a lookup from the skins-specific player list (has correct manualRelativeStrokes)
  const skinsPlayerMap = Object.fromEntries(skinsPlayers.map(p => [p.id, p]));

  const inRound = !!roundId;
  const hasPlayers = namedPlayers.length > 0;

  // True when the host has removed this group: we have a roundId and foursomeId but
  // the round data is loaded and our foursome no longer appears in it.
  const wasRemoved = !isHost && inRound && round !== null && !!foursomeId
    && !foursomes.some(fs => fs.id === foursomeId);

  const currentNamedIds = namedPlayers.map(p => p.id);
  const effectiveSelectedIds = selectedPlayerIds.filter(id => currentNamedIds.includes(id));
  const selectedPlayers = activePlayers.filter(p => effectiveSelectedIds.includes(p.id));

  // --- Create ---

  const handleCreate = async () => {
    if (selectedPlayers.length === 0) return;
    const playersToSend = adjustStrokes
      ? applyStrokeInputs(selectedPlayers, strokeInputs)
      : selectedPlayers;
    await createRound(parseFloat(buyInInput) || 0, useHalfStrokes, adjustStrokes && useManualSkinsStrokes, playersToSend);
    setSubView(null);
  };

  const openCreate = () => {
    setSelectedPlayerIds(currentNamedIds);
    setUseHalfStrokes(false);
    setUseManualSkinsStrokes(false);
    setAdjustStrokes(false);
    setStrokeInputs(defaultStrokeInputs(namedPlayers));
    setSubView('create');
  };

  const toggleAdjustStrokes = () => {
    const next = !adjustStrokes;
    setAdjustStrokes(next);
    setUseManualSkinsStrokes(next);
    if (next) {
      setStrokeInputs(defaultStrokeInputs(selectedPlayers));
    }
  };

  // Half-strokes change: no need to recalculate stroke inputs
  // (inputs store pre-half-stroke relative handicap, matching StrokeSummary)
  const handleHalfStrokesChange = (checked: boolean) => {
    setUseHalfStrokes(checked);
  };

  // --- Join ---

  const handleJoin = async (code = joinCode) => {
    if (!code.trim() || selectedPlayers.length === 0) return;
    const playersToSend = adjustStrokes
      ? applyStrokeInputs(selectedPlayers, strokeInputs)
      : selectedPlayers;
    const courseMismatch = await joinRound(code.trim(), playersToSend);
    if (courseMismatch) {
      // The host is playing a different course. Confirm and switch, then retry.
      const msg = `This skins game is being played on "${courseMismatch.name}". Your course will be changed to match. Continue?`;
      if (!window.confirm(msg)) return;
      onCourseChange(courseMismatch);
      // Re-attempt with skipCourseCheck=true since course state hasn't re-rendered yet
      await joinRound(code.trim(), playersToSend, true);
    }
    setSubView(null);
    setJoinCode('');
  };

  const openJoin = () => {
    setSelectedPlayerIds(currentNamedIds);
    setAdjustStrokes(false);
    setStrokeInputs(defaultStrokeInputs(namedPlayers));
    setSubView('join');
  };

  // --- Leave / Delete ---

  const handleLeave = () => {
    if (window.confirm(`Leave skins game "${roomCode}"? Your group will be removed from the skins calculations.`)) {
      leaveRound(true);
      setSubView(null);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete skins game "${roomCode}" from the server? This will remove it for all foursomes.`)) {
      await deleteRound();
      setSubView(null);
    }
  };

  // --- Edit ---

  const openEdit = () => {
    setEditBuyInInput(String(activeBuyIn));
    setEditHalfStrokes(activeHalfStrokes);
    setEditManualSkinsStrokes(activeManualSkinsStrokes);
    setEditAdjustStrokes(activeManualSkinsStrokes);
    // Seed from the actual current skins participants, not all named players
    const currentSkinsIds = skinsPlayers.map(p => p.id);
    setEditSelectedIds(currentSkinsIds);
    // Pre-populate from saved skins strokes when manual mode was previously set
    const strokeInputsToUse = activeManualSkinsStrokes
      ? Object.fromEntries(namedPlayers.map(p => [p.id, String(skinsPlayerMap[p.id]?.manualRelativeStrokes ?? p.courseHandicap)]))
      : defaultStrokeInputs(namedPlayers);
    setEditStrokeInputs(strokeInputsToUse);
    // Seed stroke inputs for non-host foursomes
    const otherInputs: Record<string, Record<string, string>> = {};
    otherFoursomes.forEach(fs => {
      const fsPlayers = (fs.players ?? []).filter(p => p.name);
      otherInputs[fs.id] = Object.fromEntries(
        fsPlayers.map(p => [p.id, String(activeManualSkinsStrokes ? (p.manualRelativeStrokes ?? p.courseHandicap) : p.courseHandicap)])
      );
    });
    setEditOtherStrokeInputs(otherInputs);
    setSubView('edit');
  };

  const toggleEditAdjustStrokes = () => {
    const next = !editAdjustStrokes;
    setEditAdjustStrokes(next);
    setEditManualSkinsStrokes(next);
    if (next) {
      const editPlayers = activePlayers.filter(p => editSelectedIds.includes(p.id));
      setEditStrokeInputs(defaultStrokeInputs(editPlayers));
    }
  };

  const handleEditHalfStrokesChange = (checked: boolean) => {
    setEditHalfStrokes(checked);
  };

  const handleSaveEdit = async () => {
    const players = activePlayers.filter(p => editSelectedIds.includes(p.id));
    if (players.length === 0) return; // require at least one player
    if (isHost) {
      const playersToSend = editAdjustStrokes ? applyStrokeInputs(players, editStrokeInputs) : players;
      await updateSettings(parseFloat(editBuyInInput) || 0, editHalfStrokes, editAdjustStrokes && editManualSkinsStrokes, playersToSend);
      // Update stroke values for non-host foursomes if adjust strokes is on
      if (editAdjustStrokes) {
        for (const fs of otherFoursomes) {
          const fsPlayers = (fs.players ?? []).filter(p => p.name);
          if (fsPlayers.length === 0) continue;
          const updated = fsPlayers.map(p => ({
            ...p,
            manualRelativeStrokes: parseFloat(editOtherStrokeInputs[fs.id]?.[p.id] ?? '') || 0,
          }));
          await updateOtherFoursomePlayers(fs.id, updated);
        }
      }
    } else {
      const playersToSend = editAdjustStrokes ? applyStrokeInputs(players, editStrokeInputs) : players;
      await updateMyGroupPlayers(playersToSend);
    }
    setSubView(null);
  };

  const toggleEditPlayer = (id: string, checked: boolean) => {
    setEditSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  const togglePlayer = (id: string, checked: boolean) => {
    setSelectedPlayerIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  // Non-host foursomes (host can remove these)
  const otherFoursomes = isHost ? foursomes.filter(fs => fs.id !== foursomes[0]?.id) : [];

  // --- Player grid renderer ---

  function renderPlayerGrid(
    players: Player[],
    checkedIds: string[],
    onToggle: (id: string, checked: boolean) => void,
    isAdjusting: boolean,
    inputs: Record<string, string>,
    onInputChange: (id: string, val: string) => void,
    onAdjustToggle: () => void,
  ) {
    return (
      <div>
        {/* Adjust Strokes toggle */}
        <div className="skins-adjust-toggle" onClick={onAdjustToggle}>
          <span>Adjust Strokes</span>
          <div className={`slider-track ${isAdjusting ? 'active' : ''}`}>
            <div className="slider-thumb" />
          </div>
        </div>

        {/* Column headers */}
        <div className="skins-player-grid">
          <div className="skins-player-header">
            <span></span>
            <span>Player</span>
            <span>Course HDCP</span>
            <span>Strokes</span>
          </div>
          {players.map(p => (
            <div key={p.id} className="skins-player-row">
              <input
                type="checkbox"
                checked={checkedIds.includes(p.id)}
                onChange={e => onToggle(p.id, e.target.checked)}
              />
              <span>{p.name}</span>
              <span>{p.courseHandicap}</span>
              {isAdjusting ? (
                <input
                  type="text"
                  inputMode="decimal"
                  className="manual-stroke-input"
                  value={inputs[p.id] ?? String(p.courseHandicap)}
                  onChange={e => onInputChange(p.id, e.target.value)}
                />
              ) : (
                <span>{p.courseHandicap}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card independent-matches-card">
      <div className="collapsible-header" onClick={() => setExpanded(v => !v)}>
        <h3>
          SKINS
          {inRound && roomCode && <span className="skins-code-badge">{roomCode}</span>}
        </h3>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div>
          {/* ── Active round ── */}
          {inRound ? (
            <div>
              {subView === 'edit' ? (
                /* ── Edit Settings ── */
                <div style={{ marginTop: '0.25rem' }}>
                  {/* Buy-in and stroke mode are host-only settings */}
                  {isHost && (
                    <>
                      <div className="stake-item" style={{ marginBottom: '0.75rem' }}>
                        <span>Buy-In per player</span>
                        <div className="im-stake-input">
                          <span>$</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={editBuyInInput}
                            min={0}
                            step={1}
                            onChange={e => setEditBuyInInput(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="stake-item" style={{ marginBottom: '0.75rem' }}>
                        <span>Stroke Mode</span>
                        <div className="skins-adjust-toggle" style={{ margin: 0 }} onClick={() => handleEditHalfStrokesChange(!editHalfStrokes)}>
                          <span>Half strokes</span>
                          <div className={`slider-track ${editHalfStrokes ? 'active' : ''}`}>
                            <div className="slider-thumb" />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ marginTop: '0.35rem' }}>
                      {renderPlayerGrid(
                        namedPlayers,
                        editSelectedIds,
                        toggleEditPlayer,
                        editAdjustStrokes,
                        editStrokeInputs,
                        (id, val) => setEditStrokeInputs(prev => ({ ...prev, [id]: val })),
                        toggleEditAdjustStrokes,
                      )}
                      {/* Non-host foursomes — host can edit their strokes */}
                      {isHost && otherFoursomes.map(fs => {
                        const fsPlayers = (fs.players ?? []).filter(p => p.name);
                        if (fsPlayers.length === 0) return null;
                        return (
                          <div key={fs.id} style={{ marginTop: '0.75rem' }}>
                            <div className="skins-group-section-label">{fs.label}</div>
                            <div className="skins-player-grid">
                              <div className="skins-player-header skins-player-header--summary">
                                <span>Player</span>
                                <span>Course HDCP</span>
                                <span>Strokes</span>
                              </div>
                              {fsPlayers.map(p => (
                                <div key={p.id} className="skins-player-row skins-player-row--summary">
                                  <span>{p.name}</span>
                                  <span>{p.courseHandicap}</span>
                                  {editAdjustStrokes ? (
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      className="manual-stroke-input"
                                      value={editOtherStrokeInputs[fs.id]?.[p.id] ?? String(p.courseHandicap)}
                                      onChange={e => setEditOtherStrokeInputs(prev => ({
                                        ...prev,
                                        [fs.id]: { ...(prev[fs.id] ?? {}), [p.id]: e.target.value },
                                      }))}
                                    />
                                  ) : (
                                    <span>{p.courseHandicap}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="primary-btn" onClick={handleSaveEdit} disabled={status === 'connecting' || editSelectedIds.length === 0} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                      Save
                    </button>
                    <button className="secondary-btn" onClick={() => setSubView(null)} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                /* ── Active round summary ── */
                <>
                  <div className="res-row">
                    <span>Access Code</span>
                    <strong>{roomCode}</strong>
                  </div>
                  <div className="res-row">
                    <span>Buy-In</span>
                    <strong>${activeBuyIn} per player</strong>
                  </div>
                  <div className="res-row">
                    <span>Strokes</span>
                    <strong>{activeHalfStrokes ? 'Half strokes' : 'Full strokes'}{activeManualSkinsStrokes ? ' (adjusted)' : ''}</strong>
                  </div>
                  {wasRemoved ? (
                    <div className="skins-removed-notice">
                      You have been removed from this skins match by the host. Leave and rejoin if this was an error.
                    </div>
                  ) : foursomes.length > 1 && (
                    <div className="res-row">
                      <span>Groups connected</span>
                      <strong>{foursomes.length}</strong>
                    </div>
                  )}

                  {!wasRemoved && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div className="skins-player-grid">
                        <div className="skins-player-header skins-player-header--summary">
                          <span>Player</span>
                          <span>Course HDCP</span>
                          <span>Strokes</span>
                        </div>
                        {isHost ? (
                          foursomes.map(fs => {
                            const fsPlayers = (fs.players ?? []).filter(p => p.name);
                            if (fsPlayers.length === 0) return null;
                            return (
                              <Fragment key={fs.id}>
                                {foursomes.length > 1 && (
                                  <div className="skins-group-divider-row">
                                    {fs.id === foursomeId ? 'Your Group' : fs.label}
                                  </div>
                                )}
                                {fsPlayers.map(p => {
                                  const strokes = activeManualSkinsStrokes
                                    ? (p.manualRelativeStrokes ?? p.courseHandicap)
                                    : p.courseHandicap;
                                  return (
                                    <div key={`${fs.id}:${p.id}`} className="skins-player-row skins-player-row--summary">
                                      <span>{p.name}</span>
                                      <span>{p.courseHandicap}</span>
                                      <span>{strokes}</span>
                                    </div>
                                  );
                                })}
                              </Fragment>
                            );
                          })
                        ) : (
                          skinsPlayers.filter(p => p.name).map(p => (
                            <div key={p.id} className="skins-player-row skins-player-row--summary">
                              <span>{p.name}</span>
                              <span>{p.courseHandicap}</span>
                              <span>{activeManualSkinsStrokes ? p.manualRelativeStrokes : p.courseHandicap}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Connected groups (host can remove) */}
                  {isHost && otherFoursomes.length > 0 && (
                    <>
                      <div style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'sans-serif' }}>Connected Groups</span>
                      </div>
                      {otherFoursomes.map(fs => (
                        <div key={fs.id} className="res-row" style={{ paddingTop: '0.3rem', paddingBottom: '0.3rem' }}>
                          <span style={{ fontFamily: 'sans-serif', fontSize: '0.85rem' }}>
                            {fs.label}
                            <span style={{ color: '#888', fontSize: '0.75rem', marginLeft: '0.4rem' }}>
                              {(fs.players ?? []).filter(p => p.name).map(p => p.name.split(' ')[0]).join(', ')}
                            </span>
                          </span>
                          <button
                            className="icon-btn delete-partner"
                            title="Remove group"
                            onClick={() => {
                              if (window.confirm(`Remove ${fs.label} from this skins game?`)) {
                                removeGroup(fs.id);
                              }
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    {!wasRemoved && (
                      <button className="skins-action-btn" onClick={openEdit}>
                        <Settings size={13} /> {isHost ? 'Edit Settings' : 'Edit Players'}
                      </button>
                    )}
                    <button className="skins-action-btn" onClick={handleLeave}>
                      <LogOut size={13} /> Leave
                    </button>
                    {isHost && (
                      <button className="skins-action-btn skins-delete-btn" onClick={handleDelete}>
                        <Trash2 size={13} /> Delete from Server
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

          ) : (
            /* ── No active round ── */
            <>
              {!hasPlayers && (
                <p className="no-data" style={{ paddingTop: '0.5rem' }}>Add players above to start a skins game.</p>
              )}

              {subView === null && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button className="add-btn" onClick={openCreate} disabled={!hasPlayers} style={{ flex: 1 }}>
                    + Create Game
                  </button>
                  <button className="add-btn" onClick={openJoin} disabled={!hasPlayers} style={{ flex: 1 }}>
                    + Join Game
                  </button>
                </div>
              )}

              {/* Create subform */}
              {subView === 'create' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div className="stake-item" style={{ marginBottom: '0.75rem' }}>
                    <span>Buy-In per player</span>
                    <div className="im-stake-input">
                      <span>$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={buyInInput}
                        min={0}
                        step={1}
                        onChange={e => setBuyInInput(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="stake-item" style={{ marginBottom: '0.75rem' }}>
                    <span>Stroke Mode</span>
                    <div className="skins-adjust-toggle" style={{ margin: 0 }} onClick={() => handleHalfStrokesChange(!useHalfStrokes)}>
                      <span>Half strokes</span>
                      <div className={`slider-track ${useHalfStrokes ? 'active' : ''}`}>
                        <div className="slider-thumb" />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '0.5rem' }}>
                    {renderPlayerGrid(
                      namedPlayers,
                      effectiveSelectedIds,
                      togglePlayer,
                      adjustStrokes,
                      strokeInputs,
                      (id, val) => setStrokeInputs(prev => ({ ...prev, [id]: val })),
                      toggleAdjustStrokes,
                    )}
                  </div>

                  {error && <p style={{ color: '#c0392b', fontSize: '0.8rem', fontFamily: 'sans-serif', margin: '4px 0' }}>{error}</p>}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="primary-btn" onClick={handleCreate} disabled={status === 'connecting' || selectedPlayers.length === 0} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                      {status === 'connecting' ? 'Creating…' : 'Create'}
                    </button>
                    <button className="secondary-btn" onClick={() => setSubView(null)} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Join subform */}
              {subView === 'join' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div className="stake-item" style={{ marginBottom: '0.75rem' }}>
                    <span>Access Code</span>
                    <input
                      className="skins-code-input"
                      placeholder="e.g. REDEAGLE07"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    />
                  </div>

                  {recentRooms.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'sans-serif' }}>Recent</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '0.3rem' }}>
                        {recentRooms.map(r => (
                          <button key={r.code} className="skins-recent-btn" onClick={() => handleJoin(r.code)} disabled={status === 'connecting'}>
                            <strong>{r.code}</strong>
                            <span>{r.courseName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '0.75rem' }}>
                    {renderPlayerGrid(
                      namedPlayers,
                      effectiveSelectedIds,
                      togglePlayer,
                      adjustStrokes,
                      strokeInputs,
                      (id, val) => setStrokeInputs(prev => ({ ...prev, [id]: val })),
                      toggleAdjustStrokes,
                    )}
                  </div>

                  {error && <p style={{ color: '#c0392b', fontSize: '0.8rem', fontFamily: 'sans-serif', margin: '4px 0' }}>{error}</p>}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="primary-btn" onClick={() => handleJoin()} disabled={!joinCode.trim() || status === 'connecting' || selectedPlayers.length === 0} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                      {status === 'connecting' ? 'Joining…' : 'Join'}
                    </button>
                    <button className="secondary-btn" onClick={() => { setSubView(null); setJoinCode(''); }} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
