import { Trophy, BookOpen, Settings as SettingsIcon, Info } from 'lucide-react';
import type { AppState } from '../hooks/useAppState';

interface BottomNavProps {
  appState: AppState;
}

export function BottomNav({ appState }: BottomNavProps) {
  const { activeTab, setActiveTab, isLakeSelected } = appState;

  return (
    <nav className={`bottom-nav ${isLakeSelected ? 'lake-theme' : ''}`}>
      <button className={activeTab === 'setup' ? 'active' : ''} onClick={() => setActiveTab('setup')}>
        <SettingsIcon size={18} /><span>Setup</span>
      </button>
      <button className={activeTab === 'scores' ? 'active' : ''} onClick={() => setActiveTab('scores')}>
        <BookOpen size={18} /><span>Scores</span>
      </button>
      <button className={activeTab === 'results' ? 'active' : ''} onClick={() => setActiveTab('results')}>
        <Trophy size={18} /><span>Results</span>
      </button>
      <button className={activeTab === 'rules' ? 'active' : ''} onClick={() => setActiveTab('rules')}>
        <Info size={18} /><span>Rules</span>
      </button>
    </nav>
  );
}
