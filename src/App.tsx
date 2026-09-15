import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Protected Route Component for Super Admin
const SuperAdminLogin = ({ onLogin }: { onLogin: (role: string) => void }) => {
  const [companyCode, setCompanyCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Super Admin Check (Company Code Optional/Not Required)
    if (username.trim() === 'Kuber' && password === 'Kuber@1122') {
      localStorage.setItem('user_role', 'SUPER_ADMIN');
      onLogin('SUPER_ADMIN');
      navigate('/admin/dashboard');
      return;
    }

    // 2. Client / Tenant Check (Company Code Required)
    if (!companyCode.trim()) {
      setError('कृपया Client Login को लागि Company Code राख्नुहोस्।');
      return;
    }

    if (username && password) {
      // Authenticated Tenant
      localStorage.setItem('user_role', 'TENANT');
      localStorage.setItem('tenant_code', companyCode);
      onLogin('TENANT');
      navigate('/dashboard');
    } else {
      setError('विवरण मिलेन! कृपया सही Company Code, Username र Password हाल्नुहोस्।');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-2 text-emerald-400">ChequeDesk Login</h2>
        <p className="text-slate-400 text-center text-sm mb-6">कम्पनी वा Developer Dashboard मा लगइन गर्नुहोस्</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Company Code (Client को लागि मात्र)</label>
            <input
              type="text"
              placeholder="e.g. 1001 (Developer ले खाली छाड्नुहोस्)"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Username / Email</label>
            <input
              type="text"
              required
              placeholder="Username राख्नुहोस्"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="Password राख्नुहोस्"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 font-medium py-2 rounded transition-colors text-sm mt-4"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
