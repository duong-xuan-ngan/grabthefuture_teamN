import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api/client.js';

const ROLES = [
  { value: 'user',       label: 'User',       desc: 'Report bins and book pickups' },
  { value: 'driver',     label: 'Driver',     desc: 'Receive tasks and report collections' },
  { value: 'dispatcher', label: 'Dispatcher', desc: 'Monitor the map, approve routing decisions' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [role, setRole]         = useState('user');
  const [error, setError]       = useState(null);
  const [busy, setBusy]         = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return; }
    setBusy(true);
    try {
      const res = await api.register(username.trim(), password, role);
      const dest = res.role === 'driver' ? '/driver'
        : res.role === 'user' ? '/r'
        : '/dispatcher';
      navigate(dest, { replace: true });
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('409') || msg.toLowerCase().includes('taken')) {
        setError('Username already taken — try another');
      } else if (msg.includes('400')) {
        setError(msg.split('→')[1]?.trim() || 'Invalid input');
      } else {
        setError('Registration failed — please try again');
      }
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
          Create account
        </h1>
        <p className="text-sm text-ink-2 mt-1.5 leading-relaxed">
          Register as a user, driver, or dispatcher.
        </p>

        <form onSubmit={submit} className="mt-6 bg-white border border-hairline rounded-card p-6 shadow-card space-y-4">

          {/* Role selector */}
          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase text-ink-2 mb-2">
              Role
            </div>
            <div className="grid grid-cols-1 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`px-3 py-2.5 rounded-btn text-left border transition-colors ${
                    role === r.value
                      ? 'border-primary bg-primary-soft'
                      : 'border-hairline bg-surface hover:border-ink-3'
                  }`}
                >
                  <div className="text-[13px] font-semibold">{r.label}</div>
                  <div className="text-[11px] text-ink-2 mt-0.5 leading-tight">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-[11px] font-semibold tracking-widest uppercase text-ink-2 mb-1.5">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              minLength={3}
              required
              className="w-full px-3.5 py-3 text-sm border border-hairline rounded-btn bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              placeholder="e.g. minh_driver"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold tracking-widest uppercase text-ink-2 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
              className="w-full px-3.5 py-3 text-sm border border-hairline rounded-btn bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              placeholder="At least 6 characters"
            />
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-[11px] font-semibold tracking-widest uppercase text-ink-2 mb-1.5">
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full px-3.5 py-3 text-sm border border-hairline rounded-btn bg-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              placeholder="Re-enter password"
            />
          </div>

          {error && (
            <div className="p-3 bg-danger-soft text-danger text-xs rounded-btn font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !username || !password || !confirm}
            className="w-full py-3.5 text-[15px] font-semibold text-white rounded-pill transition-colors duration-200 disabled:opacity-50"
            style={{ background: '#00B14F' }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#00873A'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}
          >
            {busy ? 'Creating account…' : 'Create account'}
          </button>

          <div className="text-center text-[12px] text-ink-2">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-semibold text-primary hover:underline"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
