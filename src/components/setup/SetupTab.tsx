import { useState, useEffect } from 'react';
import { User, MapPin, Edit2, Plus, Trash2, UserCheck, ChevronDown, ChevronUp, RotateCcw, RefreshCw, Download, Info, X, Search, UserMinus, UserPlus } from 'lucide-react';
import type { AppState } from '../../hooks/useAppState';
import type { SkinsRoundState } from '../../hooks/useSkinsRound';
import { PlayerEntry } from './PlayerEntry';
import { StrokeSummary } from './StrokeSummary';
import { StakesCard } from './StakesCard';
import { PairingsCard } from './PairingsCard';
import { IndependentMatchesCard } from './IndependentMatchesCard';
import { SkinsCard } from './SkinsCard';
import { GhinLookupModal } from './GhinLookupModal';
import { GhinCourseLookupModal } from './GhinCourseLookupModal';
import { PERMANENT_COURSE_IDS } from '../../constants';
import type { GhinGolfer } from '../../types';

interface SetupTabProps {
  appState: AppState;
  skinsState: SkinsRoundState;
}

export function SetupTab({ appState, skinsState }: SetupTabProps) {
  const {
    courses,
    selectedCourseId, setSelectedCourseId,
    selectedCourse,
    gameMode,
    players,
    activePlayers,
    partners,
    settings,
    independentMatches, setIndependentMatches,
    segments,
    manualPresses: _manualPresses,
    mainStake, setMainStake,
    pressStake, setPressStake,
    baseballStake, setBaseballStake,
    fourBallStakes, setFourBallStakes,
    bookItStake, setBookItStake,
    wolfStake, setWolfStake,
    visibleSections,
    strokeSummaryInputs,
    imStrokeInputs, setImStrokeInputs,
    pressInputs, setPressInputs,
    baselineCH,
    // handlers
    updatePlayer,
    clearPlayer,
    toggleSection,
    editCourse,
    startNewCourse,
    deleteCourse,
    addPartner,
    deletePartner,
    loadPartner,
    updatePartnerIndex,
    addIndependentMatch,
    updateIndependentMatch,
    deleteIndependentMatch,
    handleTeamSelection,
    getPlayerWheelCount,
    isPairingDuplicate,
    getTeamNamesByIds,
    handleManualStrokesToggle,
    handleStrokeSummaryInputChange,
    finalizeDecimalEntry,
    handleImStrokeChange,
    resetData,
    computeStrokesPerSixHoles,
    ghinToken, ghinLookupPlayerId, setGhinLookupPlayerId, saveGhinToken, clearGhinToken,
    refreshPartnerIndex, partnerRefreshing,
    importCourse,
  } = appState;

  const [ghinCourseModalOpen, setGhinCourseModalOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'course' | 'players' | null>(null);
  const [ghinRefreshModalOpen, setGhinRefreshModalOpen] = useState(false);
  const [pendingGhinRefresh, setPendingGhinRefresh] = useState(false);

  // When the token becomes available after a login prompted by the refresh button, run the refresh.
  useEffect(() => {
    if (pendingGhinRefresh && ghinToken) {
      partners.filter(pt => pt.ghin).forEach(pt => refreshPartnerIndex(pt));
      setPendingGhinRefresh(false);
    }
  }, [ghinToken, pendingGhinRefresh, partners, refreshPartnerIndex]);

  const handleUpdateGhinIndexes = () => {
    if (!ghinToken) {
      setPendingGhinRefresh(true);
      setGhinRefreshModalOpen(true);
    } else {
      partners.filter(pt => pt.ghin).forEach(pt => refreshPartnerIndex(pt));
    }
  };

  // Track GHIN numbers for players looked up this session, so we can attach them when saving a partner
  const [pendingGhin, setPendingGhin] = useState<Record<string, string>>({});
  const [ghinInitialName, setGhinInitialName] = useState<{ first: string; last: string }>({ first: '', last: '' });

  function handleOpenGhinLookup(playerId: string) {
    const player = activePlayers.find(p => p.id === playerId);
    const parts = (player?.name ?? '').trim().split(/\s+/);
    const first = parts.length > 1 ? parts[0] : '';
    const last = parts.length > 1 ? parts.slice(1).join(' ') : parts[0] ?? '';
    setGhinInitialName({ first, last });
    setGhinLookupPlayerId(playerId);
  }

  function handleSelectGolfer(golfer: GhinGolfer) {
    if (!ghinLookupPlayerId) return;
    updatePlayer(ghinLookupPlayerId, 'name', `${golfer.first_name} ${golfer.last_name}`);
    updatePlayer(ghinLookupPlayerId, 'index', golfer.handicap_index);
    setPendingGhin(prev => ({ ...prev, [ghinLookupPlayerId]: golfer.ghin }));
    setGhinLookupPlayerId(null);
  }

  function handleAddPartner(player: Parameters<typeof addPartner>[0]) {
    addPartner(player, pendingGhin[player.id]);
  }

  return (
    <div className="setup-container">
      {/* Course Card */}
      <div className="card course-card">
        <h3><MapPin size={14} /> ACTIVE COURSE <button className="icon-btn info-btn" onClick={() => setInfoModal('course')} title="Course button info"><Info size={13} /></button></h3>
        <div className="course-selector-row">
          <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} disabled={!!(skinsState.roundId && !skinsState.isHost)}>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="icon-btn edit-course" onClick={() => editCourse(selectedCourse)} title="Edit Course" disabled={!!(skinsState.roundId && !skinsState.isHost)}>
            <Edit2 size={14} />
          </button>
          <button className="icon-btn add-course" onClick={startNewCourse} title="Add Course" disabled={!!(skinsState.roundId && !skinsState.isHost)}>
            <Plus size={14} />
          </button>
          <button className="icon-btn ghin-import-course" onClick={() => setGhinCourseModalOpen(true)} title="Import course from GHIN" disabled={!!(skinsState.roundId && !skinsState.isHost)}>
            <Download size={14} />
          </button>
          {!PERMANENT_COURSE_IDS.includes(selectedCourseId as typeof PERMANENT_COURSE_IDS[number]) && (
            <button className="icon-btn remove-course" onClick={() => deleteCourse(selectedCourseId)} title="Remove Course" disabled={!!(skinsState.roundId && !skinsState.isHost)}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {skinsState.roundId && !skinsState.isHost && (
          <div className="course-locked-note">Course is locked while a skins game is active. Leave the skins game to change it.</div>
        )}
      </div>

      {/* Players Card */}
      <div className="card">
        <h3><User size={14} /> ROUND PLAYERS <button className="icon-btn info-btn" onClick={() => setInfoModal('players')} title="Player button info"><Info size={13} /></button></h3>
        <div className="player-entry-grid">
          {activePlayers.map((p, i) => (
            <PlayerEntry
              key={p.id}
              player={p}
              playerIndex={i}
              partners={partners}
              teeOptions={selectedCourse.tees}
              onUpdatePlayer={updatePlayer}
              onClearPlayer={clearPlayer}
              onAddPartner={handleAddPartner}
              onLoadPartner={loadPartner}
              onOpenGhinLookup={handleOpenGhinLookup}
              activePlayers={activePlayers}
            />
          ))}
        </div>
      </div>

      {/* Partners Card */}
      {partners.length > 0 && (
        <div className="card partners-list-card">
          <div className="collapsible-header" onClick={() => toggleSection('partners')}>
            <h3><UserCheck size={14} /> MANAGE PARTNERS</h3>
            {visibleSections.partners ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          {visibleSections.partners && (
            <>
              {partners.some(pt => pt.ghin) && (
                <div className="partners-refresh-row">
                  <button
                    className="partners-update-all-btn"
                    onClick={handleUpdateGhinIndexes}
                    disabled={partnerRefreshing.size > 0}
                  >
                    <RefreshCw size={12} className={partnerRefreshing.size > 0 ? 'spinning' : ''} />
                    {partnerRefreshing.size > 0 ? 'Updating…' : 'Update GHIN Indexes'}
                  </button>
                </div>
              )}
              <div className="partners-grid">
                {[...partners].sort((a, b) => {
                  const sortKey = (name: string) => {
                    const parts = name.trim().split(/\s+/);
                    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
                  };
                  return sortKey(a.name).localeCompare(sortKey(b.name));
                }).map(pt => (
                  <div key={pt.name} className="partner-item-row">
                    <span className="pt-name">
                      {pt.name}
                      {pt.ghin && <span className="pt-ghin-badge">GHIN</span>}
                    </span>
                    <input
                      className="pt-index-input"
                      value={pt.indexInput}
                      onChange={e => updatePartnerIndex(pt.name, e.target.value)}
                      title="Handicap Index"
                    />
                    <button className="icon-btn delete-partner" onClick={() => deletePartner(pt.name)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Stroke Summary */}
      {activePlayers.some(p => p.name) && (
        <StrokeSummary
          activePlayers={activePlayers}
          baselineCH={baselineCH}
          settings={settings}
          gameMode={gameMode}
          visibleSummary={visibleSections.summary}
          strokeSummaryInputs={strokeSummaryInputs}
          onToggleSummary={() => toggleSection('summary')}
          onManualStrokesToggle={handleManualStrokesToggle}
          onStrokeSummaryInputChange={handleStrokeSummaryInputChange}
          onFinalizeDecimalEntry={finalizeDecimalEntry}
          computeStrokesPerSixHoles={computeStrokesPerSixHoles}
        />
      )}

      {/* Stakes Card */}
      {gameMode !== 'independent' && (
        <StakesCard
          gameMode={gameMode}
          mainStake={mainStake}
          pressStake={pressStake}
          baseballStake={baseballStake}
          fourBallStakes={fourBallStakes}
          bookItStake={bookItStake}
          wolfStake={wolfStake}
          visibleStakes={visibleSections.stakes}
          onToggleStakes={() => toggleSection('stakes')}
          onSetMainStake={setMainStake}
          onSetPressStake={setPressStake}
          onSetBaseballStake={setBaseballStake}
          onSetFourBallStakes={setFourBallStakes}
          onSetBookItStake={setBookItStake}
          onSetWolfStake={setWolfStake}
        />
      )}

      {/* Pairings Card */}
      {gameMode !== 'baseball' && gameMode !== 'independent' && gameMode !== 'book-it' && gameMode !== 'wolf' && activePlayers.every(p => p.name) && (
        <PairingsCard
          gameMode={gameMode}
          activePlayers={activePlayers}
          segments={segments}
          onTeamSelection={handleTeamSelection}
          getPlayerWheelCount={getPlayerWheelCount}
          isPairingDuplicate={isPairingDuplicate}
          getTeamNamesByIds={getTeamNamesByIds}
        />
      )}

      {/* Independent Matches */}
      <IndependentMatchesCard
        independentMatches={independentMatches}
        activePlayers={activePlayers}
        players={players}
        visibleIndependent={visibleSections.independent}
        imStrokeInputs={imStrokeInputs}
        pressInputs={pressInputs}
        onToggleIndependent={() => toggleSection('independent')}
        onAddMatch={addIndependentMatch}
        onUpdateMatch={updateIndependentMatch}
        onDeleteMatch={deleteIndependentMatch}
        onImStrokeChange={handleImStrokeChange}
        onSetImStrokeInputs={setImStrokeInputs}
        onSetPressInputs={setPressInputs}
        setIndependentMatches={setIndependentMatches}
      />

      {/* Skins */}
      <SkinsCard skinsState={skinsState} activePlayers={activePlayers} onCourseChange={appState.ensureCourse} />

      {/* Reset */}
      <div className="card reset-card">
        <button className="reset-button" onClick={resetData}>
          <RotateCcw size={16} /> Reset Round Data
        </button>
      </div>

      {ghinCourseModalOpen && (
        <GhinCourseLookupModal
          ghinToken={ghinToken}
          onSaveToken={saveGhinToken}
          onImportCourse={importCourse}
          onClearToken={clearGhinToken}
          onClose={() => setGhinCourseModalOpen(false)}
        />
      )}

      {infoModal && (
        <div className="modal-overlay" onClick={() => setInfoModal(null)}>
          <div className="modal-content info-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{infoModal === 'course' ? 'Active Course Buttons' : 'Round Players Buttons'}</h3>
              <button className="icon-btn" onClick={() => setInfoModal(null)}><X size={16} /></button>
            </div>
            {infoModal === 'course' ? (
              <ul className="info-list">
                <li><Edit2 size={13} /> <strong>Edit Course</strong> — Modify the tee boxes and details of the currently selected course.</li>
                <li><Plus size={13} /> <strong>Add Course</strong> — Create a new custom course.</li>
                <li><Download size={13} /> <strong>Import from GHIN</strong> — Search GHIN for a course and import its tee boxes automatically.</li>
                <li><Trash2 size={13} /> <strong>Remove Course</strong> — Delete the currently selected custom course.</li>
              </ul>
            ) : (
              <ul className="info-list">
                <li><Search size={13} /> <strong>GHIN Lookup</strong> — Search GHIN by name to auto-fill a player's name and handicap index.</li>
                <li><UserMinus size={13} /> <strong>Remove Player</strong> — Clear this player's name, index, and tee selection.</li>
                <li><UserPlus size={13} /> <strong>Save as Partner</strong> — Save this player to your Partners list for quick loading in future rounds.</li>
              </ul>
            )}
          </div>
        </div>
      )}

      {ghinLookupPlayerId && (
        <GhinLookupModal
          ghinToken={ghinToken}
          onSaveToken={saveGhinToken}
          onClearToken={clearGhinToken}
          onSelectGolfer={handleSelectGolfer}
          onClose={() => setGhinLookupPlayerId(null)}
          initialFirstName={ghinInitialName.first}
          initialLastName={ghinInitialName.last}
        />
      )}

      {ghinRefreshModalOpen && (
        <GhinLookupModal
          ghinToken={ghinToken}
          onSaveToken={(token) => { saveGhinToken(token); setGhinRefreshModalOpen(false); }}
          onClearToken={clearGhinToken}
          onSelectGolfer={() => setGhinRefreshModalOpen(false)}
          onClose={() => { setGhinRefreshModalOpen(false); setPendingGhinRefresh(false); }}
        />
      )}

      <div className="mt-6 pb-4 text-center text-sm text-gray-400">
        <a
          href="mailto:brian.fearnow@gmail.com?subject=Robalter%20Bug%20Report%20%2F%20Feature%20Request"
          className="underline hover:text-gray-600"
        >
          Report a bug or suggest a feature
        </a>
      </div>
    </div>
  );
}
