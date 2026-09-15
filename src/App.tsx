import React, { useState } from 'react';

export default function App() {
  const [companyCode, setCompanyCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Super Admin Developer Login Check (No Company Code needed)
    if (username.trim() === 'Kuber' && password === 'Kuber@1122') {
      setRole('SUPER_ADMIN');
      setIsLoggedIn(true);
      return;
    }

    // 2. Client Login Check
    if (!companyCode.trim()) {
      setError('कम्पनी कोड (Company Code) राख्नुहोस्।');
      return;
    }

    if (username && password) {
      setRole('TENANT');
      setIsLoggedIn(true);
    } else {
      setError('Username वा Password मिलेन।');
    }
  };

  if (isLoggedIn) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">
          {role === 'SUPER_ADMIN' ? 'Developer Console View' : `Client Dashboard (Company: ${companyCode})`}
        </h1>
        <button 
          onClick={() => setIsLoggedIn(false)}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-xl font-bold text-center mb-4">ChequeDesk Secure Login</h2>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Company Code (Developer ले खाली छाड्ने)</label>
            <input
              type="text"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              className="w-full border p-2 rounded text-sm"
              placeholder="e.g. 1063"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border p-2 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border p-2 rounded text-sm"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
