import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, LogOut, Settings, X } from 'lucide-react';
import type { Player } from '../../types';
import type { SkinsRoundState } from '../../hooks/useSkinsRound';
interface SkinsCardProps {
  skinsState: SkinsRoundState;
  activePlayers: Player[];
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

export function SkinsCard({ skinsState, activePlayers }: SkinsCardProps) {
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

  const {
    roundId, roomCode, buyIn: activeBuyIn, useHalfStrokes: activeHalfStrokes,
    useManualSkinsStrokes: activeManualSkinsStrokes,
    foursomes, isHost, recentRooms, status, error,
    createRound, joinRound, leaveRound, deleteRound, updateSettings, updateMyGroupPlayers, removeGroup,
  } = skinsState;

  const inRound = !!roundId;
  const hasPlayers = namedPlayers.length > 0;

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
    await joinRound(code.trim(), playersToSend);
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
    if (window.confirm(`Leave skins game "${roomCode}"? Other foursomes will still be able to see results.`)) {
      leaveRound();
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
    setEditSelectedIds(currentNamedIds);
    setEditStrokeInputs(defaultStrokeInputs(namedPlayers));
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
    if (isHost) {
      const playersToSend = editAdjustStrokes ? applyStrokeInputs(players, editStrokeInputs) : players;
      await updateSettings(parseFloat(editBuyInInput) || 0, editHalfStrokes, editAdjustStrokes && editManualSkinsStrokes, playersToSend);
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
          SKINS <span className="beta-badge">BETA</span>
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
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editHalfStrokes}
                            onChange={e => handleEditHalfStrokesChange(e.target.checked)}
                          />
                          Half strokes
                        </label>
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
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="primary-btn" onClick={handleSaveEdit} disabled={status === 'connecting'} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                      Save
                    </button>
                    <button className="secondary-btn" onClick={() => setSubView(null)} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                /* ── Active round summary ── */
                <>
                  <div className="res-row">
                    <span>Room Code</span>
                    <strong>{roomCode}</strong>
                  </div>
                  <div className="res-row">
                    <span>Buy-In</span>
                    <strong>${activeBuyIn} per player</strong>
                  </div>
                  <div className="res-row">
                    <span>Strokes</span>
                    <strong>{activeHalfStrokes ? 'Half strokes' : 'Full strokes'}{activeManualSkinsStrokes ? ' (manual)' : ''}</strong>
                  </div>
                  {foursomes.length > 1 && (
                    <div className="res-row">
                      <span>Groups connected</span>
                      <strong>{foursomes.length}</strong>
                    </div>
                  )}

                  <div style={{ marginTop: '0.5rem' }}>
                    <div className="skins-player-grid">
                      <div className="skins-player-header skins-player-header--summary">
                        <span>Player</span>
                        <span>Course HDCP</span>
                        <span>Strokes</span>
                      </div>
                      {namedPlayers.map(p => (
                        <div key={p.id} className="skins-player-row skins-player-row--summary">
                          <span>{p.name}</span>
                          <span>{p.courseHandicap}</span>
                          <span>{p.manualRelativeStrokes !== p.courseHandicap && activeManualSkinsStrokes ? p.manualRelativeStrokes : p.courseHandicap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

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
                              {fs.players.filter(p => p.name).map(p => p.name.split(' ')[0]).join(', ')}
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
                    <button className="skins-action-btn" onClick={openEdit}>
                      <Settings size={13} /> {isHost ? 'Edit Settings' : 'Edit Players'}
                    </button>
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
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={useHalfStrokes}
                        onChange={e => handleHalfStrokesChange(e.target.checked)}
                      />
                      Half strokes
                    </label>
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
                    <span>Room Code</span>
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
