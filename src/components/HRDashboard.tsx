/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, FileText, CheckCircle2, XCircle, Search, Edit2, Plus, 
  DollarSign, Check, X, Clipboard, ShieldAlert, UserCheck, FileDown, BarChart2, FolderLock
} from 'lucide-react';
import { api } from '../api.js';
import { Employee, LeaveRequest, SalarySlip, AttendanceRecord } from '../types.js';
import { AttendanceTracking } from './AttendanceTracking.js';
import { DocumentVault } from './DocumentVault.js';
import { ResourceCalendar } from './ResourceCalendar.js';
import { Avatar } from './Avatar.js';
import { NotificationFeed } from './NotificationFeed.js';

export function HRDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [activeTab, setActiveTab] = useState<'employees' | 'leaves' | 'slips' | 'attendance' | 'attendance_analytics' | 'vault' | 'calendar'>('employees');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing state
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editBasic, setEditBasic] = useState('');
  const [editAllowances, setEditAllowances] = useState('');
  const [editDeductions, setEditDeductions] = useState('');
  const [editCasual, setEditCasual] = useState('');
  const [editMedical, setEditMedical] = useState('');

  // Slip generation state
  const [slipEmpEmail, setSlipEmpEmail] = useState('');
  const [slipMonth, setSlipMonth] = useState('July');
  const [slipYear, setSlipYear] = useState('2026');

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [empData, leaveData, slipData, attData] = await Promise.all([
        api.getEmployees(),
        api.getLeaves(),
        api.getSlips(),
        api.getAttendance()
      ]);

      setEmployees(empData);
      setLeaves(leaveData);
      setSlips(slipData);
      setAttendance(attData);
    } catch (err: any) {
      setError(err.message || 'Failed to sync with central servers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditClick = (emp: Employee) => {
    setEditingEmp(emp);
    setEditName(emp.name);
    setEditDept(emp.department);
    setEditBasic(emp.salary.basic.toString());
    setEditAllowances(emp.salary.allowances.toString());
    setEditDeductions(emp.salary.deductions.toString());
    setEditCasual(emp.leaveBalance.casual.toString());
    setEditMedical(emp.leaveBalance.medical.toString());
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;

    setError('');
    setSuccess('');
    try {
      const updatePayload = {
        name: editName,
        department: editDept,
        salary: {
          basic: Number(editBasic) || 0,
          allowances: Number(editAllowances) || 0,
          deductions: Number(editDeductions) || 0,
        },
        leaveBalance: {
          casual: Number(editCasual) || 0,
          medical: Number(editMedical) || 0,
        }
      };

      await api.updateEmployee(editingEmp.id, updatePayload);
      setSuccess(`Updated details for employee "${editName}" successfully.`);
      setEditingEmp(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update employee details.');
    }
  };

  const handleReviewLeave = async (leaveId: string, status: 'approved' | 'rejected', commentText: string = '') => {
    setError('');
    setSuccess('');
    try {
      await api.reviewLeave(leaveId, { status, comments: commentText });
      setSuccess(`Leave request successfully ${status}.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to process leave request review.');
    }
  };

  const handleGenerateSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slipEmpEmail) {
      setError('Please select an employee first.');
      return;
    }

    setError('');
    setSuccess('');
    try {
      const targetEmp = employees.find(e => e.email === slipEmpEmail);
      await api.generateSlip({
        employeeEmail: slipEmpEmail,
        month: slipMonth,
        year: Number(slipYear),
      });
      setSuccess(`Salary slip generated for ${targetEmp?.name} for ${slipMonth} ${slipYear}.`);
      // Reset
      setSlipEmpEmail('');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate salary slip.');
    }
  };

  const downloadEmployeeListCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Department', 'Basic Salary (₹)', 'Allowances (₹)', 'Deductions (₹)', 'Net Salary (₹)', 'Joining Date'];
    const rows = filteredEmployees.map(emp => [
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
    link.setAttribute('download', `employees_roster_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadEmployeeListPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const rowsHtml = filteredEmployees.map(emp => {
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
          <title>Employee Directory - SuryaNova</title>
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
              <p><strong>Total Employees:</strong> ${filteredEmployees.length}</p>
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

  const downloadSlipsCSV = () => {
    const headers = ['Slip ID', 'Employee Name', 'Employee ID', 'Month', 'Year', 'Basic (₹)', 'Allowances (₹)', 'Deductions (₹)', 'Net Salary (₹)', 'Generated At'];
    const rows = slips.map(slip => [
      slip.id,
      slip.employeeName,
      slip.employeeId,
      slip.month,
      slip.year,
      slip.basic,
      slip.allowances,
      slip.deductions,
      slip.netSalary,
      slip.generatedAt
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `salary_slips_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSlipsPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = slips.map(slip => {
      return `
        <tr>
          <td>${slip.id}</td>
          <td><strong>${slip.employeeName}</strong><br/><small style="color: #64748b">${slip.employeeId}</small></td>
          <td>${slip.month} ${slip.year}</td>
          <td style="text-align: right;">₹${slip.basic.toLocaleString()}</td>
          <td style="text-align: right;">+₹${slip.allowances.toLocaleString()}</td>
          <td style="text-align: right; color: #dc2626;">-₹${slip.deductions.toLocaleString()}</td>
          <td style="text-align: right; font-weight: bold; color: #059669;">₹${slip.netSalary.toLocaleString()}</td>
          <td>${new Date(slip.generatedAt).toLocaleDateString()}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Corporate Salary Slip Ledger - SuryaNova</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .header h2 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #0f172a; }
            .header p { margin: 5px 0 0 0; font-size: 0.875rem; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.85rem; }
            th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 0.75rem; tracking-spacing: 0.05em; }
            .footer { margin-top: 50px; font-size: 0.75rem; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>SuryaNova Corporate Group</h2>
              <p>Corporate Salary Slip Ledger</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Total Slips:</strong> ${slips.length}</p>
              <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Slip ID</th>
                <th>Employee Details</th>
                <th>Pay Period</th>
                <th style="text-align: right;">Basic</th>
                <th style="text-align: right;">Allowances</th>
                <th style="text-align: right;">Deductions</th>
                <th style="text-align: right;">Net Salary</th>
                <th>Issued On</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            This is an official Payroll Ledger report of SuryaNova Corporate Group. Confidential.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Filter lists based on search and ensure we only display actual Employee role members
  const filteredEmployees = employees.filter(e => 
    e.role === 'Employee' && (
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.department.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div id="hr_dashboard" className="space-y-8 animate-fade-in">
      {/* Title & Stats Summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">HR Operations Console</h1>
          <p className="text-sm text-slate-500">Edit profiles, manage leaves, generate salary slips, and monitor attendance.</p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div id="hr_error" className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-rose-800 font-semibold">Error Occurred</p>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div id="hr_success" className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-emerald-800 font-semibold">HR Action Success</p>
            <p className="text-xs text-emerald-700 mt-0.5">{success}</p>
          </div>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-100 gap-1 overflow-x-auto">
        <button
          id="hr_tab_employees"
          onClick={() => { setActiveTab('employees'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'employees' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          Employees ({employees.filter(e => e.role === 'Employee').length})
        </button>

        <button
          id="hr_tab_leaves"
          onClick={() => { setActiveTab('leaves'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'leaves' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Leaves ({leaves.filter(l => l.status === 'pending').length} Pending)
        </button>

        <button
          id="hr_tab_slips"
          onClick={() => { setActiveTab('slips'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'slips' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          Salary Slips
        </button>

        <button
          id="hr_tab_attendance"
          onClick={() => { setActiveTab('attendance'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'attendance' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
          }`}
        >
          <Clipboard className="h-4 w-4" />
          Attendance Logs
        </button>

        <button
          id="hr_tab_attendance_analytics"
          onClick={() => { setActiveTab('attendance_analytics'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'attendance_analytics' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
          }`}
        >
          <BarChart2 className="h-4 w-4" />
          Attendance Analytics
        </button>

        <button
          id="hr_tab_vault"
          onClick={() => { setActiveTab('vault'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'vault' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
          }`}
        >
          <FolderLock className="h-4 w-4" />
          Document Vault
        </button>

        <button
          id="hr_tab_calendar"
          onClick={() => { setActiveTab('calendar'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'calendar' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Resource Calendar
        </button>
      </div>

      {/* Grid Content */}
      <div className="space-y-8">
        <NotificationFeed />

        {/* 1. EMPLOYEES TAB */}
        {activeTab === 'employees' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Employee List */}
            <div className={`${editingEmp ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden`}>
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Manage Employee Records</h2>
                  <p className="text-xs text-slate-400">Search and edit workforce information, balances, and salaries.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, ID, dept..."
                      className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id="btn_export_employees_csv"
                      onClick={downloadEmployeeListCSV}
                      disabled={filteredEmployees.length === 0}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      title="Export to CSV"
                    >
                      <FileDown className="h-3.5 w-3.5 text-slate-500" />
                      CSV
                    </button>
                    <button
                      id="btn_export_employees_pdf"
                      onClick={downloadEmployeeListPDF}
                      disabled={filteredEmployees.length === 0}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      title="Export to PDF"
                    >
                      <FileText className="h-3.5 w-3.5 text-slate-500" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-12 text-center text-slate-400">Loading data...</div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">No matching employee records.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Employee</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Department</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Leave Balances</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Salary Structure</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={emp.name} avatarUrl={emp.avatarUrl} size="sm" />
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{emp.name}</p>
                                <p className="text-xs text-slate-400">{emp.email}</p>
                                <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase">ID: {emp.employeeId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-semibold">{emp.department}</td>
                          <td className="px-6 py-4 text-xs">
                            <span className="block text-slate-600">Casual: <strong className="text-slate-800">{emp.leaveBalance?.casual ?? 0} days</strong></span>
                            <span className="block text-slate-600">Medical: <strong className="text-slate-800">{emp.leaveBalance?.medical ?? 0} days</strong></span>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <span className="block text-slate-600">Basic: <strong className="text-slate-800">₹{emp.salary?.basic ?? 0}</strong></span>
                            <span className="block text-slate-600">Allow: <strong className="text-slate-800">₹{emp.salary?.allowances ?? 0}</strong></span>
                            <span className="block text-slate-600">Deduct: <strong className="text-slate-800">₹{emp.salary?.deductions ?? 0}</strong></span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              id={`btn_edit_${emp.id}`}
                              onClick={() => handleEditClick(emp)}
                              className="inline-flex items-center justify-center h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Employee Information"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Editing Form panel */}
            {editingEmp && (
              <div id="hr_edit_panel" className="lg:col-span-1 bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-100/30 h-fit space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-base">Edit Employee Profile</h3>
                  <button onClick={() => setEditingEmp(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateEmployee} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="block w-full mt-1 px-3.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Department</label>
                    <input
                      type="text"
                      required
                      value={editDept}
                      onChange={(e) => setEditDept(e.target.value)}
                      className="block w-full mt-1 px-3.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <span className="block text-xs font-bold text-slate-700 uppercase mb-2">Leave Balances (Days Available)</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase">Casual</label>
                        <input
                          type="number"
                          required
                          value={editCasual}
                          onChange={(e) => setEditCasual(e.target.value)}
                          className="block w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase">Medical</label>
                        <input
                          type="number"
                          required
                          value={editMedical}
                          onChange={(e) => setEditMedical(e.target.value)}
                          className="block w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <span className="block text-xs font-bold text-slate-700 uppercase mb-2">Salary Structure (₹/mo)</span>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase">Basic Pay</label>
                        <input
                          type="number"
                          required
                          value={editBasic}
                          onChange={(e) => setEditBasic(e.target.value)}
                          className="block w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase">Allowances</label>
                          <input
                            type="number"
                            required
                            value={editAllowances}
                            onChange={(e) => setEditAllowances(e.target.value)}
                            className="block w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase">Deductions</label>
                          <input
                            type="number"
                            required
                            value={editDeductions}
                            onChange={(e) => setEditDeductions(e.target.value)}
                            className="block w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      id="btn_save_employee"
                      type="submit"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-lg transition"
                    >
                      Save Updates
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingEmp(null)}
                      className="px-4 border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* 2. LEAVES TAB */}
        {activeTab === 'leaves' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Leave Requests Pipeline</h2>
              <p className="text-xs text-slate-400">Review employee leave requests. Approving a request will automatically deduct from their balances.</p>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-400">Loading leave requests...</div>
              ) : leaves.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No leave requests logged in the system.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Employee Details</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Leave Category</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Duration Requested</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Reason</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Status</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaves.map((leave) => {
                      const start = new Date(leave.startDate);
                      const end = new Date(leave.endDate);
                      const diffTime = end.getTime() - start.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24)) + 1;

                      return (
                        <tr key={leave.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{leave.employeeName}</p>
                              <p className="text-xs text-slate-400">{leave.employeeEmail}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                              leave.leaveType === 'casual' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {leave.leaveType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                            <div>{leave.startDate} to {leave.endDate}</div>
                            <strong className="text-slate-800">({diffDays} days)</strong>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={leave.reason}>
                            {leave.reason}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                              leave.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              leave.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {leave.status}
                            </span>
                            {leave.comments && (
                              <p className="text-[10px] text-slate-400 mt-1 italic">HR: "{leave.comments}"</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {leave.status === 'pending' ? (
                              <div className="flex flex-col items-end gap-2">
                                <input
                                  type="text"
                                  placeholder="Add review feedback / comments..."
                                  value={reviewComments[leave.id] || ''}
                                  onChange={(e) => setReviewComments({
                                    ...reviewComments,
                                    [leave.id]: e.target.value
                                  })}
                                  className="block w-52 px-2 py-1 border border-slate-200 rounded text-[10px] text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    id={`btn_approve_${leave.id}`}
                                    onClick={() => handleReviewLeave(leave.id, 'approved', reviewComments[leave.id] || 'Approved by HR Team')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    Approve
                                  </button>
                                  <button
                                    id={`btn_reject_${leave.id}`}
                                    onClick={() => handleReviewLeave(leave.id, 'rejected', reviewComments[leave.id] || 'Rejected due to business constraints')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/50 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    Reject
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Processed</span>
                            )}
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

        {/* 3. SALARY SLIPS TAB */}
        {activeTab === 'slips' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Generator Panel */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Generate Monthly Salary Slip</h3>
              </div>

              <form onSubmit={handleGenerateSlip} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Select Staff Member</label>
                  <select
                    required
                    value={slipEmpEmail}
                    onChange={(e) => setSlipEmpEmail(e.target.value)}
                    className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- Choose employee --</option>
                    {employees.filter(e => e.role === 'Employee').map(e => (
                      <option key={e.id} value={e.email}>{e.name} ({e.employeeId})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Month</label>
                    <select
                      value={slipMonth}
                      onChange={(e) => setSlipMonth(e.target.value)}
                      className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none"
                    >
                      {months.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Year</label>
                    <input
                      type="number"
                      required
                      value={slipYear}
                      onChange={(e) => setSlipYear(e.target.value)}
                      className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <button
                  id="btn_submit_slip"
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition"
                >
                  Calculate & Generate Slip
                </button>
              </form>
            </div>

            {/* Right: Issued Slips History */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Salary Statement Registry</h2>
                  <p className="text-xs text-slate-400">Review generated historical salary slips and statements.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="btn_export_slips_csv"
                    onClick={downloadSlipsCSV}
                    disabled={slips.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                    title="Export Slips to CSV"
                  >
                    <FileDown className="h-3.5 w-3.5 text-slate-500" />
                    CSV
                  </button>
                  <button
                    id="btn_export_slips_pdf"
                    onClick={downloadSlipsPDF}
                    disabled={slips.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                    title="Export Slips to PDF"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-12 text-center text-slate-400">Loading registry...</div>
                ) : slips.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">No salary slips have been generated yet.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Staff Profile</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Pay Period</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Earnings Details</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Net Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {slips.map((slip) => (
                        <tr key={slip.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{slip.employeeName}</p>
                              <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider">
                                {slip.employeeId}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                            {slip.month} {slip.year}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            <div>Basic: ₹{slip.basic}</div>
                            <div>Allowances: +₹{slip.allowances} | Deductions: -₹{slip.deductions}</div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">
                            ₹{slip.netSalary.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Attendance Log Database</h2>
              <p className="text-xs text-slate-400">Observe real-time company punch logs, checkout times, and daily statuses.</p>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-400">Syncing daily rosters...</div>
              ) : attendance.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No attendance data logged.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Employee Profile</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Calendar Date</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Punch-In Time</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Punch-Out Time</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Duty Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendance.map((rec) => {
                      const empDetails = employees.find(e => e.email.toLowerCase() === rec.employeeEmail.toLowerCase());
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{empDetails ? empDetails.name : rec.employeeEmail}</p>
                              <p className="text-xs text-slate-400">{rec.employeeEmail}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-600">{rec.date}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 font-mono">{rec.checkIn}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                            {rec.checkOut ? rec.checkOut : <span className="text-amber-500 italic font-sans font-normal">Active Session...</span>}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              rec.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {rec.status}
                            </span>
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

        {/* 5. ATTENDANCE ANALYTICS TAB */}
        {activeTab === 'attendance_analytics' && (
          <AttendanceTracking employees={employees} attendance={attendance} />
        )}

        {/* 6. DOCUMENT VAULT TAB */}
        {activeTab === 'vault' && (
          <DocumentVault userRole="HR" />
        )}

        {/* 7. RESOURCE CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <ResourceCalendar />
        )}

      </div>
    </div>
  );
}
