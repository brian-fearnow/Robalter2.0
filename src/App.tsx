import { Component, type ReactNode } from 'react';
import './App.css';
import { useAppState } from './hooks/useAppState';
import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import { CourseModal } from './components/CourseModal';
import { SetupTab } from './components/setup/SetupTab';
import { ScoreCard } from './components/scores/ScoreCard';
import { ResultsTab } from './components/results/ResultsTab';
import { RulesTab } from './components/rules/RulesTab';

// --- Error Boundary ---
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#cc0000' }}>
          <h2>Something went wrong.</h2>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#333' }}>
            {this.state.error?.message}
          </p>
          <button
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
            onClick={() => window.location.reload()}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App ---
function AppInner() {
  const appState = useAppState();
  const { activeTab, isLakeSelected, easterEgg } = appState;

  return (
    <div className={`app-container ${isLakeSelected ? 'lake-theme' : ''}`}>
      {easterEgg && <div className="easter-egg-toast">{easterEgg}</div>}

      <CourseModal appState={appState} />

      <AppHeader appState={appState} />

      <main className="app-content">
        {activeTab === 'setup' && <SetupTab appState={appState} />}
        {activeTab === 'scores' && <ScoreCard appState={appState} />}
        {activeTab === 'results' && <ResultsTab appState={appState} />}
        {activeTab === 'rules' && <RulesTab appState={appState} />}
      </main>

      <BottomNav appState={appState} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
