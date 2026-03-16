import { useState } from 'react';
import { X, Search, ChevronRight, MapPin, LogIn } from 'lucide-react';
import type { Course } from '../../types';

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

interface CourseResult {
  id: number;
  name: string;
  facility: string;
  city: string;
  state: string;
}

interface GhinCourseLookupModalProps {
  ghinToken: string | null;
  onSaveToken: (token: string) => void;
  onImportCourse: (course: Omit<Course, 'id'>) => void;
  onClearToken: () => void;
  onClose: () => void;
}

export function GhinCourseLookupModal({
  ghinToken,
  onSaveToken,
  onImportCourse,
  onClearToken,
  onClose,
}: GhinCourseLookupModalProps) {
  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Search form
  const [name, setName] = useState('');
  const [state, setState] = useState('CA');
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<CourseResult[] | null>(null);

  const [importError, setImportError] = useState('');
  const [importingId, setImportingId] = useState<number | null>(null);

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
    if (!name.trim()) { setSearchError('Course name is required.'); return; }
    setSearchError('');
    setSearchLoading(true);
    setResults(null);
    try {
      const qs = new URLSearchParams({ token: ghinToken!, name: name.trim() });
      if (state) qs.set('state', state);
      const res = await fetch(`/api/ghin-course-search?${qs.toString()}`);
      const data = await res.json() as { courses?: CourseResult[]; error?: string };
      if (res.status === 401 || data.error === 'token_expired') {
        onClearToken();
        setSearchError('Session expired — please sign in again.');
        return;
      }
      if (!res.ok) { setSearchError(data.error ?? 'Search failed.'); return; }
      setResults(data.courses ?? []);
    } catch {
      setSearchError('Could not reach GHIN. Check your connection.');
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSelectCourse(course: CourseResult) {
    setImportError('');
    setImportingId(course.id);
    try {
      const qs = new URLSearchParams({ token: ghinToken!, courseId: String(course.id) });
      const res = await fetch(`/api/ghin-course-detail?${qs.toString()}`);
      const data = await res.json() as { course?: Omit<Course, 'id'>; error?: string };
      if (res.status === 401 || data.error === 'token_expired') {
        onClearToken();
        setImportError('Session expired — please sign in again.');
        return;
      }
      if (!res.ok || !data.course) { setImportError(data.error ?? 'Failed to load course data.'); return; }
      onImportCourse(data.course);
      onClose();
    } catch {
      setImportError('Could not reach GHIN. Check your connection.');
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ghin-modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2 className="ghin-modal-title">
            <MapPin size={16} /> Import Course from <span className="ghin-logo-text">GHIN</span>
          </h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="modal-body">
          {view === 'login' ? (
            <form onSubmit={handleLogin} className="ghin-form">
              <p className="ghin-instructions">
                Sign in with your GHIN account to search for courses.
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
              <button type="submit" className="primary-btn ghin-submit-btn" disabled={loginLoading}>
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
                <div className="ghin-field">
                  <label>Course Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Pebble Beach"
                    required
                  />
                </div>
                <div className="ghin-field">
                  <label>State (optional)</label>
                  <select value={state} onChange={e => setState(e.target.value)}>
                    <option value="">All States</option>
                    {US_STATES.map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                </div>
                {searchError && <p className="ghin-error">{searchError}</p>}
                <button type="submit" className="primary-btn ghin-submit-btn" disabled={searchLoading}>
                  <Search size={16} />
                  {searchLoading ? 'Searching…' : 'Search'}
                </button>
              </form>

              {importError && <p className="ghin-error" style={{ marginTop: '10px' }}>{importError}</p>}

              {results !== null && (
                <div className="ghin-results">
                  {results.length === 0 ? (
                    <p className="ghin-no-results">No courses found. Try a different name or state.</p>
                  ) : (
                    <>
                      <p className="ghin-results-count">
                        {results.length} result{results.length !== 1 ? 's' : ''} — tap to import
                      </p>
                      <div className="ghin-results-list">
                        {results.map(c => (
                          <button
                            key={c.id}
                            className="ghin-result-row"
                            onClick={() => handleSelectCourse(c)}
                            disabled={importingId !== null}
                          >
                            <div className="ghin-result-info">
                              <strong>{c.name}</strong>
                              <span>{c.facility !== c.name ? `${c.facility} · ` : ''}{c.city}, {c.state}</span>
                            </div>
                            <div className="ghin-result-right">
                              {importingId === c.id
                                ? <span className="ghin-importing-label">Loading…</span>
                                : <ChevronRight size={14} className="ghin-chevron" />
                              }
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
