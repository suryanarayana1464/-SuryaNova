/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from './api.js';
import { Login } from './components/Login.js';
import { Header } from './components/Header.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { HRDashboard } from './components/HRDashboard.js';
import { EmployeeDashboard } from './components/EmployeeDashboard.js';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<{
    id: string;
    email: string;
    role: string;
    name: string;
    employeeId?: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if user has an active token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('emp_jwt_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const me = await api.getMe();
        setUser(me);
      } catch (err: any) {
        console.error('Session restore failed:', err);
        localStorage.removeItem('emp_jwt_token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-semibold text-sm">Authenticating secure session...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header user={user} onLogout={handleLogout} />

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8">
        {user.role === 'Admin' && <AdminDashboard />}
        {user.role === 'HR' && <HRDashboard />}
        {user.role === 'Employee' && <EmployeeDashboard user={user} />}
      </main>

      <footer className="bg-white border-t border-slate-100 py-6">
        <div className="px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            &copy; 2026 SuryaNova Enterprise. Built with role-based access control.
          </p>
          <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>End-to-end Token Enforcement Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
