import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase'; // Supabase connection

export default function App() {
  const [companyCode, setCompanyCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(localStorage.getItem('user_role'));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. SUPER ADMIN / DEVELOPER BYPASS LOGIN
      if (username.trim() === 'Kuber' && password === 'Kuber@1122') {
        localStorage.setItem('user_role', 'SUPER_ADMIN');
        setUserRole('SUPER_ADMIN');
        setLoading(false);
        return;
      }

      // 2. CLIENT / TENANT LOGIN VALIDATION
      if (!companyCode.trim()) {
        setError('कृपया Company Code राख्नुहोस्।');
        setLoading(false);
        return;
      }

      // Supabase Auth Login Attempt
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: username.trim(),
        password: password,
      });

      if (authError) {
        // Direct Database Profile Check fallback if Auth fails
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', username.trim())
          .maybeSingle();

        if (profileError || !profileData) {
          throw new Error('Company Code, Username वा Password मिलेन।');
        }
      }

      // Successful Client Login
      localStorage.setItem('user_role', 'TENANT');
      localStorage.setItem('tenant_code', companyCode);
      setUserRole('TENANT');

    } catch (err: any) {
      setError(err.message || 'लगइन गर्न सकिएन। विवरण पुन: जाँच गर्नुहोस्।');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUserRole(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        {!userRole ? (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl shadow-lg shadow-indigo-200">
                💳
              </div>
              <h2 className="text-2xl font-bold text-center text-slate-900 mb-1">ChequeDesk Secure Login</h2>
              <p className="text-slate-500 text-center text-xs mb-6">Enter details to open your workspace</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-4 text-xs font-medium text-center">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Company Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 1063 (Super Admin लाई आवश्यक छैन)"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Username / Email</label>
                  <input
                    type="text"
                    required
                    placeholder="tilochan@gmail.com वा Kuber"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all text-sm mt-2 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : '🔒 Sign In Securely'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  {userRole === 'SUPER_ADMIN' ? 'Developer / Master Console' : `Tenant Workspace (Code: ${companyCode})`}
                </h1>
                <p className="text-xs text-slate-500">Logged in as: {username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-50 text-red-600 hover:bg-red-100 font-medium px-4 py-2 rounded-lg text-xs transition-colors"
              >
                Logout
              </button>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
              {userRole === 'SUPER_ADMIN' ? (
                <div>
                  <h3 className="text-lg font-bold text-indigo-600 mb-2">Master Admin Control Panel</h3>
                  <p className="text-sm text-slate-600">तपाईं Developer Mode मा लगइन हुनुभएको छ। यहाँबाट सबै Tenant हरू Manage गर्न सकिन्छ।</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-bold text-emerald-600 mb-2">Client Cheque Dashboard</h3>
                  <p className="text-sm text-slate-600">स्वागत छ! यो RS Traders / Client को आफ्नै सुरक्षित Dashboard हो।</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}
