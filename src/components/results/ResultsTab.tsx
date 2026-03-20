import type { AppState } from '../../hooks/useAppState';
import type { SkinsRoundState } from '../../hooks/useSkinsRound';
import { SixesResults } from './SixesResults';
import { FourBallResults } from './FourBallResults';
import { BaseballResults } from './BaseballResults';
import { IndependentMatchResults } from './IndependentMatchResults';
import { BookItResults } from './BookItResults';
import { WolfResults } from './WolfResults';
import { SkinsResultsCard } from './SkinsResultsCard';
import { JunkResults } from './JunkResults';

interface ResultsTabProps {
  appState: AppState;
  skinsState: SkinsRoundState;
}

export function ResultsTab({ appState, skinsState }: ResultsTabProps) {
  const { activePlayers, players, gameMode, getPlayerTotals } = appState;
  const baseTotals = getPlayerTotals();

  // Merge skins net winnings (payout − buy-in) into totals
  const totals = { ...baseTotals };
  if (skinsState.roundId && skinsState.skinsResults) {
    const { buyIn, foursomeId } = skinsState;
    skinsState.skinsResults.players.forEach(p => {
      // Only apply skins results for this group's players (foursomeId match prevents
      // cross-group player ID collisions when multiple groups share the same local IDs).
      if (p.foursomeId === foursomeId && totals[p.playerId] !== undefined) {
        totals[p.playerId] += Math.round(p.totalPayout - buyIn);
      }
    });
  }

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

      <SkinsResultsCard skinsState={skinsState} />

      <JunkResults appState={appState} />
    </div>
  );
}
