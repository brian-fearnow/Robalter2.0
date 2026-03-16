import type { AppState } from '../hooks/useAppState';

interface AppHeaderProps {
  appState: AppState;
}

export function AppHeader({ appState }: AppHeaderProps) {
  const { selectedCourse, gameMode, isLakeSelected, handleGameModeChange } = appState;

  return (
    <header className={`app-header ${isLakeSelected ? 'lake-theme' : ''}`}>
      <div className="game-mode-select-wrapper">
        <span className="select-label">TEAM GAME:</span>
        <select
          className="game-mode-dropdown"
          value={gameMode}
          onChange={e => handleGameModeChange(e.target.value as Parameters<typeof handleGameModeChange>[0])}
        >
          <option value="four-ball">Four Ball</option>
          <option value="sixes">Sixes</option>
          <option value="wheel">The Wheel</option>
          <option value="baseball">Baseball</option>
          <option value="independent">Independent Matches Only</option>
        </select>
      </div>
      <div className="header-text-only">
        <h1>{selectedCourse.name.toUpperCase()}</h1>
        {(selectedCourse.id === 'meadow-club' || selectedCourse.id === 'meadow-club-new') && (
          <p>ESTABLISHED 1927</p>
        )}
      </div>
    </header>
  );
}
