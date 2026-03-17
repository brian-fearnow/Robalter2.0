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
              {fourBallStakes.type === '18-hole' ? (
                <div className="im-stake-column">
                  <div className="im-stake-input">
                    <span>Main $</span>
                    <input type="number" value={fourBallStakes.mainOverall || ''} placeholder="0"
                      onChange={e => onSetFourBallStakes({ ...fourBallStakes, mainOverall: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })} />
                  </div>
                  <div className="im-stake-input">
                    <span>Press $</span>
                    <input type="number" value={fourBallStakes.pressOverall || ''} placeholder="0"
                      onChange={e => onSetFourBallStakes({ ...fourBallStakes, pressOverall: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })} />
                  </div>
                </div>
              ) : (
                <div className="nassau-stakes-group-vertical">
                  <div className="im-stake-row">
                    <div className="im-stake-input"><span>Front $</span><input type="number" value={fourBallStakes.mainFront || ''} placeholder="0" onChange={e => onSetFourBallStakes({ ...fourBallStakes, mainFront: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })} /></div>
                    <div className="im-stake-input"><span>Press-Front $</span><input type="number" value={fourBallStakes.pressFront || ''} placeholder="0" onChange={e => onSetFourBallStakes({ ...fourBallStakes, pressFront: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })} /></div>
                  </div>
                  <div className="im-stake-row">
                    <div className="im-stake-input"><span>Back $</span><input type="number" value={fourBallStakes.mainBack || ''} placeholder="0" onChange={e => onSetFourBallStakes({ ...fourBallStakes, mainBack: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })} /></div>
                    <div className="im-stake-input"><span>Press-Back $</span><input type="number" value={fourBallStakes.pressBack || ''} placeholder="0" onChange={e => onSetFourBallStakes({ ...fourBallStakes, pressBack: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })} /></div>
                  </div>
                  <div className="im-stake-row">
                    <div className="im-stake-input"><span>Overall $</span><input type="number" value={fourBallStakes.mainOverall || ''} placeholder="0" onChange={e => onSetFourBallStakes({ ...fourBallStakes, mainOverall: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })} /></div>
                    <div className="im-stake-input"><span>Press-Overall $</span><input type="number" value={fourBallStakes.pressOverall || ''} placeholder="0" onChange={e => onSetFourBallStakes({ ...fourBallStakes, pressOverall: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })} /></div>
                  </div>
                </div>
              )}
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
