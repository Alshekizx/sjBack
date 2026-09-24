import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface MediaFile {
  name: string;
  id: string | null;
  created_at: string | null;
  metadata?: { size?: number; mimetype?: string } | null;
  url?: string;
}

const ACCEPTED_TYPES = 'image/*,application/pdf,video/mp4,.doc,.docx';
const BUCKET = 'media';

export default function MediaManager() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const loadFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      const enriched = await Promise.all((data || []).filter(file => file.id).map(async file => {
        const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(file.name, 3600);
        if (error) throw error;
        return { ...file, url: signed.signedUrl };
      }));
      setFiles(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load files. Please try again.');
      setFiles([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadFiles(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_MB = 50;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_MB}MB.`);
      return;
    }

    setUploading(true);
    setError('');
    const path = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (error) {
      setError(error.message);
    } else {
      await loadFiles();
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (name: string) => {
    if (!confirm('Delete this file? This cannot be undone.')) return;
    try {
      const { error } = await supabase.storage.from(BUCKET).remove([name]);
      if (error) throw error;
      setFiles((prev) => prev.filter((f) => f.name !== name));
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete file.'); }
  };

  const isImage = (f: MediaFile) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name);
  const isPDF = (f: MediaFile) => /\.pdf$/i.test(f.name);
  const isVideo = (f: MediaFile) => /\.(mp4|mov|avi)$/i.test(f.name);

  const filteredFiles = files.filter((f) => {
    if (filter === 'images') return isImage(f);
    if (filter === 'pdfs') return isPDF(f);
    if (filter === 'videos') return isVideo(f);
    return true;
  });

  const fileIcon = (f: MediaFile) => {
    if (isImage(f)) return '🖼️';
    if (isPDF(f)) return '📄';
    if (isVideo(f)) return '🎬';
    return '📎';
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Media Manager</h1>
        <div className="flex gap-3">
          <input ref={fileRef} type="file" accept={ACCEPTED_TYPES} onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: '#6366f1', color: 'white', opacity: uploading ? 0.7 : 1 }}
          >
            {uploading ? '⏳ Uploading...' : '+ Upload File'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ background: '#2d1515', border: '1px solid #7f1d1d', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All Files' },
          { id: 'images', label: 'Images' },
          { id: 'pdfs', label: 'PDFs' },
          { id: 'videos', label: 'Videos' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{
              background: filter === tab.id ? '#6366f1' : '#1a1d27',
              color: filter === tab.id ? 'white' : '#6b7280',
              border: '1px solid',
              borderColor: filter === tab.id ? '#6366f1' : '#2a2d3e',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24" style={{ color: '#6b7280' }}>
          <div className="text-sm">Loading files…</div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-xl cursor-pointer transition-all"
          style={{ background: '#1a1d27', border: '2px dashed #2a2d3e' }}
          onClick={() => fileRef.current?.click()}
        >
          <div className="text-4xl mb-3">🗂️</div>
          <div className="text-sm font-medium mb-1" style={{ color: '#e2e8f0' }}>No files yet</div>
          <div className="text-xs" style={{ color: '#6b7280' }}>Click to upload images, PDFs, videos, and documents</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {/* Upload tile */}
          <div
            className="aspect-square rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
            style={{ background: '#1a1d27', border: '2px dashed #2a2d3e' }}
            onClick={() => fileRef.current?.click()}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2a2d3e')}
          >
            <span className="text-2xl">+</span>
            <span className="text-xs" style={{ color: '#6b7280' }}>Upload</span>
          </div>

          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="group relative rounded-xl overflow-hidden"
              style={{ background: '#1a1d27', border: '1px solid #2a2d3e', aspectRatio: '1' }}
            >
              {isImage(file) && file.url ? (
                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <span className="text-3xl">{fileIcon(file)}</span>
                  <span className="text-xs text-center px-2 break-all" style={{ color: '#94a3b8' }}>
                    {file.name.length > 20 ? file.name.slice(0, 17) + '…' : file.name}
                  </span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all" style={{ background: 'rgba(15,17,23,0.85)' }}>
                <div className="text-xs text-center px-2" style={{ color: '#e2e8f0' }}>
                  {file.name.length > 24 ? file.name.slice(0, 21) + '…' : file.name}
                </div>
                <div className="text-xs" style={{ color: '#6b7280' }}>{formatBytes(file.metadata?.size)}</div>
                <div className="flex gap-2 mt-1">
                  {file.url && (
                    <a href={file.url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded-md" style={{ background: '#2a2d3e', color: '#94a3b8' }}>
                      View
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(file.name)}
                    className="text-xs px-2 py-1 rounded-md"
                    style={{ background: '#2d1515', color: '#fca5a5' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
