import React, { useState } from 'react';
// तपाईंको मुख्य Dashboard component लाई Import गरिएको छ
import { ChequeDesk } from './components/ChequeDesk'; 
import { DeveloperConsole } from './components/DeveloperConsole';

export default function App() {
  const [companyCode, setCompanyCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<'SUPER_ADMIN' | 'TENANT' | ''>('');
  const [activeCompany, setActiveCompany] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Super Admin Bypass
    if (username.trim() === 'Kuber' && password === 'Kuber@1122') {
      setRole('SUPER_ADMIN');
      setIsLoggedIn(true);
      return;
    }

    // Client Login
    if (!companyCode.trim()) {
      setError('Company Code is required!');
      return;
    }

    if (username && password) {
      setRole('TENANT');
      setActiveCompany(companyCode.trim());
      setIsLoggedIn(true);
    } else {
      setError('Invalid Username or Password!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setRole('');
    setCompanyCode('');
    setUsername('');
    setPassword('');
  };

  // 1. Login View
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            Cheque Management System
          </h2>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Company Code
              </label>
              <input
                type="text"
                placeholder="e.g. 1063 (Leave blank for Kuber)"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                className="mt-1 w-full p-2 border rounded-md outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full p-2 border rounded-md outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full p-2 border rounded-md outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Developer Console View
  if (role === 'SUPER_ADMIN') {
    return <DeveloperConsole onLogout={handleLogout} />;
  }

  // 3. Full ChequeDesk Client View
  return <ChequeDesk companyCode={activeCompany} onLogout={handleLogout} />;
}
