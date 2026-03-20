import type { AppState } from '../../hooks/useAppState';
import type { JunkType } from '../../types';
import { JUNK_LABELS, MANUAL_JUNK_TYPES, getBirdieEagleDots } from '../../utils/junk';

interface JunkModalProps {
  holeNumber: number;
  appState: AppState;
  onClose: () => void;
}

export function JunkModal({ holeNumber, appState, onClose }: JunkModalProps) {
  const { scorecardPlayers, settings, junkDots, setJunkDot, scores, selectedCourse } = appState;
  const { junkTypes } = settings;
  const holeData = junkDots[holeNumber] || {};
  const hole = selectedCourse.holes.find(h => h.number === holeNumber);

  const enabledManualTypes = MANUAL_JUNK_TYPES.filter(t => junkTypes[t]);

  return (
    <div className="junk-modal-overlay" onClick={onClose}>
      <div className="junk-modal" onClick={e => e.stopPropagation()}>
        <div className="junk-modal-header">
          <h3>Hole {holeNumber} Junk{hole ? ` · Par ${hole.par}` : ''}</h3>
          <button className="junk-modal-close" onClick={onClose}>✕</button>
        </div>

        {enabledManualTypes.length === 0 ? (
          <p className="junk-modal-empty">No manual junk types enabled.</p>
        ) : (
          <div
          className="junk-grid"
          style={{ gridTemplateColumns: `auto ${scorecardPlayers.map(() => 'minmax(52px, 1fr)').join(' ')}` }}
        >
            {/* Header row */}
            <div className="junk-grid-corner" />
            {scorecardPlayers.map(p => (
              <div key={p.id} className="junk-grid-player">{p.name.split(' ')[0]}</div>
            ))}

            {/* Manual junk rows — label + one cell per player */}
            {enabledManualTypes.map(type => (
              <>
                <div key={`label-${type}`} className="junk-grid-row-label">{JUNK_LABELS[type]}</div>
                {scorecardPlayers.map(p => {
                  const checked = (holeData[p.id] || []).includes(type as JunkType);
                  return (
                    <button
                      key={`${type}-${p.id}`}
                      className={`junk-dot-btn ${checked ? 'active' : ''}`}
                      onClick={() => setJunkDot(holeNumber, p.id, type as JunkType, !checked)}
                    >
                      {checked ? '●' : '○'}
                    </button>
                  );
                })}
              </>
            ))}
          </div>
        )}

        {/* Birdie/Eagle auto summary */}
        {junkTypes.birdieEagle && (
          <div className="junk-modal-auto">
            <div className="junk-modal-auto-header">Birdie/Eagle (auto)</div>
            <div className="junk-modal-auto-row">
              {scorecardPlayers.map(p => {
                const dots = getBirdieEagleDots(p.id, holeNumber, scores, selectedCourse.holes);
                return (
                  <div key={p.id} className="junk-modal-auto-cell">
                    <span className="junk-modal-auto-name">{p.name.split(' ')[0]}</span>
                    <span className={`junk-modal-auto-dots ${dots > 0 ? 'has-dots' : ''}`}>
                      {dots > 0 ? `+${dots}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
