import { useState } from 'react';
import type { AppState } from '../../hooks/useAppState';
import type { SkinsRoundState } from '../../hooks/useSkinsRound';
import { getSkinsStrokesForHole } from '../../utils/skins';

interface ScoreCardProps {
  appState: AppState;
  skinsState: SkinsRoundState;
}

const GAME_MODE_LABELS: Record<string, string> = {
  'sixes': 'Sixes',
  'wheel': 'Wheel',
  'four-ball': 'Four Ball',
  'baseball': 'Baseball',
  'independent': 'Independent',
  'book-it': 'Book-It',
  'wolf': 'Wolf',
};

type StrokeView = 'main' | 'skins';

export function ScoreCard({ appState, skinsState }: ScoreCardProps) {
  const [strokeView, setStrokeView] = useState<StrokeView>('main');

  const {
    selectedCourse,
    scorecardPlayers,
    gameMode,
    scores,
    settings,
    setScore,
    getNetScore,
    getPlayerScoreTotal,
    getPlayerHoleListTotal,
    computeStrokesForHole,
    computeStrokesPerSixHoles,
    computeBaseballPoints,
    baselineCH,
    bookedHoles,
    toggleBookHole,
    wolfDecisions,
    setWolfDecision,
    computeWolfResults,
  } = appState;

  const renderStrokes = (strokes: number) => {
    if (strokes === 0) return null;
    const isPlus = strokes < 0;
    const absStrokes = Math.abs(strokes);
    const frac = absStrokes % 1 !== 0 ? '\u00BD' : '';
    const whole = Math.floor(absStrokes);

    if (isPlus) {
      return <span className="stroke-marker plus">+{whole}{frac}</span>;
    } else {
      const stars = Array.from({ length: whole }, () => '*').join('');
      return <span className="stroke-marker">{stars}{frac}</span>;
    }
  };

  const front9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const back9 = [10, 11, 12, 13, 14, 15, 16, 17, 18];

  const wolfResults = gameMode === 'wolf' ? computeWolfResults() : null;

  return (
    <div className="scorecard-view" style={{ '--player-count': scorecardPlayers.length || 1 } as React.CSSProperties}>
      {/* Fixed header */}
      <div className="scorecard-header-fixed">
        <div className="h-cell">Hole</div>
        {scorecardPlayers.map(p => {
          const displayStrokes = (strokeView === 'skins' && skinsState.roundId)
            ? p.courseHandicap
            : (gameMode === 'sixes' || gameMode === 'wheel')
              ? computeStrokesPerSixHoles(p)
              : (settings.useManualStrokes ? p.manualRelativeStrokes : p.courseHandicap - baselineCH);
          const bookedCount = gameMode === 'book-it' ? (bookedHoles[p.id] || []).length : 0;
          const holesRequired = settings.bookItHolesRequired;
          return (
            <div key={p.id} className="p-cell">
              <div className="p-name">{p.name.split(' ')[0]}</div>
              {gameMode === 'book-it' ? (
                <div className={`p-strokes booked-count ${bookedCount >= holesRequired ? 'booked-full' : ''}`}>
                  {bookedCount}/{holesRequired}
                </div>
              ) : (
                <div className="p-strokes">{displayStrokes}</div>
              )}
            </div>
          );
        })}
        {gameMode === 'baseball' && <div className="p-cell bb-pts-header">Pts</div>}
      </div>

      {/* Stroke-view selector — shown when a skins game is active */}
      {skinsState.roundId && (
        <div className="stroke-view-selector">
          <span className="stroke-view-label">Strokes for:</span>
          <button
            className={`stroke-view-btn${strokeView === 'main' ? ' active' : ''}`}
            onClick={() => setStrokeView('main')}
          >
            {GAME_MODE_LABELS[gameMode] ?? gameMode}
          </button>
          <button
            className={`stroke-view-btn${strokeView === 'skins' ? ' active' : ''}`}
            onClick={() => setStrokeView('skins')}
          >
            Skins{skinsState.useHalfStrokes ? ' (½)' : ''}
          </button>
        </div>
      )}

      {/* Scrollable rows */}
      <div className="scorecard-scroll-area">
        {selectedCourse.holes.map(h => {
          const isMidSegment = h.number >= 7 && h.number <= 12;
          const showSegmentShading = isMidSegment && (
            gameMode === 'sixes' || gameMode === 'wheel' ||
            (gameMode === 'book-it' && settings.useBookItSegmented)
          );

          // Wolf decision row (interlaced)
          const showWolfRow = gameMode === 'wolf' && scorecardPlayers.length >= 2;
          const wolfPlayerId = wolfResults?.holeResults.find(hr => hr.holeNumber === h.number)?.wolfPlayerId ?? null;
          const wolfPlayer = wolfPlayerId ? scorecardPlayers.find(p => p.id === wolfPlayerId) ?? null : null;
          const wolfPartners = showWolfRow && wolfPlayerId ? scorecardPlayers.filter(p => p.id !== wolfPlayerId) : [];
          const wolfDecision = wolfDecisions[h.number];
          const wolfSelectValue = !wolfDecision ? '' :
            wolfDecision.blindWolf ? 'blind' :
            wolfDecision.partnerId === null ? 'lone' :
            wolfDecision.partnerId;
          const wolfPairClass = !wolfDecision ? 'wolf-hole-pair' :
            wolfDecision.blindWolf ? 'wolf-hole-pair is-blind-wolf' :
            wolfDecision.partnerId === null ? 'wolf-hole-pair is-lone-wolf' :
            'wolf-hole-pair is-partner';

          // Score cells extracted to avoid duplication
          const scoreCells = (
            <>
              <div className="h-info">
                <strong>{h.number}</strong>
                <span>P{h.par}/H{h.handicap}</span>
              </div>
              {scorecardPlayers.map(p => {
                const strokes = (strokeView === 'skins' && skinsState.roundId)
                  ? getSkinsStrokesForHole(p.id, h.number, scorecardPlayers, selectedCourse.holes, skinsState.useHalfStrokes)
                  : computeStrokesForHole(p.id, h.number);
                const netVal = getNetScore(p.id, h.number);
                if (gameMode === 'book-it') {
                  const isBooked = (bookedHoles[p.id] || []).includes(h.number);
                  const bookedCount = (bookedHoles[p.id] || []).length;
                  const holesRequired = settings.bookItHolesRequired;
                  const canBook = netVal !== null && (isBooked || bookedCount < holesRequired);
                  const segment = Math.floor((h.number - 1) / 6);
                  const segmentHoles = [segment * 6 + 1, segment * 6 + 2, segment * 6 + 3, segment * 6 + 4, segment * 6 + 5, segment * 6 + 6];
                  const segBooked = (bookedHoles[p.id] || []).filter(n => segmentHoles.includes(n)).length;
                  const canBookSegment = !settings.useBookItSegmented || isBooked || segBooked < settings.bookItSegmentRequired;
                  const bookable = canBook && canBookSegment;
                  return (
                    <div key={p.id} className={`input-cell ${isBooked ? 'booked-hole' : ''}`}>
                      <div className="input-wrapper">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={scores[p.id]?.[h.number] || ''}
                          onChange={e => setScore(p.id, h.number, e.target.value)}
                          disabled={!p.name}
                        />
                        {renderStrokes(strokes)}
                      </div>
                      <div className="book-row">
                        <span className="net">{netVal ?? ''}</span>
                        <button
                          className={`book-btn ${isBooked ? 'booked' : ''}`}
                          onClick={() => bookable || isBooked ? toggleBookHole(p.id, h.number) : undefined}
                          disabled={!bookable && !isBooked}
                          title={isBooked ? 'Unbook hole' : 'Book this hole'}
                        >
                          {isBooked ? '★' : '☆'}
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={p.id} className="input-cell">
                    <div className="input-wrapper">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={scores[p.id]?.[h.number] || ''}
                        onChange={e => setScore(p.id, h.number, e.target.value)}
                        disabled={!p.name}
                      />
                      {renderStrokes(strokes)}
                    </div>
                    <span className="net">{netVal ?? ''}</span>
                  </div>
                );
              })}
              {gameMode === 'baseball' && (
                <div className="bb-pts-cell">
                  {(() => {
                    let pts = computeBaseballPoints(h.number);
                    if (pts.every(p => p === 0)) return null;
                    if (h.number >= 10 && settings.useBaseballDoubleBackNine) {
                      pts = pts.map(p => p * 2) as [number, number, number];
                    }
                    return (
                      <div className="bb-pts-stack">
                        {pts.map((p, i) => <span key={i}>{p}</span>)}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          );

          if (showWolfRow) {
            return (
              <div key={h.number} className={wolfPairClass}>
                <div className={`score-row${showSegmentShading ? ' mid-segment' : ''}`}>
                  {scoreCells}
                </div>
                <div className="wolf-inline-row">
                  <span className="wir-wolf-label">Wolf: {wolfPlayer?.name.split(' ')[0]}</span>
                  <span className="wir-selection-label">Selection:</span>
                  <select
                    className="wir-select"
                    value={wolfSelectValue}
                    onChange={e => setWolfDecision(h.number, e.target.value)}
                  >
                    <option value="">— pick —</option>
                    {wolfPartners.map(p => (
                      <option key={p.id} value={p.id}>{p.name.split(' ')[0]}</option>
                    ))}
                    <option value="lone">Lone Wolf</option>
                    <option value="blind">Blind Wolf</option>
                  </select>
                </div>
              </div>
            );
          }

          return (
            <div key={h.number} className={`score-row${showSegmentShading ? ' mid-segment' : ''}`}>
              {scoreCells}
            </div>
          );
        })}

        {/* Front 9 total */}
        <div className="score-row total-row-sub">
          <div className="h-info"><strong>F9</strong></div>
          {scorecardPlayers.map(p => (
            <div key={p.id} className="input-cell total-cell">
              <strong>{getPlayerHoleListTotal(p.id, front9)}</strong>
            </div>
          ))}
          {gameMode === 'baseball' && (
            <div className="bb-pts-cell total">
              <strong>{(() => {
                let sum = 0;
                for (let h = 1; h <= 9; h++) computeBaseballPoints(h).forEach(p => { sum += p; });
                return sum;
              })()}</strong>
            </div>
          )}
        </div>

        {/* Back 9 total */}
        <div className="score-row total-row-sub">
          <div className="h-info"><strong>B9</strong></div>
          {scorecardPlayers.map(p => (
            <div key={p.id} className="input-cell total-cell">
              <strong>{getPlayerHoleListTotal(p.id, back9)}</strong>
            </div>
          ))}
          {gameMode === 'baseball' && (
            <div className="bb-pts-cell total">
              <strong>{(() => {
                let sum = 0;
                for (let h = 10; h <= 18; h++) {
                  let pts = computeBaseballPoints(h);
                  if (settings.useBaseballDoubleBackNine) pts = pts.map(p => p * 2) as [number, number, number];
                  pts.forEach(p => { sum += p; });
                }
                return sum;
              })()}</strong>
            </div>
          )}
        </div>

        {/* Grand total */}
        <div className="score-row total-row">
          <div className="h-info"><strong>TOT</strong></div>
          {scorecardPlayers.map(p => (
            <div key={p.id} className="input-cell total-cell">
              <strong>{getPlayerScoreTotal(p.id)}</strong>
            </div>
          ))}
          {gameMode === 'baseball' && (
            <div className="bb-pts-cell total">
              <strong>{(() => {
                let sum = 0;
                for (let h = 1; h <= 18; h++) {
                  let pts = computeBaseballPoints(h);
                  if (h >= 10 && settings.useBaseballDoubleBackNine) pts = pts.map(p => p * 2) as [number, number, number];
                  pts.forEach(p => { sum += p; });
                }
                return sum;
              })()}</strong>
            </div>
          )}
        </div>

        {/* Net total */}
        <div className="score-row net-total-row">
          <div className="h-info"><strong>NET</strong></div>
          {scorecardPlayers.map(p => {
            const gross = getPlayerScoreTotal(p.id);
            const net = gross > 0 ? gross - p.courseHandicap : 0;
            return (
              <div key={p.id} className="input-cell total-cell">
                <strong style={{ color: 'var(--mackenzie-green)' }}>{gross > 0 ? net : ''}</strong>
              </div>
            );
          })}
          {gameMode === 'baseball' && <div className="bb-pts-cell"></div>}
        </div>


      </div>
    </div>
  );
}

import type React from 'react';
