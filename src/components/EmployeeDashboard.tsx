/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, Calendar, FileText, CheckCircle2, ShieldAlert, Play, Square, Clock,
  Briefcase, DollarSign, ListTodo, Send, ArrowUpRight, ArrowDownRight, Printer,
  TrendingUp, FolderLock, ClipboardList, Globe
} from 'lucide-react';
import { api } from '../api.js';
import { Employee, LeaveRequest, SalarySlip, AttendanceRecord } from '../types.js';
import { SalaryHistory } from './SalaryHistory.js';
import { DocumentVault } from './DocumentVault.js';
import { Avatar } from './Avatar.js';
import { NotificationFeed } from './NotificationFeed.js';
import { ProjectTaskManagement } from './ProjectTaskManagement.js';

interface EmployeeDashboardProps {
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
    employeeId?: string;
  };
}

export function EmployeeDashboard({ user }: EmployeeDashboardProps) {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<Employee | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Active sub-view tab
  const [activeTab, setActiveTab] = useState<'profile' | 'leaves' | 'slips' | 'attendance' | 'salary_history' | 'vault' | 'projects'>('profile');

  // Submit leave state
  const [leaveType, setLeaveType] = useState<'casual' | 'medical'>('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Punch status
  const [punchedInToday, setPunchedInToday] = useState<AttendanceRecord | null>(null);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get all profiles first and find the current logged in employee's profile
      const [empList, leaveData, slipData, attData] = await Promise.all([
        api.getEmployees().catch(() => []), // Admin/HR endpoint, fall back or rely on own auth profile
        api.getLeaves(),
        api.getSlips(),
        api.getAttendance()
      ]);

      // If we got profiles, find self. If not, construct a partial profile from what we know
      const myProfile = empList.find((e: Employee) => e.email.toLowerCase() === user.email.toLowerCase());
      if (myProfile) {
        setProfile(myProfile);
      } else {
        // Fallback profile if it's a seed error or endpoint permission (Admin lacks employee profile but has account)
        setProfile({
          id: 'temp',
          email: user.email,
          name: user.name,
          employeeId: user.employeeId || 'N/A',
          department: 'Corporate',
          role: 'Employee',
          joiningDate: '2024-01-01',
          leaveBalance: { casual: 15, medical: 10 },
          salary: { basic: 0, allowances: 0, deductions: 0 }
        });
      }

      setLeaves(leaveData);
      setSlips(slipData);
      setAttendance(attData);

      // Check punch in status for today
      const todayStr = new Date().toLocaleDateString('en-CA');
      const todayRecord = attData.find((a: AttendanceRecord) => a.date === todayStr);
      if (todayRecord) {
        setPunchedInToday(todayRecord);
      } else {
        setPunchedInToday(null);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to sync workspace details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [user.email]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!startDate || !endDate || !leaveReason) {
      setError('Please fill in all leave request inputs.');
      return;
    }

    try {
      await api.submitLeave({
        leaveType,
        startDate,
        endDate,
        reason: leaveReason
      });

      setSuccess('Leave request successfully logged and queued for HR review.');
      setStartDate('');
      setEndDate('');
      setLeaveReason('');
      fetchEmployeeData();
    } catch (err: any) {
      setError(err.message || 'Leave request failed.');
    }
  };

  const handlePunchIn = async () => {
    setError('');
    setSuccess('');
    try {
      const rec = await api.punchIn();
      setPunchedInToday(rec);
      setSuccess('Successfully punched in. Have an excellent productive day!');
      fetchEmployeeData();
    } catch (err: any) {
      setError(err.message || 'Failed to punch in.');
    }
  };

  const handlePunchOut = async () => {
    setError('');
    setSuccess('');
    try {
      const rec = await api.punchOut();
      setPunchedInToday(rec);
      setSuccess('Successfully punched out. Have a pleasant evening!');
      fetchEmployeeData();
    } catch (err: any) {
      setError(err.message || 'Failed to punch out.');
    }
  };

  const printSlip = (slip: SalarySlip) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Salary Slip - ${slip.employeeName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
            th { background-color: #f8fafc; font-weight: 600; }
            .total { font-size: 1.25rem; font-weight: 700; color: #059669; border-top: 2px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>SuryaNova Corporate Group</h2>
            <p><strong>Payslip Statement for ${slip.month} ${slip.year}</strong></p>
          </div>
          <div class="grid">
            <div>
              <p><strong>Employee Name:</strong> ${slip.employeeName}</p>
              <p><strong>Employee ID:</strong> ${slip.employeeId}</p>
              <p><strong>Email Address:</strong> ${slip.employeeEmail}</p>
            </div>
            <div>
              <p><strong>Statement ID:</strong> ${slip.id}</p>
              <p><strong>Issued At:</strong> ${new Date(slip.generatedAt).toLocaleString()}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Monthly Salary</td>
                <td style="text-align: right;">₹${slip.basic.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Variable Corporate Allowances</td>
                <td style="text-align: right;">+₹${slip.allowances.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Statutory Deductions & Taxes</td>
                <td style="text-align: right;">-₹${slip.deductions.toLocaleString()}</td>
              </tr>
              <tr class="total">
                <td>Net Direct Deposit Payout</td>
                <td style="text-align: right;">₹${slip.netSalary.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <p style="margin-top: 50px; font-size: 0.8rem; color: #64748b; text-align: center;">
            This is an electronically generated salary ledger of SuryaNova. No physical signature required.
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div id="employee_dashboard" className="space-y-8 animate-fade-in">
      {/* Page Title & Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          {profile && <Avatar name={profile.name} avatarUrl={profile.avatarUrl} size="md" />}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('my_workspace')}</h1>
            <p className="text-sm text-slate-500">Access your employment particulars, leave applications, pay ledger, and punch stats.</p>
          </div>
        </div>

        {/* Real-time Punch card inside title bar */}
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm shrink-0">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Clock className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none">Attendance Terminal</p>
            <div className="flex items-center gap-3 mt-1.5">
              {!punchedInToday ? (
                <button
                  id="btn_punch_in"
                  onClick={handlePunchIn}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                >
                  <Play className="h-3 w-3 fill-white" />
                  Punch In
                </button>
              ) : !punchedInToday.checkOut ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-emerald-600 font-semibold animate-pulse">Punched In at {punchedInToday.checkIn}</span>
                  <button
                    id="btn_punch_out"
                    onClick={handlePunchOut}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    <Square className="h-3 w-3 fill-white" />
                    Punch Out
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-500 font-semibold">Shift Ended (In: {punchedInToday.checkIn} | Out: {punchedInToday.checkOut})</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div id="emp_error" className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-rose-800 font-semibold">Action Required</p>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div id="emp_success" className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-emerald-800 font-semibold">Completed</p>
            <p className="text-xs text-emerald-700 mt-0.5">{success}</p>
          </div>
        </div>
      )}

      <NotificationFeed />

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-100 gap-1 overflow-x-auto">
        <button
          id="emp_tab_profile"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'profile' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <User className="h-4 w-4" />
          My Profile
        </button>

        <button
          id="emp_tab_leaves"
          onClick={() => setActiveTab('leaves')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'leaves' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Calendar className="h-4 w-4" />
          My Leaves
        </button>

        <button
          id="emp_tab_slips"
          onClick={() => setActiveTab('slips')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'slips' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText className="h-4 w-4" />
          My Payslips
        </button>

        <button
          id="emp_tab_attendance"
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'attendance' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Clock className="h-4 w-4" />
          Attendance Records
        </button>

        <button
          id="emp_tab_salary_history"
          onClick={() => setActiveTab('salary_history')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'salary_history' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Salary History
        </button>

        <button
          id="emp_tab_vault"
          onClick={() => setActiveTab('vault')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'vault' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <FolderLock className="h-4 w-4" />
          Document Vault
        </button>

        <button
          id="emp_tab_projects"
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition shrink-0 ${
            activeTab === 'projects' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Projects
        </button>
      </div>

      {/* Main Grid area */}
      <div className="space-y-6">

        {/* TAB 1: PROFILE CARDS */}
        {activeTab === 'profile' && profile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main profile card */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-6">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-2xl">
                  {profile.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
                  <p className="text-sm text-slate-500 font-medium">{profile.department} Department</p>
                  <p className="text-xs text-indigo-600 font-bold uppercase mt-1">Employee ID: {profile.employeeId}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Corporate Email</span>
                  <span className="text-sm font-bold text-slate-800">{profile.email}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Joining Date</span>
                  <span className="text-sm font-bold text-slate-800">{profile.joiningDate}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Security / Security Claim</span>
                  <span className="inline-flex px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-xs font-bold text-indigo-700 uppercase tracking-wide">
                    {profile.role}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Assigned Department</span>
                  <span className="text-sm font-bold text-slate-800">{profile.department}</span>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('language')}</span>
                <div className="flex gap-2">
                  <button onClick={() => i18n.changeLanguage('en')} className={`px-3 py-1 rounded text-xs font-bold ${i18n.language === 'en' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{t('english')}</button>
                  <button onClick={() => i18n.changeLanguage('te')} className={`px-3 py-1 rounded text-xs font-bold ${i18n.language === 'te' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{t('telugu')}</button>
                </div>
              </div>
            </div>

            {/* Balances card */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 text-sm mb-4">Paid Leave Balances</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                      <span>Casual Leave Allowance</span>
                      <strong className="text-slate-900">{profile.leaveBalance?.casual ?? 0} days remaining</strong>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(100, ((profile.leaveBalance?.casual ?? 0) / 15) * 100)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                      <span>Medical Leave Allowance</span>
                      <strong className="text-slate-900">{profile.leaveBalance?.medical ?? 0} days remaining</strong>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${Math.min(100, ((profile.leaveBalance?.medical ?? 0) / 10) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 text-sm mb-4">Salary Breakdown</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Basic Monthly Base</span>
                    <strong className="text-slate-800">₹{profile.salary?.basic?.toLocaleString() ?? 0}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Allowances & Bonuses</span>
                    <strong className="text-slate-800">+₹{profile.salary?.allowances?.toLocaleString() ?? 0}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Statutory Deductions</span>
                    <strong className="text-slate-800">-₹{profile.salary?.deductions?.toLocaleString() ?? 0}</strong>
                  </div>
                  <div className="flex justify-between pt-2 text-sm font-bold text-emerald-600">
                    <span>Estimated Net Pay</span>
                    <span>₹{((profile.salary?.basic ?? 0) + (profile.salary?.allowances ?? 0) - (profile.salary?.deductions ?? 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY LEAVES */}
        {activeTab === 'leaves' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Apply panel */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Send className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Request Time-Off</h3>
              </div>

              <form onSubmit={handleSubmitLeave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Leave Category</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as 'casual' | 'medical')}
                    className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="casual">Casual Leave</option>
                    <option value="medical">Medical / Sick Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">From Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="block w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">To Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="block w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase">Reason / Justification</label>
                  <textarea
                    required
                    rows={3}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Provide a detailed business justification..."
                    className="block w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <button
                  id="btn_submit_leave_req"
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-xs transition"
                >
                  Submit Leave Request
                </button>
              </form>
            </div>

            {/* Leave History */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Leave Log Archive</h2>
                <p className="text-xs text-slate-400">View status of all submitted leave requests.</p>
              </div>

              <div className="overflow-x-auto">
                {leaves.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">No leaves submitted yet.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Leave Category</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Time Interval</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Reason Given</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaves.map((leave) => (
                        <tr key={leave.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              leave.leaveType === 'casual' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {leave.leaveType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                            {leave.startDate} to {leave.endDate}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={leave.reason}>
                            {leave.reason}
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                                leave.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                leave.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {leave.status}
                              </span>
                              {leave.comments && (
                                <p className="text-[10px] text-slate-400 mt-1 italic">HR Note: "{leave.comments}"</p>
                              )}
                            </div>
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

        {/* TAB 3: MY PAYSLIPS */}
        {activeTab === 'slips' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Personal Payslip Ledger</h2>
              <p className="text-xs text-slate-400">Secure access to all issued salary statements. Print or save copies for tax purposes.</p>
            </div>

            <div className="overflow-x-auto">
              {slips.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No salary slips have been generated for your profile yet.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Period Month / Year</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Basic pay</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Allowances</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Deductions</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Net Paycheck</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {slips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                          {slip.month} {slip.year}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-600">₹{slip.basic.toLocaleString()}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-600">+₹{slip.allowances.toLocaleString()}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-rose-600">-₹{slip.deductions.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-extrabold text-emerald-600">
                          ₹{slip.netSalary.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            id={`btn_print_${slip.id}`}
                            onClick={() => printSlip(slip)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Print statement
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MY ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Personal Punch log Archives</h2>
              <p className="text-xs text-slate-400">View complete daily hours, check-in, check-out and work statuses.</p>
            </div>

            <div className="overflow-x-auto">
              {attendance.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No attendance data exists. Ensure you punch in above!</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Calendar Date</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Clock-In Time</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Clock-Out Time</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Duty Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 text-xs font-bold text-slate-700">{rec.date}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-600 font-mono">{rec.checkIn}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-600 font-mono">
                          {rec.checkOut ? rec.checkOut : <span className="text-amber-500 italic font-sans font-normal">Active...</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SALARY HISTORY */}
        {activeTab === 'salary_history' && profile && (
          <SalaryHistory slips={slips} profile={profile} />
        )}

        {/* TAB 6: DOCUMENT VAULT */}
        {activeTab === 'vault' && (
          <DocumentVault userRole="Employee" />
        )}

        {/* TAB 7: PROJECTS */}
        {activeTab === 'projects' && (
          <ProjectTaskManagement />
        )}

      </div>
    </div>
  );
}
