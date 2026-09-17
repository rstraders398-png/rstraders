import React, { useState } from 'react';
import { 
  LayoutDashboard, Calendar, FileText, Clock, CreditCard, 
  CheckCircle, Printer, Building2, Users, Database, ShieldAlert, 
  LogOut, Upload, Search, Filter, Plus, Trash2 
} from 'lucide-react';

export default function App() {
  const [companyCode, setCompanyCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<'SUPER_ADMIN' | 'TENANT' | ''>('');
  const [activeCompany, setActiveCompany] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  // Sample client list for Super Admin Developer Console
  const [companies, setCompanies] = useState([
    { id: '1', name: 'RS Traders', code: '1063', status: 'Active' },
    { id: '2', name: 'ABC Enterprises', code: '1020', status: 'Active' },
  ]);

  // Sample cheques data
  const [cheques, setCheques] = useState([
    { id: '1', chequeNo: 'CHQ-9081', party: 'Khukri Rum Text Page', bank: 'NABIL Bank', amount: 150000, status: 'PENDING', date: '2026-03-20', source: 'SYSTEM' },
    { id: '2', chequeNo: 'CHQ-4412', party: 'Global Traders', bank: 'NIC Asia', amount: 180000, status: 'PARTIAL', date: '2026-03-22', source: 'SYSTEM' },
    { id: '3', chequeNo: 'CHQ-1002', party: 'Himalayan Suppliers', bank: 'Global IME', amount: 75000, status: 'CLEARED', date: '2026-03-15', source: 'IMPORTED_EXTERNAL' },
  ]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Super Admin Bypass
    if (username.trim() === 'Kuber' && password === 'Kuber@1122') {
      setRole('SUPER_ADMIN');
      setIsLoggedIn(true);
      return;
    }

    // Tenant Login
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

  const handleDeleteCompany = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      setCompanies(companies.filter((c) => c.id !== id));
    }
  };

  const handleSimulateImport = () => {
    const importedChq = {
      id: Date.now().toString(),
      chequeNo: `IMP-${Math.floor(1000 + Math.random() * 9000)}`,
      party: 'External Software Party',
      bank: 'Nepal Bank Ltd',
      amount: 100000,
      status: 'PENDING',
      date: '2026-04-01',
      source: 'IMPORTED_EXTERNAL'
    };
    setCheques([...cheques, importedChq]);
    alert('Cheque imported successfully from external software format!');
  };

  // 1. Auth Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 w-full max-w-md text-white">
          <h2 className="text-2xl font-bold text-center mb-6 text-emerald-400">
            ChequeDesk Portal
          </h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Company Code (Optional for Super Admin)
              </label>
              <input
                type="text"
                placeholder="e.g. 1063"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-md focus:border-emerald-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                placeholder="Enter Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-md focus:border-emerald-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-md focus:border-emerald-500 outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-md transition"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Super Admin Developer Console
  if (role === 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <nav className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="text-amber-400" />
            <h1 className="font-bold text-xl">Developer Master Console</h1>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded text-sm transition flex items-center space-x-1"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </nav>

        <div className="max-w-5xl mx-auto mt-8 p-6 bg-slate-800 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold mb-4 text-emerald-400">
            Manage Client Workspaces
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-700 text-slate-400 text-sm">
                  <th className="p-3">Company Name</th>
                  <th className="p-3">Company Code</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="p-3 font-medium">{company.name}</td>
                    <td className="p-3 text-slate-400">{company.code}</td>
                    <td className="p-3">
                      <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/30">
                        {company.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDeleteCompany(company.id, company.name)}
                        className="bg-red-600/80 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded transition flex items-center space-x-1"
                      >
                        <Trash2 size={14} />
                        <span>Delete Workspace</span>
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

  // 3. Full ChequeDesk Tenant Dashboard
  const filteredCheques = cheques.filter(c => 
    c.party.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.chequeNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col justify-between">
        <div>
          <div className="p-4 border-b border-slate-700 flex items-center space-x-2">
            <CreditCard className="text-emerald-400" />
            <span className="font-bold text-lg text-white">ChequeDesk</span>
          </div>

          <nav className="p-3 space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>
              <LayoutDashboard size={18} /> <span>Dashboard</span>
            </button>
            <button onClick={() => setActiveTab('timeline')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition ${activeTab === 'timeline' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>
              <Calendar size={18} /> <span>Due Date Timeline</span>
            </button>
            <button onClick={() => setActiveTab('logs')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition ${activeTab === 'logs' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>
              <FileText size={18} /> <span>Issued Date Log</span>
            </button>
            <button onClick={() => setActiveTab('pending')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition ${activeTab === 'pending' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>
              <Clock size={18} /> <span>Pending Cheques</span>
            </button>
            <button onClick={() => setActiveTab('cleared')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition ${activeTab === 'cleared' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>
              <CheckCircle size={18} /> <span>Cleared Cheques</span>
            </button>
            <button onClick={() => setActiveTab('print')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition ${activeTab === 'print' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>
              <Printer size={18} /> <span>Print Cheque</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-700">
          <div className="mb-3 text-xs text-slate-400">
            Workspace: <span className="text-emerald-400 font-semibold">{activeCompany}</span>
          </div>
          <button onClick={handleLogout} className="w-full bg-red-600/80 hover:bg-red-600 text-white py-2 rounded-lg text-sm transition flex items-center justify-center space-x-2">
            <LogOut size={16} /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Top Header Controls */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Cheque Management Overview</h1>
            <p className="text-slate-400 text-sm">Active Workspace Code: {activeCompany}</p>
          </div>

          <div className="flex items-center space-x-3">
            <button onClick={handleSimulateImport} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-emerald-400 px-4 py-2 rounded-lg text-sm flex items-center space-x-2 transition">
              <Upload size={16} /> <span>Import External Cheques</span>
            </button>
            <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2 transition">
              <Plus size={16} /> <span>Issue Cheque</span>
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400 font-medium">TOTAL CHEQUES</p>
            <p className="text-2xl font-bold text-white mt-1">रु 5,05,000</p>
            <p className="text-xs text-slate-500 mt-1">3 total records</p>
          </div>

          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <p className="text-xs text-amber-400 font-medium">PENDING</p>
            <p className="text-2xl font-bold text-white mt-1">रु 1,50,000</p>
            <p className="text-xs text-amber-500/80 mt-1">1 awaiting payment</p>
          </div>

          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <p className="text-xs text-blue-400 font-medium">PARTIALLY PAID</p>
            <p className="text-2xl font-bold text-white mt-1">रु 1,80,000</p>
            <p className="text-xs text-blue-500/80 mt-1">1 in progress</p>
          </div>

          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <p className="text-xs text-emerald-400 font-medium">CLEARED</p>
            <p className="text-2xl font-bold text-white mt-1">रु 75,000</p>
            <p className="text-xs text-emerald-500/80 mt-1">1 settled cheque</p>
          </div>
        </div>

        {/* Search & Cheques Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search cheques, party, bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="text-xs text-slate-400">
              Showing {filteredCheques.length} entries
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="p-3">CHEQUE #</th>
                  <th className="p-3">PARTY</th>
                  <th className="p-3">BANK</th>
                  <th className="p-3">DUE DATE</th>
                  <th className="p-3">AMOUNT</th>
                  <th className="p-3">STATUS / SOURCE</th>
                </tr>
              </thead>
              <tbody>
                {filteredCheques.map((chq) => (
                  <tr key={chq.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="p-3 font-medium text-emerald-400">{chq.chequeNo}</td>
                    <td className="p-3">{chq.party}</td>
                    <td className="p-3 text-slate-400">{chq.bank}</td>
                    <td className="p-3 text-slate-400">{chq.date}</td>
                    <td className="p-3 font-semibold text-white">रु {chq.amount.toLocaleString()}</td>
                    <td className="p-3 flex items-center space-x-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${
                        chq.status === 'CLEARED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        chq.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                        {chq.status}
                      </span>

                      {chq.source === 'IMPORTED_EXTERNAL' && (
                        <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] px-2 py-0.5 rounded">
                          Imported
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
