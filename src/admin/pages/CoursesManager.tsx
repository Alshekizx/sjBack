import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/adminApi';

interface Course {
  id: string;
  code?: string;
  thumbnail_url?: string;
  instructor?: string;
  title: string;
  description: string;
  academic_level: string;
  status: 'draft' | 'published' | 'archived';
  lessons_count: number;
  created_at: string;
  updated_at: string;
}

const MOCK_COURSES: Course[] = [
  { id: '1', title: 'Constitutional Law', description: 'Fundamentals of Nigerian constitutional law', academic_level: '100L', status: 'published', lessons_count: 24, created_at: '2024-01-15', updated_at: '2024-03-10' },
  { id: '2', title: 'Law of Contract', description: 'Formation, terms, and remedies in contract law', academic_level: '200L', status: 'published', lessons_count: 32, created_at: '2024-01-20', updated_at: '2024-03-12' },
  { id: '3', title: 'Criminal Law', description: 'Principles of criminal liability and offences', academic_level: '200L', status: 'published', lessons_count: 28, created_at: '2024-02-01', updated_at: '2024-03-08' },
  { id: '4', title: 'Law of Tort', description: 'Civil wrongs, liability, and remedies', academic_level: '300L', status: 'published', lessons_count: 30, created_at: '2024-02-10', updated_at: '2024-03-14' },
  { id: '5', title: 'Company Law', description: 'Corporate governance and business entities', academic_level: '300L', status: 'draft', lessons_count: 18, created_at: '2024-02-20', updated_at: '2024-03-15' },
  { id: '6', title: 'Land Law', description: 'Real property rights and interests under Nigerian law', academic_level: '400L', status: 'published', lessons_count: 26, created_at: '2024-03-01', updated_at: '2024-03-13' },
  { id: '7', title: 'Equity and Trusts', description: 'Equitable principles and trust administration', academic_level: '400L', status: 'draft', lessons_count: 12, created_at: '2024-03-05', updated_at: '2024-03-16' },
  { id: '8', title: 'Evidence Law', description: 'Rules of admissibility and burden of proof', academic_level: '500L', status: 'published', lessons_count: 22, created_at: '2024-03-08', updated_at: '2024-03-14' },
];

const LEVELS = ['All Levels', '100L', '200L', '300L', '400L', '500L'];
const STATUSES = ['All', 'published', 'draft', 'archived'];

