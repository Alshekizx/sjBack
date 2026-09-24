import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/adminApi';

interface CaseLaw {
  id: string;
  case_name: string;
  citation: string;
  court: string;
  year: number;
  area_of_law: string;
  summary: string;
  legal_principles: string;
  status: 'published' | 'draft';
  created_at: string;
}

const MOCK_CASES: CaseLaw[] = [
  { id: '1', case_name: 'Donoghue v Stevenson', citation: '[1932] AC 562', court: 'House of Lords', year: 1932, area_of_law: 'Tort Law', summary: 'Established the modern concept of negligence and duty of care.', legal_principles: 'Neighbour principle; duty of care; negligence', status: 'published', created_at: '2024-01-10' },
  { id: '2', case_name: 'Hadley v Baxendale', citation: '(1854) 9 Exch 341', court: 'Court of Exchequer', year: 1854, area_of_law: 'Contract Law', summary: 'Established the remoteness of damage rule in contract law.', legal_principles: 'Remoteness of damage; foreseeable loss; contract breach', status: 'published', created_at: '2024-01-15' },
  { id: '3', case_name: 'Salomon v Salomon & Co Ltd', citation: '[1897] AC 22', court: 'House of Lords', year: 1897, area_of_law: 'Company Law', summary: 'Established the principle of corporate personality and separate legal entity.', legal_principles: 'Corporate personality; veil of incorporation; separate legal entity', status: 'published', created_at: '2024-01-20' },
  { id: '4', case_name: 'Carlill v Carbolic Smoke Ball Co', citation: '[1893] 1 QB 256', court: 'Court of Appeal', year: 1893, area_of_law: 'Contract Law', summary: 'Established that advertisements can constitute binding offers.', legal_principles: 'Offer; acceptance; consideration; unilateral contract', status: 'published', created_at: '2024-02-01' },
  { id: '5', case_name: 'R v Dudley and Stephens', citation: '(1884) 14 QBD 273', court: 'Queen\'s Bench Division', year: 1884, area_of_law: 'Criminal Law', summary: 'Necessity cannot be a defence to murder.', legal_principles: 'Necessity defence; murder; criminal liability', status: 'draft', created_at: '2024-02-10' },
];

export default function CaseLawManager() {
  const [cases, setCases] = useState<CaseLaw[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseLaw | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    case_name: '', citation: '', court: '', year: new Date().getFullYear(),
    area_of_law: '', summary: '', legal_principles: '', status: 'draft' as CaseLaw['status'],
  });

  useEffect(() => {
    adminApi.list<CaseLaw>('case-law').then(setCases).catch((err) => setError(err.message));
  }, []);

  const filtered = cases.filter((c) =>
    !search || c.case_name.toLowerCase().includes(search.toLowerCase()) || c.area_of_law.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.case_name.trim()) { setError('Enter a case name.'); return; }
    if (!Number.isInteger(form.year) || form.year < 1000 || form.year > 3000) { setError('Enter a year between 1000 and 3000.'); return; }
    setError('');
    if (editingCase) {
      const updated = { ...editingCase, ...form };
      try { await adminApi.save('case-law', updated); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save case law.'); return; }
      setCases((prev) => prev.map((c) => (c.id === editingCase.id ? updated : c)));
    } else {
      const newCase: CaseLaw = { id: crypto.randomUUID(), ...form, created_at: new Date().toISOString() };
      try { await adminApi.save('case-law', newCase); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save case law.'); return; }
      setCases((prev) => [newCase, ...prev]);
    }
    setShowForm(false);
    setEditingCase(null);
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Case Law Library</h1>
        <button
          onClick={() => { setEditingCase(null); setForm({ case_name: '', citation: '', court: '', year: new Date().getFullYear(), area_of_law: '', summary: '', legal_principles: '', status: 'draft' }); setShowForm(true); }}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#6366f1', color: 'white' }}
        >
          + Add Case
        </button>
      </div>
      {error && <div className="text-sm" style={{ color: '#fca5a5' }}>{error}</div>}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search cases..."
        className="px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: '#1a1d27', border: '1px solid #2a2d3e', color: '#e2e8f0', width: '280px' }}
      />

      <div className="space-y-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="rounded-xl p-5 transition-all"
            style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0', fontFamily: 'DM Serif Display, serif' }}>
                    {c.case_name}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1f2235', color: '#818cf8' }}>{c.area_of_law}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ color: c.status === 'published' ? '#10b981' : '#f59e0b', background: c.status === 'published' ? '#10b98120' : '#f59e0b20' }}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: '#6366f1', fontFamily: 'JetBrains Mono, monospace' }}>{c.citation} • {c.court} • {c.year}</p>
                <p className="text-sm mt-2" style={{ color: '#94a3b8' }}>{c.summary}</p>
                <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
                  <span className="font-medium" style={{ color: '#94a3b8' }}>Key principles: </span>
                  {c.legal_principles}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => { setEditingCase(c); setForm({ case_name: c.case_name, citation: c.citation, court: c.court, year: c.year, area_of_law: c.area_of_law, summary: c.summary, legal_principles: c.legal_principles, status: c.status }); setShowForm(true); }}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: '#2a2d3e', color: '#94a3b8' }}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl max-h-screen overflow-y-auto rounded-2xl" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
            <div className="flex items-center justify-between px-6 py-4 sticky top-0" style={{ borderBottom: '1px solid #2a2d3e', background: '#1a1d27' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{editingCase ? 'Edit Case' : 'Add Case Law'}</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#6b7280' }}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              {[
                { label: 'Case Name', field: 'case_name', placeholder: 'e.g. Donoghue v Stevenson' },
                { label: 'Citation', field: 'citation', placeholder: 'e.g. [1932] AC 562' },
                { label: 'Court', field: 'court', placeholder: 'e.g. House of Lords' },
                { label: 'Area of Law', field: 'area_of_law', placeholder: 'e.g. Tort Law' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label htmlFor={field} className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>{label}</label>
                  <input id={field}
                    value={(form as any)[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                    style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="caselawmanager-field-2" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Year</label>
                  <input id="caselawmanager-field-2"
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                    style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
                  />
                </div>
                <div>
                  <label htmlFor="caselawmanager-field-3" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Status</label>
                  <select id="caselawmanager-field-3"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                    style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              {[
                { label: 'Summary', field: 'summary' },
                { label: 'Legal Principles / Keywords', field: 'legal_principles' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label htmlFor={field} className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>{label}</label>
                  <textarea id={field}
                    value={(form as any)[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none"
                    style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #2a2d3e' }}>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ background: '#2a2d3e', color: '#94a3b8' }}>Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#6366f1', color: 'white' }}>
                {editingCase ? 'Save Changes' : 'Add Case'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
