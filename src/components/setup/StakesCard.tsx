import { Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import type { FourBallStakes, GameMode } from '../../types';

interface StakesCardProps {
  gameMode: GameMode;
  mainStake: number;
  pressStake: number;
  baseballStake: number;
  fourBallStakes: FourBallStakes;
  bookItStake: number;
  wolfStake: number;
  visibleStakes: boolean;
  onToggleStakes: () => void;
  onSetMainStake: (v: number) => void;
  onSetPressStake: (v: number) => void;
  onSetBaseballStake: (v: number) => void;
  onSetFourBallStakes: (v: FourBallStakes) => void;
  onSetBookItStake: (v: number) => void;
  onSetWolfStake: (v: number) => void;
}

export function StakesCard({
  gameMode,
  mainStake,
  pressStake,
  baseballStake,
  fourBallStakes,
  bookItStake,
  wolfStake,
  visibleStakes,
  onToggleStakes,
  onSetMainStake,
  onSetPressStake,
  onSetBaseballStake,
  onSetFourBallStakes,
  onSetBookItStake,
  onSetWolfStake,
}: StakesCardProps) {
  return (
    <div className="card">
      <div className="collapsible-header" onClick={onToggleStakes}>
        <h3><Wallet size={14} /> STAKES</h3>
        {visibleStakes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {visibleStakes && (
        <div className="stakes-vertical">
          {gameMode === 'four-ball' ? (
            <div className="four-ball-stakes-container">
              <div className="fb-type-select">
                <select
                  value={fourBallStakes.type}
                  onChange={e => onSetFourBallStakes({ ...fourBallStakes, type: e.target.value as FourBallStakes['type'] })}
                >
                  <option value="18-hole">18-Hole Bet</option>
                  <option value="nassau">Nassau Bet</option>
                </select>
              </div>
              <div className="fb-stakes-grid">
                {/* Column headers */}
                <span />
                <span className="fb-stakes-col-header">Main</span>
                <span className="fb-stakes-col-header">Press</span>

                {/* Front/Back row — Nassau only */}
                {fourBallStakes.type === 'nassau' && (
                  <>
                    <span className="fb-stakes-row-label">Front/Back ($)</span>
                    <div className="fb-stakes-input">
                      <input type="number" value={fourBallStakes.mainFront || ''} placeholder="0"
                        onChange={e => {
                          const v = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                          onSetFourBallStakes({ ...fourBallStakes, mainFront: v, mainBack: v });
                        }} />
                    </div>
                    <div className="fb-stakes-input">
                      <input type="number" value={fourBallStakes.pressFront || ''} placeholder="0"
                        onChange={e => {
                          const v = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                          onSetFourBallStakes({ ...fourBallStakes, pressFront: v, pressBack: v });
                        }} />
                    </div>
                  </>
                )}

                {/* Overall row — always shown */}
                <span className="fb-stakes-row-label">Overall ($)</span>
                <div className="fb-stakes-input">
                  <input type="number" value={fourBallStakes.mainOverall || ''} placeholder="0"
                    onChange={e => onSetFourBallStakes({ ...fourBallStakes, mainOverall: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })} />
                </div>
                <div className="fb-stakes-input">
                  <input type="number" value={fourBallStakes.pressOverall || ''} placeholder="0"
                    onChange={e => onSetFourBallStakes({ ...fourBallStakes, pressOverall: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })} />
                </div>
              </div>
            </div>
          ) : gameMode === 'baseball' ? (
            <div className="stake-item">
              <span>Point Value ($)</span>
              <input type="number" value={baseballStake || ''} onChange={e => onSetBaseballStake(e.target.value === '' ? 0 : parseInt(e.target.value))} />
            </div>
          ) : gameMode === 'book-it' ? (
            <div className="stake-item">
              <span>Point Value ($)</span>
              <input type="number" value={bookItStake || ''} onChange={e => onSetBookItStake(e.target.value === '' ? 0 : parseInt(e.target.value))} />
            </div>
          ) : gameMode === 'wolf' ? (
            <div className="stake-item">
              <span>Point Value ($)</span>
              <input type="number" value={wolfStake || ''} onChange={e => onSetWolfStake(e.target.value === '' ? 0 : parseInt(e.target.value))} />
            </div>
          ) : (
            <>
              <div className="stake-item">
                <span>Main Bet ($)</span>
                <input type="number" value={mainStake || ''} onChange={e => onSetMainStake(e.target.value === '' ? 0 : parseInt(e.target.value))} />
              </div>
              <div className="stake-item">
                <span>Press Bet ($)</span>
                <input type="number" value={pressStake || ''} onChange={e => onSetPressStake(e.target.value === '' ? 0 : parseInt(e.target.value))} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
