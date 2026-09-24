import { useEffect, useState } from 'react';
import PageContentFields, { contentTemplates } from './PageContentFields';
import { adminApi } from '../../lib/adminApi';

interface Page {
  id: string;
  content?: Record<string, any>;
  title: string;
  slug: string;
  status: 'published' | 'draft' | 'archived';
  last_edited_by: string;
  last_edited_at: string;
  meta_description?: string;
}

const MOCK_PAGES: Page[] = [
  { id: '1', title: 'Homepage', slug: '/', status: 'published', last_edited_by: 'Super Admin', last_edited_at: '2024-03-16', meta_description: 'SJ Law Academy — Nigeria\'s premier online law education platform' },
  { id: '2', title: 'About Us', slug: '/about', status: 'published', last_edited_by: 'Content Manager', last_edited_at: '2024-03-14', meta_description: 'Learn about SJ Law Academy\'s mission and team' },
  { id: '3', title: 'Academic Levels', slug: '/academic-levels', status: 'published', last_edited_by: 'Content Manager', last_edited_at: '2024-03-12' },
  { id: '4', title: 'Pricing', slug: '/pricing', status: 'published', last_edited_by: 'Super Admin', last_edited_at: '2024-03-10' },
  { id: '5', title: 'Contact', slug: '/contact', status: 'published', last_edited_by: 'Super Admin', last_edited_at: '2024-03-08' },
  { id: '6', title: 'FAQ', slug: '/faq', status: 'published', last_edited_by: 'Support Manager', last_edited_at: '2024-03-06' },
  { id: '7', title: 'Terms of Service', slug: '/terms', status: 'published', last_edited_by: 'Super Admin', last_edited_at: '2024-02-20' },
  { id: '8', title: 'Privacy Policy', slug: '/privacy', status: 'published', last_edited_by: 'Super Admin', last_edited_at: '2024-02-20' },
  { id: '9', title: 'New Promotions Page', slug: '/promotions', status: 'draft', last_edited_by: 'Content Manager', last_edited_at: '2024-03-15' },
];

export default function PagesManager() {
  const [pages, setPages] = useState<Page[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Page | null>(null);
  const [form, setForm] = useState({ title: '', slug: '', status: 'draft' as Page['status'], meta_description: '', content: {} as Record<string, any> });

  const statusColor: Record<string, string> = { published: '#10b981', draft: '#f59e0b', archived: '#6b7280' };

  useEffect(() => { adminApi.list<Page>('pages').then(setPages).catch(err => setError(err.message)); }, []);

  const handleSave = async () => {
    if (!editing) return;
    if (!form.title.trim()) { setError('Enter a page title.'); return; }
    if (!/^[a-z0-9/-]+$/.test(form.slug)) { setError('Enter a page address without spaces, for example about.'); return; }
    const slug = form.slug.replace(/^\/+|\/+$/g, '') || 'home';
    const updated = { ...editing, ...form, slug, last_edited_at: new Date().toISOString(), last_edited_by: 'Administrator' };
    try { await adminApi.save('pages', updated); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save page.'); return; }
    setPages((prev) => prev.some(p => p.id === editing.id) ? prev.map((p) => p.id === editing.id ? updated : p) : [...prev, updated]);
    setEditing(null);
  };

  const togglePublish = async (page: Page) => {
    const newStatus: Page['status'] = page.status === 'published' ? 'draft' : 'published';
    const updated = { ...page, status: newStatus, last_edited_at: new Date().toISOString(), last_edited_by: 'Administrator' };
    try { await adminApi.save('pages', updated); setPages((prev) => prev.map((p) => p.id === page.id ? updated : p)); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update page.'); }
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <h1 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Website Pages</h1>
      <div className="flex flex-wrap gap-2">{Object.keys(contentTemplates).filter(slug => !pages.some(page => (page.slug.replace(/^\/+|\/+$/g, '') || 'home') === slug)).map(slug => <button key={slug} onClick={() => { const page: Page = { id: crypto.randomUUID(), title: slug === 'home' ? 'Home' : slug, slug, status: 'draft', last_edited_by: '', last_edited_at: '' }; setEditing(page); setForm({ title: page.title, slug, status: 'draft', meta_description: '', content: {} }); }} className="text-sm text-indigo-300 border border-slate-700 rounded px-3 py-2">Add {slug} page</button>)}</div>
      {error && <div className="text-sm" style={{ color: '#fca5a5' }}>{error}</div>}

      <div className="rounded-xl overflow-hidden" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2d3e' }}>
              {['Page', 'Page address', 'Status', 'Last Edited', 'By', 'Actions'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: '#6b7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pages.map((page, i) => (
              <tr
                key={page.id}
                style={{ borderBottom: i < pages.length - 1 ? '1px solid #2a2d3e' : undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1f2235')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="px-5 py-3.5 text-sm font-medium" style={{ color: '#e2e8f0' }}>{page.title}</td>
                <td className="px-5 py-3.5 text-xs" style={{ color: '#6366f1', fontFamily: 'JetBrains Mono, monospace' }}>{page.slug}</td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-1 rounded-full capitalize" style={{ color: statusColor[page.status], background: statusColor[page.status] + '20' }}>
                    {page.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs" style={{ color: '#6b7280' }}>{page.last_edited_at}</td>
                <td className="px-5 py-3.5 text-xs" style={{ color: '#94a3b8' }}>{page.last_edited_by}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditing(page); setForm({ title: page.title, slug: page.slug, status: page.status, meta_description: page.meta_description || '', content: page.content || {} }); }}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: '#2a2d3e', color: '#94a3b8' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => togglePublish(page)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: page.status === 'published' ? '#2d1515' : '#1f2d1f', color: page.status === 'published' ? '#fca5a5' : '#86efac' }}
                    >
                      {page.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl max-h-[90dvh] overflow-y-auto" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #2a2d3e' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Edit Page — {editing.title}</h2>
              <button onClick={() => setEditing(null)} style={{ color: '#6b7280' }}>✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              <div>
                <label htmlFor="pagesmanager-field-1" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Page Title</label>
                <input id="pagesmanager-field-1" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }} />
              </div>
              <div>
                <label htmlFor="pagesmanager-field-2" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Page address</label>
                <input id="pagesmanager-field-2" placeholder="e.g. about" value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#6366f1', fontFamily: 'JetBrains Mono, monospace' }} />
              </div>
              <div>
                <label htmlFor="pagesmanager-field-3" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Search engine description</label>
                <textarea id="pagesmanager-field-3" value={form.meta_description} onChange={(e) => setForm(f => ({ ...f, meta_description: e.target.value }))} rows={3} className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none" style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }} placeholder="Describe this page for search engines..." />
                <div className="text-xs mt-1 text-right" style={{ color: form.meta_description.length > 160 ? '#ef4444' : '#6b7280' }}>
                  {form.meta_description.length}/160
                </div>
              </div>
              <PageContentFields value={form.content} onChange={content => setForm(prev => ({ ...prev, content }))} template={contentTemplates[form.slug.replace(/^\/+|\/+$/g, '') || 'home'] || { heading: '', sections: [{ title: '', text: '' }] }} />
              <div>
                <label htmlFor="pagesmanager-field-4" className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Status</label>
                <select id="pagesmanager-field-4" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as any }))} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={{ background: '#13161f', border: '1px solid #2a2d3e', color: '#e2e8f0' }}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #2a2d3e' }}>
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm" style={{ background: '#2a2d3e', color: '#94a3b8' }}>Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#6366f1', color: 'white' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
