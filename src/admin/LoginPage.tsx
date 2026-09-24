import { useState } from 'react';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(error);
    } catch { setError('Unable to sign in. Check your connection and try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#0f1117' }}>
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-16" style={{ background: '#13161f', borderRight: '1px solid #2a2d3e' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#6366f1' }}>
            <span className="text-white font-bold text-lg" style={{ fontFamily: 'DM Serif Display, serif' }}>SJ</span>
          </div>
          <div>
            <div className="text-white font-semibold text-sm">SJ Law Academy</div>
            <div className="text-xs" style={{ color: '#6b7280' }}>Admin Portal</div>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-light mb-4 leading-tight" style={{ color: '#e2e8f0', fontFamily: 'DM Serif Display, serif' }}>
            Manage your<br /><em>legal education</em><br />platform
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
            Complete administrative control over academic content, student management, subscriptions, and platform operations.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Active Students', value: '2,841' },
            { label: 'Courses Published', value: '156' },
            { label: 'Active Subscriptions', value: '1,204' },
            { label: 'Support Tickets', value: '12' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg p-4" style={{ background: '#1a1d27', border: '1px solid #2a2d3e' }}>
              <div className="text-2xl font-semibold" style={{ color: '#6366f1' }}>{stat.value}</div>
              <div className="text-xs mt-1" style={{ color: '#6b7280' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#6366f1' }}>
              <span className="text-white font-bold text-lg">SJ</span>
            </div>
            <div>
              <div className="text-white font-semibold text-sm">SJ Law Academy</div>
              <div className="text-xs" style={{ color: '#6b7280' }}>Admin Portal</div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Sign in</h2>
          <p className="text-sm mb-8" style={{ color: '#6b7280' }}>Access the administration dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sjlawacademy.com"
                required
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={{ background: '#1a1d27', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
                onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                onBlur={(e) => (e.target.style.borderColor = '#2a2d3e')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={{ background: '#1a1d27', border: '1px solid #2a2d3e', color: '#e2e8f0' }}
                onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                onBlur={(e) => (e.target.style.borderColor = '#2a2d3e')}
              />
            </div>

            {error && (
              <div className="text-sm px-4 py-3 rounded-lg" style={{ background: '#2d1515', border: '1px solid #7f1d1d', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all"
              style={{ background: '#6366f1', color: 'white', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-xs text-center" style={{ color: '#6b7280' }}>
            Use a Supabase Auth account assigned an administrator role.
          </p>
        </div>
      </div>
    </div>
  );
}
