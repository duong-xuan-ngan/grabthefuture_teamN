import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import * as api from '../api/client.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.login(username.trim(), password);
      let dest = location.state?.from;
      if (!dest) {
        if (res.role === 'driver')   dest = '/driver';
        else if (res.role === 'admin') dest = '/admin';
        else if (res.role === 'user')  dest = '/r';
        else if (res.role === 'manager' && res.waste_point_id != null)
          dest = `/r?b=${res.waste_point_id}&role=manager`;
        else dest = '/dispatcher';
      }
      navigate(dest, { replace: true });
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-surface px-5 py-10">
      <div className="w-full max-w-[380px]">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-btn flex items-center justify-center flex-shrink-0" style={{ background: '#00B14F' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" />
            </svg>
          </div>
          <div className="text-lg font-bold text-ink tracking-tightish">Erac</div>
        </div>

        <h1 className="text-[26px] font-bold tracking-tightish leading-tight text-ink" style={{ letterSpacing: '-0.5px' }}>
          Sign in
        </h1>
        <p className="text-sm text-ink-2 mt-1.5 leading-relaxed">
          Dispatcher, driver, and admin access.
        </p>

        <form onSubmit={submit} className="mt-6 bg-white border border-hairline rounded-card p-6 shadow-card">
          <label className="block text-[11px] font-semibold tracking-widest uppercase text-ink-2 mb-1.5">
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            className="w-full px-3.5 py-3 text-sm border border-hairline rounded-btn bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors mb-4"
            placeholder="dispatcher"
          />

          <label className="block text-[11px] font-semibold tracking-widest uppercase text-ink-2 mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-3 text-sm border border-hairline rounded-btn bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            placeholder="••••••••"
          />

          {error && (
            <div className="mt-4 p-3 bg-danger-soft text-danger text-xs rounded-btn font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !username || !password}
            className="mt-5 w-full py-3.5 text-[15px] font-semibold text-white rounded-pill transition-colors duration-200 disabled:opacity-50"
            style={{ background: busy || !username || !password ? '#00B14F' : '#00B14F' }}
            onMouseEnter={e => { if (!busy && username && password) e.currentTarget.style.background = '#00873A'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="mt-4 text-center text-[12px] text-ink-2">
            No account?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create one
            </Link>
          </div>
          <div className="mt-3 text-[11px] text-ink-3 leading-snug">
            Demo (password <span className="font-mono">demo123</span>):<br />
            admin · dispatcher · driver1 · driver2<br />
            manager.benthanh · manager.buivien · manager.tanbinh
          </div>
        </form>
      </div>
    </div>
  );
}
