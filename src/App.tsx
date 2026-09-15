import React, { useState } from 'react';
import { DeveloperConsole } from './components/DeveloperConsole';
import { MainDashboard } from './components/MainDashboard';
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

    // 1. Super Admin Bypass (Kuber / Kuber@1122)
    if (username.trim() === 'Kuber' && password === 'Kuber@1122') {
      setRole('SUPER_ADMIN');
      setIsLoggedIn(true);
      return;
    }

    // 2. Client Login Validation
    if (!companyCode.trim()) {
      setError('Company Code is required for Client login!');
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
                Company Code (Optional for Super Admin)
              </label>
              <input
                type="text"
                placeholder="e.g. 1063"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Username / Email
              </label>
              <input
                type="text"
                required
                placeholder="Enter Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
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

  // Developer Console View (Super Admin)
  if (role === 'SUPER_ADMIN') {
    return (
      <div>
        <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <h1 className="font-bold text-lg">Developer Master Console</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded"
          >
            Logout
          </button>
        </nav>
        <div className="p-6">
          <DeveloperConsole />
        </div>
      </div>
    );
  }

  // Client Dashboard View
  return (
    <div>
      <nav className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h1 className="font-bold text-lg">Client Dashboard ({activeCompany})</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded"
        >
          Logout
        </button>
      </nav>
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">Welcome to Company {activeCompany}</h2>
      </div>
    </div>
  );
}
