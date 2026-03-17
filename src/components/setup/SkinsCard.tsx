import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, LogOut, Settings, X } from 'lucide-react';
import type { Player } from '../../types';
import type { SkinsRoundState } from '../../hooks/useSkinsRound';

interface SkinsCardProps {
  skinsState: SkinsRoundState;
  activePlayers: Player[];
}

type SubView = null | 'create' | 'join' | 'edit';

export function SkinsCard({ skinsState, activePlayers }: SkinsCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [subView, setSubView] = useState<SubView>(null);
  const [buyIn, setBuyIn] = useState(10);
  const [useHalfStrokes, setUseHalfStrokes] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const namedPlayers = activePlayers.filter(p => p.name);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(namedPlayers.map(p => p.id));

  // Edit-mode local state (mirrors active round values when opened)
  const [editBuyIn, setEditBuyIn] = useState(0);
  const [editHalfStrokes, setEditHalfStrokes] = useState(false);
  const [editSelectedIds, setEditSelectedIds] = useState<string[]>([]);

  const {
    roundId, roomCode, buyIn: activeBuyIn, useHalfStrokes: activeHalfStrokes,
    foursomes, isHost, recentRooms, status, error,
    createRound, joinRound, leaveRound, deleteRound, updateSettings, updateMyGroupPlayers, removeGroup,
  } = skinsState;

  const inRound = !!roundId;
  const hasPlayers = namedPlayers.length > 0;

  const currentNamedIds = namedPlayers.map(p => p.id);
  const effectiveSelectedIds = selectedPlayerIds.filter(id => currentNamedIds.includes(id));
  const selectedPlayers = activePlayers.filter(p => effectiveSelectedIds.includes(p.id));

  const handleCreate = async () => {
    if (selectedPlayers.length === 0) return;
    await createRound(buyIn, useHalfStrokes, selectedPlayers);
    setSubView(null);
  };

  const handleJoin = async (code = joinCode) => {
    if (!code.trim() || selectedPlayers.length === 0) return;
    await joinRound(code.trim(), selectedPlayers);
    setSubView(null);
    setJoinCode('');
  };

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

  const openEdit = () => {
    setEditBuyIn(activeBuyIn);
    setEditHalfStrokes(activeHalfStrokes);
    setEditSelectedIds(currentNamedIds);
    setSubView('edit');
  };

  const handleSaveEdit = async () => {
    const players = activePlayers.filter(p => editSelectedIds.includes(p.id));
    if (isHost) {
      await updateSettings(editBuyIn, editHalfStrokes, players);
    } else {
      await updateMyGroupPlayers(players);
    }
    setSubView(null);
  };

  const toggleEditPlayer = (id: string, checked: boolean) => {
    setEditSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  const openCreate = () => {
    setSelectedPlayerIds(currentNamedIds);
    setUseHalfStrokes(false);
    setSubView('create');
  };

  const openJoin = () => {
    setSelectedPlayerIds(currentNamedIds);
    setSubView('join');
  };

  const togglePlayer = (id: string, checked: boolean) => {
    setSelectedPlayerIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  // Non-host foursomes (host can remove these)
  const otherFoursomes = isHost ? foursomes.filter(fs => fs.id !== foursomes[0]?.id) : [];

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
                            value={editBuyIn}
                            min={0}
                            step={1}
                            onChange={e => setEditBuyIn(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="stake-item" style={{ marginBottom: '0.75rem' }}>
                        <span>Stroke Mode</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editHalfStrokes}
                            onChange={e => setEditHalfStrokes(e.target.checked)}
                          />
                          Half strokes
                        </label>
                      </div>
                    </>
                  )}

                  <div style={{ marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'sans-serif' }}>Your Players</span>
                    <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {namedPlayers.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editSelectedIds.includes(p.id)}
                            onChange={e => toggleEditPlayer(p.id, e.target.checked)}
                          />
                          {p.name}
                          <span style={{ color: '#888', fontSize: '0.75rem' }}>CH {p.courseHandicap}</span>
                        </label>
                      ))}
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
                    <strong>{activeHalfStrokes ? 'Half strokes' : 'Full strokes'}</strong>
                  </div>
                  {foursomes.length > 1 && (
                    <div className="res-row">
                      <span>Groups connected</span>
                      <strong>{foursomes.length}</strong>
                    </div>
                  )}

                  <div style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'sans-serif' }}>Your Players</span>
                  </div>
                  {namedPlayers.map(p => (
                    <div key={p.id} className="res-row" style={{ paddingTop: '0.3rem', paddingBottom: '0.3rem' }}>
                      <span>{p.name}</span>
                      <span style={{ color: '#888', fontFamily: 'sans-serif', fontSize: '0.8rem' }}>CH {p.courseHandicap}</span>
                    </div>
                  ))}

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
                        value={buyIn}
                        min={0}
                        step={1}
                        onChange={e => setBuyIn(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="stake-item" style={{ marginBottom: '0.75rem' }}>
                    <span>Stroke Mode</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={useHalfStrokes}
                        onChange={e => setUseHalfStrokes(e.target.checked)}
                      />
                      Half strokes
                    </label>
                  </div>

                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'sans-serif' }}>Participating Players</span>
                    <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {namedPlayers.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={effectiveSelectedIds.includes(p.id)}
                            onChange={e => togglePlayer(p.id, e.target.checked)}
                          />
                          {p.name}
                          <span style={{ color: '#888', fontSize: '0.75rem' }}>CH {p.courseHandicap}</span>
                        </label>
                      ))}
                    </div>
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
                    <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'sans-serif' }}>Participating Players</span>
                    <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {namedPlayers.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={effectiveSelectedIds.includes(p.id)}
                            onChange={e => togglePlayer(p.id, e.target.checked)}
                          />
                          {p.name}
                          <span style={{ color: '#888', fontSize: '0.75rem' }}>CH {p.courseHandicap}</span>
                        </label>
                      ))}
                    </div>
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
