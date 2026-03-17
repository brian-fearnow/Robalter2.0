import type { AppState } from '../../hooks/useAppState';
import { SixesResults } from './SixesResults';
import { FourBallResults } from './FourBallResults';
import { BaseballResults } from './BaseballResults';
import { IndependentMatchResults } from './IndependentMatchResults';
import { BookItResults } from './BookItResults';
import { WolfResults } from './WolfResults';

interface ResultsTabProps {
  appState: AppState;
}

export function ResultsTab({ appState }: ResultsTabProps) {
  const { activePlayers, players, gameMode, getPlayerTotals } = appState;
  const totals = getPlayerTotals();

  return (
    <div className="results-view">
      {/* Total Winnings */}
      <div className="card winnings-card">
        <h3>TOTAL WINNINGS</h3>
        {Object.entries(totals)
          .filter(([id]) => players.find(p => p.id === id)?.name)
          .map(([id, amt]) => (
            <div key={id} className={`winnings-row ${amt >= 0 ? 'pos' : 'neg'}`}>
              <span>{activePlayers.find(p => p.id === id)?.name || 'Player'}</span>
              <strong>{amt >= 0 ? `+$${amt}` : `-$${Math.abs(amt)}`}</strong>
            </div>
          ))}
      </div>

      {gameMode === 'baseball' && <BaseballResults appState={appState} />}

      {gameMode === 'four-ball' && <FourBallResults appState={appState} />}

      {(gameMode === 'sixes' || gameMode === 'wheel') && <SixesResults appState={appState} />}

      {gameMode === 'book-it' && <BookItResults appState={appState} />}

      {gameMode === 'wolf' && <WolfResults appState={appState} />}

      <IndependentMatchResults appState={appState} />
    </div>
  );
}
