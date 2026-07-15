/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogOut, User, Shield, Briefcase } from 'lucide-react';

interface HeaderProps {
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
    employeeId?: string;
  };
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/50">
            <Shield className="h-3 w-3" />
            Admin
          </span>
        );
      case 'HR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
            <Briefcase className="h-3 w-3" />
            HR Manager
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
            <User className="h-3 w-3" />
            Employee
          </span>
        );
    }
  };

  return (
    <header id="dashboard_header" className="bg-white border-b border-slate-100 sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg overflow-hidden bg-black border border-slate-200 flex items-center justify-center shadow-sm">
              <img
                src="/src/assets/images/syn_logo_1784123310954.jpg"
                alt="SYN Logo"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-lg">SuryaNova</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pr-4 border-r border-slate-100">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 leading-tight">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                {getRoleBadge(user.role)}
              </div>
            </div>

            <button
              id="btn_logout"
              onClick={onLogout}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
