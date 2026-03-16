import { X, Trash2, Plus, Save } from 'lucide-react';
import type { AppState } from '../hooks/useAppState';

interface CourseModalProps {
  appState: AppState;
}

export function CourseModal({ appState }: CourseModalProps) {
  const { isCourseModalOpen, editingCourse, setEditingCourse, setIsCourseModalOpen, saveCourse } = appState;

  if (!isCourseModalOpen || !editingCourse) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content course-editor">
        <header className="modal-header">
          <h2>{editingCourse.name ? 'Edit Course' : 'Add Course'}</h2>
          <button className="icon-btn" onClick={() => setIsCourseModalOpen(false)}>
            <X size={20} />
          </button>
        </header>
        <div className="modal-body">
          <div className="input-group">
            <label>Course Name</label>
            <input
              value={editingCourse.name}
              onChange={e => setEditingCourse({ ...editingCourse, name: e.target.value })}
              placeholder="e.g. Augusta National"
            />
          </div>
          <div className="editor-section">
            <h3>Tees</h3>
            <div className="tees-editor-grid">
              <div className="tee-row header">
                <span>Tee Name</span><span>Rating</span><span>Slope</span><span></span>
              </div>
              {editingCourse.tees.map((t, i) => (
                <div key={i} className="tee-row">
                  <input
                    value={t.name}
                    onChange={e => {
                      const nt = [...editingCourse.tees];
                      nt[i] = { ...nt[i], name: e.target.value };
                      setEditingCourse({ ...editingCourse, tees: nt });
                    }}
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={t.rating || ''}
                    placeholder="0"
                    onChange={e => {
                      const nt = [...editingCourse.tees];
                      nt[i] = { ...nt[i], rating: e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0) };
                      setEditingCourse({ ...editingCourse, tees: nt });
                    }}
                  />
                  <input
                    type="number"
                    value={t.slope || ''}
                    placeholder="0"
                    onChange={e => {
                      const nt = [...editingCourse.tees];
                      nt[i] = { ...nt[i], slope: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) };
                      setEditingCourse({ ...editingCourse, tees: nt });
                    }}
                  />
                  <button
                    className="icon-btn delete-btn"
                    onClick={() => {
                      if (editingCourse.tees.length > 1) {
                        setEditingCourse({ ...editingCourse, tees: editingCourse.tees.filter((_, idx) => idx !== i) });
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                className="add-btn"
                onClick={() => setEditingCourse({
                  ...editingCourse,
                  tees: [...editingCourse.tees, { name: 'New Tee', rating: 72.0, slope: 113 }],
                })}
              >
                <Plus size={14} /> Add Tee
              </button>
            </div>
          </div>
          <div className="editor-section">
            <h3>Holes</h3>
            <div className="holes-editor-grid">
              <div className="hole-row header"><span>#</span><span>Par</span><span>HDCP</span></div>
              {editingCourse.holes.map((h, i) => (
                <div key={i} className="hole-row">
                  <span className="h-num">{h.number}</span>
                  <input
                    type="number"
                    value={h.par || ''}
                    placeholder="0"
                    onChange={e => {
                      const nh = [...editingCourse.holes];
                      nh[i] = { ...nh[i], par: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) };
                      setEditingCourse({ ...editingCourse, holes: nh });
                    }}
                  />
                  <input
                    type="number"
                    value={h.handicap || ''}
                    placeholder="0"
                    onChange={e => {
                      const nh = [...editingCourse.holes];
                      nh[i] = { ...nh[i], handicap: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) };
                      setEditingCourse({ ...editingCourse, holes: nh });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <footer className="modal-footer">
          <button className="secondary-btn" onClick={() => setIsCourseModalOpen(false)}>Cancel</button>
          <button className="primary-btn" onClick={saveCourse} disabled={!editingCourse.name}>
            <Save size={16} /> Save Course
          </button>
        </footer>
      </div>
    </div>
  );
}
