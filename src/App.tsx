import React, { useState } from 'react';

export default function App() {
  const [companyCode, setCompanyCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<'SUPER_ADMIN' | 'TENANT' | ''>('');
  const [activeCompany, setActiveCompany] = useState('');

  // Sample client companies list for Developer Console
  const [companies, setCompanies] = useState([
    { id: '1', name: 'RS Traders', code: '1063', status: 'Active' },
    { id: '2', name: 'ABC Enterprises', code: '1020', status: 'Active' },
  ]);

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
      setError('Company Code is required for Client Login!');
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

  const handleDeleteCompany = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      setCompanies(companies.filter((c) => c.id !== id));
    }
  };

  // Login View
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            Cheque Management Portal
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
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-medium"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Super Admin / Developer Console View
  if (role === 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-gray-800 text-white p-4 flex justify-between items-center shadow">
          <h1 className="font-bold text-xl">Developer Master Console</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded transition text-sm"
          >
            Logout
          </button>
        </nav>

        <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Manage Client Companies
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-3 text-sm font-semibold">Company Name</th>
                  <th className="p-3 text-sm font-semibold">Company Code</th>
                  <th className="p-3 text-sm font-semibold">Status</th>
                  <th className="p-3 text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{company.name}</td>
                    <td className="p-3 text-gray-600">{company.code}</td>
                    <td className="p-3">
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium">
                        {company.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() =>
                          handleDeleteCompany(company.id, company.name)
                        }
                        className="bg-red-600 text-white text-xs px-3 py-1.5 rounded hover:bg-red-700 transition"
                      >
                        Delete Company
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Tenant / Client View
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow">
        <h1 className="font-bold text-xl">Client Dashboard ({activeCompany})</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded transition text-sm"
        >
          Logout
        </button>
      </nav>

      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Welcome to Cheque Management Portal
        </h2>
        <p className="text-gray-600">Company Code: {activeCompany}</p>
      </div>
    </div>
  );
}