export default function CoursesManager() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ level: 'All Levels', status: 'All', search: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState({ title: '', description: '', code: '', thumbnail_url: '', instructor: '', academic_level: '100L', status: 'draft' as Course['status'] });

  useEffect(() => {
    const load = async () => {
      try { setCourses(await adminApi.list<Course>('courses')); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load courses.'); }
    };
    load();
  }, []);

  const filtered = courses.filter((c) => {
    const matchLevel = filter.level === 'All Levels' || c.academic_level === filter.level;
    const matchStatus = filter.status === 'All' || c.status === filter.status;
    const matchSearch = !filter.search || c.title.toLowerCase().includes(filter.search.toLowerCase());
    return matchLevel && matchStatus && matchSearch;
  });

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Enter a course title.'); return; }
    setError('');
    if (editingCourse) {
      const updated = { ...editingCourse, ...form, updated_at: new Date().toISOString() };
      try { await adminApi.save('courses', updated); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save course.'); return; }
      setCourses((prev) => prev.map((c) => (c.id === editingCourse.id ? updated : c)));
    } else {
      const newCourse: Course = {
        id: crypto.randomUUID(),
        ...form,
        lessons_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      try { await adminApi.save('courses', newCourse); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save course.'); return; }
      setCourses((prev) => [newCourse, ...prev]);
    }
    setShowForm(false);
    setEditingCourse(null);
    setForm({ title: '', description: '', code: '', thumbnail_url: '', instructor: '', academic_level: '100L', status: 'draft' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course? This cannot be undone.')) return;
    try { await adminApi.remove('courses', id); setCourses((prev) => prev.filter((c) => c.id !== id)); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete course.'); }
  };

  const statusColor: Record<string, string> = {
    published: '#10b981',
    draft: '#f59e0b',
    archived: '#6b7280',
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Courses & Academic Levels</h1>
        <button
          onClick={() => { setEditingCourse(null); setForm({ title: '', description: '', code: '', thumbnail_url: '', instructor: '', academic_level: '100L', status: 'draft' }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: '#6366f1', color: 'white' }}
        >
          + New Course
        </button>
      </div>
      {error && <div className="text-sm" style={{ color: '#fca5a5' }}>{error}</div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={filter.search}
          onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
          placeholder="Search courses..."
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: '#1a1d27', border: '1px solid #2a2d3e', color: '#e2e8f0', width: '220px' }}
        />
        <select
          value={filter.level}
          onChange={(e) => setFilter((f) => ({ ...f, level: e.target.value }))}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: '#1a1d27', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
        >
          {LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: '#1a1d27', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
        >
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="text-sm self-center" style={{ color: '#6b7280' }}>{filtered.length} courses</span>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
              {['Title', 'Level', 'Lessons', 'Status', 'Last Updated', 'Actions'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6b7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((course, i) => (
              <tr
                key={course.id}
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid #2a2d3e' : undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1f2235')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-5 py-3.5">
                  <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{course.title}</div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>{course.description.slice(0, 60)}…</div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: '#1f2235', color: '#818cf8' }}>
                    {course.academic_level}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm" style={{ color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                  {course.lessons_count}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-1 rounded-full capitalize" style={{ color: statusColor[course.status], background: statusColor[course.status] + '20' }}>
                    {course.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs" style={{ color: '#6b7280' }}>
                  {new Date(course.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingCourse(course); setForm({ title: course.title, description: course.description, code: course.code || '', thumbnail_url: course.thumbnail_url || '', instructor: course.instructor || '', academic_level: course.academic_level, status: course.status }); setShowForm(true); }}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: '#2a2d3e', color: '#94a3b8' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: '#2d1515', color: '#fca5a5' }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: '#6b7280' }}>
            <div className="text-3xl mb-3">📚</div>
            <div className="text-sm">No courses found</div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl max-h-[90dvh] overflow-y-auto" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #2a2d3e' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                {editingCourse ? 'Edit Course' : 'New Course'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#6b7280' }}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              <div>
                <label htmlFor="coursesmanager-field-1" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Course Title</label>
                <input id="coursesmanager-field-1"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
                  placeholder="e.g. Constitutional Law"
                />
              </div>
              {(['code', 'instructor', 'thumbnail_url'] as const).map(field => <label key={field} className="block text-xs text-slate-300">{field === 'code' ? 'Course code (optional)' : field === 'instructor' ? 'Instructor (optional)' : 'Course image link (optional)'}<input value={form[field]} onChange={event => setForm(prev => ({ ...prev, [field]: event.target.value }))} className="w-full p-3 rounded-lg mt-2 bg-slate-900 text-slate-200" /></label>)}
              <div>
                <label htmlFor="coursesmanager-field-2" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Description</label>
                <textarea id="coursesmanager-field-2"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none"
                  style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="coursesmanager-field-3" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Academic Level</label>
                  <select id="coursesmanager-field-3"
                    value={form.academic_level}
                    onChange={(e) => setForm((f) => ({ ...f, academic_level: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                    style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
                  >
                    {['100L', '200L', '300L', '400L', '500L'].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="coursesmanager-field-4" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Status</label>
                  <select id="coursesmanager-field-4"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                    style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #2a2d3e' }}>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: '#2a2d3e', color: '#94a3b8' }}>
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#6366f1', color: 'white' }}>
                {editingCourse ? 'Save Changes' : 'Create Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
