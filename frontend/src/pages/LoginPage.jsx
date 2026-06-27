// LoginPage — shared login for dispatcher and driver
// Member C owns this page.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      const data = await login(username, password);
      localStorage.setItem('wh_token',    data.token);
      localStorage.setItem('wh_role',     data.role);
      localStorage.setItem('wh_truck_id', data.truck_id ?? '');
      navigate(data.role === 'driver' ? '/driver' : '/dispatcher');
    } catch (e) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">WasteHotspot</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl text-base"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}
