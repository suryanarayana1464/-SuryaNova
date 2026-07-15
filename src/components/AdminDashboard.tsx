/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Users, ShieldAlert, CheckCircle2, DollarSign, Calendar, Briefcase, FileText, History, Search, Filter, RefreshCw, FileDown, Clock } from 'lucide-react';
import { api } from '../api.js';
import { Employee, UserRole, AuditLog } from '../types.js';

export function AdminDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<UserRole>('Employee');
  const [joiningDate, setJoiningDate] = useState('');
  const [basic, setBasic] = useState('5000');
  const [allowances, setAllowances] = useState('1500');
  const [deductions, setDeductions] = useState('500');

  // Audit Logs State
  const [activeTab, setActiveTab] = useState<'directory' | 'audit'>('directory');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<'All' | 'Logins' | 'Leaves' | 'Workforce'>('All');

  // Load employee roster
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await api.getEmployees();
      setEmployees(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  const downloadEmployeeListCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Department', 'Basic Salary (₹)', 'Allowances (₹)', 'Deductions (₹)', 'Net Salary (₹)', 'Joining Date'];
    const rows = employees.map(emp => [
      emp.employeeId,
      emp.name,
      emp.email,
      emp.role,
      emp.department,
      emp.salary?.basic || 0,
      emp.salary?.allowances || 0,
      emp.salary?.deductions || 0,
      (emp.salary?.basic || 0) + (emp.salary?.allowances || 0) - (emp.salary?.deductions || 0),
      emp.joiningDate
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `employees_directory_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadEmployeeListPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const rowsHtml = employees.map(emp => {
      const basic = emp.salary?.basic || 0;
      const allowances = emp.salary?.allowances || 0;
      const deductions = emp.salary?.deductions || 0;
      const net = basic + allowances - deductions;
      return `
        <tr>
          <td>${emp.employeeId}</td>
          <td><strong>${emp.name}</strong><br/><small style="color: #64748b">${emp.email}</small></td>
          <td><span class="role-badge ${emp.role.toLowerCase()}">${emp.role}</span></td>
          <td>${emp.department}</td>
          <td style="text-align: right;">₹${basic.toLocaleString()}</td>
          <td style="text-align: right;">₹${allowances.toLocaleString()}</td>
          <td style="text-align: right; color: #dc2626;">-₹${deductions.toLocaleString()}</td>
          <td style="text-align: right; font-weight: bold; color: #059669;">₹${net.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Active Employee Directory - SuryaNova</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .header h2 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #0f172a; }
            .header p { margin: 5px 0 0 0; font-size: 0.875rem; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.85rem; }
            th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 0.75rem; tracking-spacing: 0.05em; }
            .role-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }
            .role-badge.admin { background-color: #fef3c7; color: #92400e; }
            .role-badge.hr { background-color: #e0e7ff; color: #3730a3; }
            .role-badge.employee { background-color: #d1fae5; color: #065f46; }
            .footer { margin-top: 50px; font-size: 0.75rem; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>SuryaNova Corporate Group</h2>
              <p>Active Employee Directory & Security Profiles</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Total Employees:</strong> ${employees.length}</p>
              <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee Details</th>
                <th>Security / Role</th>
                <th>Department</th>
                <th style="text-align: right;">Basic</th>
                <th style="text-align: right;">Allowances</th>
                <th style="text-align: right;">Deductions</th>
                <th style="text-align: right;">Net Pay</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            This is an official HR and Administration report of SuryaNova Corporate Group. Confidential.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Load audit logs
  const fetchAuditLogs = async () => {
    try {
      setLogsLoading(true);
      const data = await api.getAuditLogs();
      setAuditLogs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !password || !employeeId || !department || !role || !joiningDate) {
      setError('Please fill in all employee registration fields.');
      return;
    }

    try {
      const newEmp = {
        name,
        email,
        password,
        employeeId,
        department,
        role,
        joiningDate,
        salary: {
          basic: Number(basic) || 0,
          allowances: Number(allowances) || 0,
          deductions: Number(deductions) || 0,
        }
      };

      await api.createEmployee(newEmp);
      setSuccess(`Employee "${name}" has been successfully registered!`);
      
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setEmployeeId('');
      setDepartment('');
      setRole('Employee');
      setJoiningDate('');
      setBasic('5000');
      setAllowances('1500');
      setDeductions('500');

      fetchEmployees();
    } catch (err: any) {
      setError(err.message || 'Failed to create employee.');
    }
  };

  const handleDeleteEmployee = async (id: string, empName: string) => {
    if (!window.confirm(`Are you absolutely sure you want to remove "${empName}" from the system? This action cannot be undone.`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await api.deleteEmployee(id);
      setSuccess(`Employee "${empName}" has been successfully removed.`);
      fetchEmployees();
    } catch (err: any) {
      setError(err.message || 'Failed to delete employee.');
    }
  };

  // Stats calculation
  const totalEmployees = employees.length;
  const adminCount = employees.filter(e => e.role === 'Admin').length;
  const hrCount = employees.filter(e => e.role === 'HR').length;
  const staffCount = employees.filter(e => e.role === 'Employee').length;

  // Audit Logs Filtering
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      (log.actorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.actorEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (actionFilter === 'All') return matchesSearch;
    if (actionFilter === 'Logins') return matchesSearch && log.action === 'Login Success';
    if (actionFilter === 'Leaves') return matchesSearch && (log.action === 'Leave Approved' || log.action === 'Leave Rejected');
    if (actionFilter === 'Workforce') return matchesSearch && ['Employee Onboarded', 'Employee Profile Edited', 'Employee Removed'].includes(log.action);
    return matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Actor Email', 'Actor Name', 'Actor Role', 'Action', 'Details'];
    const rows = filteredLogs.map(log => [
      log.id,
      new Date(log.timestamp).toISOString(),
      log.actorEmail,
      log.actorName,
      log.actorRole,
      log.action,
      log.details.replace(/"/g, '""'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderLogDetails = (details: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = details.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold underline break-all ml-1 bg-indigo-50/50 hover:bg-indigo-100/50 px-1.5 py-0.5 rounded text-xs transition"
          >
            View Sandbox Email ↗
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div id="admin_dashboard" className="space-y-8 animate-fade-in">
      {/* Page Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Control Center</h1>
          <p className="text-sm text-slate-500">Add, remove, and manage your workforce accounts and RBAC permissions.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            id="tab_directory"
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'directory'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Staff Directory
          </button>
          <button
            id="tab_audit_logs"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'audit'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Audit Logs
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Staff</p>
            <p className="text-xl font-bold text-slate-900 leading-tight">{totalEmployees}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Admins</p>
            <p className="text-xl font-bold text-slate-900 leading-tight">{adminCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">HR Managers</p>
            <p className="text-xl font-bold text-slate-900 leading-tight">{hrCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Employees</p>
            <p className="text-xl font-bold text-slate-900 leading-tight">{staffCount}</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div id="admin_error" className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-rose-800 font-semibold">Action Failed</p>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div id="admin_success" className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-emerald-800 font-semibold">Success</p>
            <p className="text-xs text-emerald-700 mt-0.5">{success}</p>
          </div>
        </div>
      )}

      {activeTab === 'directory' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Onboarding Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Onboard Employee</h2>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  placeholder="Alice Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="block w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                    placeholder="EMP102"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Role / Security Claim</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="block w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white"
                  >
                    <option value="Employee">Employee</option>
                    <option value="HR">HR Manager</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="block w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  placeholder="Engineering, Marketing, HR"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email (Username)</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  placeholder="alice@company.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  placeholder="Securepassword123"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Joining Date</label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="block w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <span className="block text-xs font-bold text-slate-700 uppercase mb-3">Salary Structure (₹)</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Basic</label>
                    <input
                      type="number"
                      required
                      value={basic}
                      onChange={(e) => setBasic(e.target.value)}
                      className="block w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Allowances</label>
                    <input
                      type="number"
                      required
                      value={allowances}
                      onChange={(e) => setAllowances(e.target.value)}
                      className="block w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deductions</label>
                    <input
                      type="number"
                      required
                      value={deductions}
                      onChange={(e) => setDeductions(e.target.value)}
                      className="block w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                id="btn_submit_employee"
                type="submit"
                className="w-full mt-4 flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
              >
                <UserPlus className="h-4 w-4" />
                Onboard Employee
              </button>
            </form>
          </div>

          {/* Employee Roster List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Active Employee Roster</h2>
                <p className="text-xs text-slate-400">List of all active corporate profiles and RBAC profiles</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn_export_csv"
                  onClick={downloadEmployeeListCSV}
                  disabled={employees.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                  title="Export to CSV"
                >
                  <FileDown className="h-3.5 w-3.5 text-slate-500" />
                  CSV
                </button>
                <button
                  id="btn_export_pdf"
                  onClick={downloadEmployeeListPDF}
                  disabled={employees.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                  title="Export to PDF"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  PDF
                </button>
                <div className="h-4 w-px bg-slate-200 mx-1"></div>
                <button
                  id="btn_refresh_roster"
                  onClick={fetchEmployees}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-400">Loading roster profiles...</div>
              ) : employees.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No employees registered yet.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee Details</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Security / Role</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salary Structure</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((emp) => {
                      const totalSal = (emp.salary?.basic || 0) + (emp.salary?.allowances || 0) - (emp.salary?.deductions || 0);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{emp.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{emp.email}</p>
                              <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold tracking-wider">
                                ID: {emp.employeeId}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                              emp.role === 'Admin' ? 'bg-amber-100 text-amber-800' :
                              emp.role === 'HR' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {emp.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-medium">{emp.department}</td>
                          <td className="px-6 py-4">
                            <div className="text-xs">
                              <p className="font-semibold text-slate-800">₹{totalSal.toLocaleString()}/mo</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Basic: ₹{emp.salary?.basic || 0} | Allow: ₹{emp.salary?.allowances || 0}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              id={`btn_delete_${emp.id}`}
                              onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                              className="inline-flex items-center justify-center h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                              title="Remove Employee"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          {/* Audit Controls & Filter Header */}
          <div className="p-6 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">System Audit Trail</h2>
                <p className="text-xs text-slate-400">Verifiable chronological logging of administrative, authentication, and leave actions</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn_export_csv"
                  onClick={handleExportCSV}
                  disabled={filteredLogs.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition shadow-sm cursor-pointer"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Export CSV
                </button>
                <button
                  id="btn_refresh_audit"
                  onClick={fetchAuditLogs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white rounded-lg transition shadow-sm cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                  Refresh Logs
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search logs by actor, role, description or action..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Filter pills */}
              <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100 self-start md:self-auto overflow-x-auto shrink-0 gap-1">
                {(['All', 'Logins', 'Leaves', 'Workforce'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActionFilter(filter)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition cursor-pointer ${
                      actionFilter === filter
                        ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {filter === 'All' ? 'All Events' :
                     filter === 'Logins' ? 'Logins' :
                     filter === 'Leaves' ? 'Leave Reviews' :
                     'Staff Changes'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            {logsLoading ? (
              <div className="p-16 text-center text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-500 mb-2" />
                Retrieving verifiable operational logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <Clock className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600 text-sm">No matching audit logs found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search terms.</p>
                {(searchTerm || actionFilter !== 'All') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setActionFilter('All');
                    }}
                    className="mt-4 px-4 py-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold border border-indigo-200 rounded-lg cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-[18%]">Timestamp</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-[22%]">User / Actor</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-[12%]">Role</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-[18%]">Action / Event</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-[30%]">Operational Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLogs.map((log) => {
                    // Badge styles depending on action
                    const getBadgeClass = (action: string) => {
                      switch (action) {
                        case 'Login Success':
                          return 'bg-sky-50 text-sky-700 border-sky-100';
                        case 'Leave Approved':
                          return 'bg-emerald-50 text-emerald-700 border-emerald-100';
                        case 'Leave Rejected':
                          return 'bg-rose-50 text-rose-700 border-rose-100';
                        case 'Employee Onboarded':
                          return 'bg-purple-50 text-purple-700 border-purple-100';
                        case 'Employee Profile Edited':
                          return 'bg-amber-50 text-amber-700 border-amber-100';
                        case 'Employee Removed':
                          return 'bg-slate-100 text-slate-700 border-slate-200';
                        default:
                          return 'bg-slate-50 text-slate-600 border-slate-100';
                      }
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/30 transition">
                        <td className="px-6 py-4 text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">{log.actorName}</p>
                            <p className="text-[10px] text-slate-400">{log.actorEmail}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                            log.actorRole === 'Admin' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            log.actorRole === 'HR' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {log.actorRole}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeClass(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium leading-relaxed">
                          {renderLogDetails(log.details)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
