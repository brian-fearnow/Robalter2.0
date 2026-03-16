import { useState } from 'react';
import { X, Search, LogIn, LogOut, ChevronRight } from 'lucide-react';
import type { GhinGolfer } from '../../types';

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
] as const;

interface GhinLookupModalProps {
  ghinToken: string | null;
  onSaveToken: (token: string) => void;
  onClearToken: () => void;
  onSelectGolfer: (golfer: GhinGolfer) => void;
  onClose: () => void;
  initialFirstName?: string;
  initialLastName?: string;
}

export function GhinLookupModal({
  ghinToken,
  onSaveToken,
  onClearToken,
  onSelectGolfer,
  onClose,
  initialFirstName = '',
  initialLastName = '',
}: GhinLookupModalProps) {
  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Search form
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [state, setState] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<GhinGolfer[] | null>(null);

  const view: 'login' | 'search' = ghinToken ? 'search' : 'login';

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/ghin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setLoginError(data.error ?? 'Login failed. Check your credentials.');
      } else {
        onSaveToken(data.token);
        setEmail('');
        setPassword('');
      }
    } catch {
      setLoginError('Could not reach GHIN. Check your connection.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!lastName.trim()) { setSearchError('Last name is required.'); return; }
    setSearchError('');
    setSearchLoading(true);
    setResults(null);
    try {
      const qs = new URLSearchParams({ token: ghinToken!, lastName: lastName.trim() });
      if (firstName.trim()) qs.set('firstName', firstName.trim());
      if (state) qs.set('state', state);
      const res = await fetch(`/api/ghin-search?${qs.toString()}`);
      const data = await res.json() as { golfers?: GhinGolfer[]; error?: string };
      if (res.status === 401 || data.error === 'token_expired') {
        onClearToken();
        setSearchError('Session expired — please sign in again.');
        return;
      }
      if (!res.ok) { setSearchError(data.error ?? 'Search failed.'); return; }
      setResults(data.golfers ?? []);
    } catch {
      setSearchError('Could not reach GHIN. Check your connection.');
    } finally {
      setSearchLoading(false);
    }
  }

  function handleSignOut() {
    onClearToken();
    setResults(null);
    setSearchError('');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ghin-modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2 className="ghin-modal-title">
            <span className="ghin-logo-text">GHIN</span> Lookup
          </h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="modal-body">
          {view === 'login' ? (
            <form onSubmit={handleLogin} className="ghin-form">
              <p className="ghin-instructions">
                Sign in with your GHIN account to search for golfers by name.
              </p>
              <div className="ghin-field">
                <label>Email or GHIN #</label>
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                />
              </div>
              <div className="ghin-field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {loginError && <p className="ghin-error">{loginError}</p>}
              <button
                type="submit"
                className="primary-btn ghin-submit-btn"
                disabled={loginLoading}
              >
                <LogIn size={16} />
                {loginLoading ? 'Signing in…' : 'Sign In'}
              </button>
              <p className="ghin-privacy-note">
                Your credentials are sent directly to GHIN and are never stored by this app.
              </p>
            </form>
          ) : (
            <>
              <form onSubmit={handleSearch} className="ghin-form">
                <div className="ghin-search-header">
                  <p className="ghin-instructions">Search golfers by name.</p>
                  <button type="button" className="ghin-signout-btn" onClick={handleSignOut}>
                    <LogOut size={12} /> Sign out
                  </button>
                </div>
                <div className="ghin-search-row">
                  <div className="ghin-field">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="ghin-field">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Smith"
                      required
                    />
                  </div>
                </div>
                <div className="ghin-field">
                  <label>State (optional)</label>
                  <select value={state} onChange={e => setState(e.target.value)}>
                    <option value="">All States</option>
                    {US_STATES.map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                </div>
                {searchError && <p className="ghin-error">{searchError}</p>}
                <button
                  type="submit"
                  className="primary-btn ghin-submit-btn"
                  disabled={searchLoading}
                >
                  <Search size={16} />
                  {searchLoading ? 'Searching…' : 'Search'}
                </button>
              </form>

              {results !== null && (
                <div className="ghin-results">
                  {results.length === 0 ? (
                    <p className="ghin-no-results">No active golfers found. Try broadening your search.</p>
                  ) : (
                    <>
                      <p className="ghin-results-count">{results.length} result{results.length !== 1 ? 's' : ''} — tap to select</p>
                      <div className="ghin-results-list">
                        {results.map(g => (
                          <button
                            key={g.ghin}
                            className="ghin-result-row"
                            onClick={() => { onSelectGolfer(g); onClose(); }}
                          >
                            <div className="ghin-result-info">
                              <strong>{g.first_name} {g.last_name}</strong>
                              <span>{g.club_name} · {g.state}</span>
                            </div>
                            <div className="ghin-result-right">
                              <span className="ghin-hdcp">{g.handicap_index}</span>
                              <ChevronRight size={14} className="ghin-chevron" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
