import { useState } from 'react';
import { X, Search, ChevronRight, MapPin } from 'lucide-react';
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
  ghinToken: string;
  onImportCourse: (course: Omit<Course, 'id'>) => void;
  onClearToken: () => void;
  onClose: () => void;
}

export function GhinCourseLookupModal({
  ghinToken,
  onImportCourse,
  onClearToken,
  onClose,
}: GhinCourseLookupModalProps) {
  const [name, setName] = useState('');
  const [state, setState] = useState('CA');
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<CourseResult[] | null>(null);

  const [importError, setImportError] = useState('');
  const [importingId, setImportingId] = useState<number | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setSearchError('Course name is required.'); return; }
    setSearchError('');
    setSearchLoading(true);
    setResults(null);
    try {
      const qs = new URLSearchParams({ token: ghinToken, name: name.trim() });
      if (state) qs.set('state', state);
      const res = await fetch(`/api/ghin-course-search?${qs.toString()}`);
      const data = await res.json() as { courses?: CourseResult[]; error?: string };
      if (res.status === 401 || data.error === 'token_expired') {
        onClearToken();
        setSearchError('Session expired — please sign in to GHIN again from the player search.');
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
      const qs = new URLSearchParams({ token: ghinToken, courseId: String(course.id) });
      const res = await fetch(`/api/ghin-course-detail?${qs.toString()}`);
      const data = await res.json() as { course?: Omit<Course, 'id'>; error?: string };
      if (res.status === 401 || data.error === 'token_expired') {
        onClearToken();
        setImportError('Session expired — please sign in to GHIN again from the player search.');
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
        </div>
      </div>
    </div>
  );
}
