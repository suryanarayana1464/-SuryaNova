/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { 
  TrendingUp, ArrowUpRight, Award, DollarSign, Info, 
  Sparkles, Calendar, Receipt, ChevronRight, Activity
} from 'lucide-react';
import { SalarySlip, Employee } from '../types.js';

interface SalaryHistoryProps {
  slips: SalarySlip[];
  profile: Employee;
}

const MONTH_ORDER: Record<string, number> = {
  'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
  'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
};

export function SalaryHistory({ slips, profile }: SalaryHistoryProps) {
  const [activeMetric, setActiveMetric] = useState<'netSalary' | 'basic' | 'allowances'>('netSalary');

  // Filter slips for the current employee (though slips from EmployeeDashboard are already scoped, double safeguard)
  const currentEmployeeSlips = useMemo(() => {
    return slips.filter(slip => slip.employeeEmail.toLowerCase() === profile.email.toLowerCase());
  }, [slips, profile.email]);

  // Sort slips chronologically
  const sortedSlips = useMemo(() => {
    return [...currentEmployeeSlips].sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      const m1 = MONTH_ORDER[a.month] || 0;
      const m2 = MONTH_ORDER[b.month] || 0;
      return m1 - m2;
    });
  }, [currentEmployeeSlips]);

  // Generate chart data
  const chartData = useMemo(() => {
    return sortedSlips.map(slip => ({
      name: `${slip.month.substring(0, 3)} ${slip.year}`,
      netSalary: slip.netSalary,
      basic: slip.basic,
      allowances: slip.allowances,
      deductions: slip.deductions,
      formattedNet: `₹${slip.netSalary.toLocaleString()}`,
      formattedBasic: `₹${slip.basic.toLocaleString()}`,
      formattedAllowances: `₹${slip.allowances.toLocaleString()}`,
    }));
  }, [sortedSlips]);

  // Computations for metrics
  const metrics = useMemo(() => {
    if (sortedSlips.length === 0) {
      // Fallback if no slips exist yet, use profile active salary
      const basic = profile.salary?.basic || 0;
      const allowances = profile.salary?.allowances || 0;
      const deductions = profile.salary?.deductions || 0;
      const net = basic + allowances - deductions;
      return {
        currentNet: net,
        avgNet: net,
        highestNet: net,
        growthPercentage: 0,
        totalEarnings: net,
        slipsCount: 0
      };
    }

    const currentNet = sortedSlips[sortedSlips.length - 1].netSalary;
    const totalEarnings = sortedSlips.reduce((sum, slip) => sum + slip.netSalary, 0);
    const avgNet = totalEarnings / sortedSlips.length;
    const highestNet = Math.max(...sortedSlips.map(s => s.netSalary));

    // Calculate growth percentage if there's more than 1 slip
    let growthPercentage = 0;
    if (sortedSlips.length > 1) {
      const firstNet = sortedSlips[0].netSalary;
      const lastNet = sortedSlips[sortedSlips.length - 1].netSalary;
      if (firstNet > 0) {
        growthPercentage = ((lastNet - firstNet) / firstNet) * 100;
      }
    } else {
      // If there is only 1 slip, compare with joining base or joining state
      growthPercentage = 0;
    }

    return {
      currentNet,
      avgNet,
      highestNet,
      growthPercentage,
      totalEarnings,
      slipsCount: sortedSlips.length
    };
  }, [sortedSlips, profile]);

  // Handle case where we have 0 or 1 data point to show a message about future trajectory
  const showTrajectoryInfo = sortedSlips.length <= 1;

  // Custom tool tip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-xl text-xs space-y-1.5">
          <p className="font-extrabold text-slate-300 border-b border-slate-800 pb-1 mb-1">{data.name}</p>
          <p className="flex justify-between gap-6">
            <span className="text-slate-400">Net Deposit:</span>
            <strong className="text-indigo-400 font-mono">{data.formattedNet}</strong>
          </p>
          <p className="flex justify-between gap-6">
            <span className="text-slate-400">Basic Base:</span>
            <strong className="text-slate-300 font-mono">{data.formattedBasic}</strong>
          </p>
          <p className="flex justify-between gap-6">
            <span className="text-slate-400">Allowances:</span>
            <strong className="text-emerald-400 font-mono">{data.formattedAllowances}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. TOP METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latest Net Salary</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1 font-mono">
              ₹{metrics.currentNet.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Basic + Allowances - Deductions</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl shrink-0">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Net Payout</p>
            <h3 className="text-xl font-extrabold text-teal-700 mt-1 font-mono">
              ₹{Math.round(metrics.avgNet).toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Mean average across payslips</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peak Payout High</p>
            <h3 className="text-xl font-extrabold text-amber-700 mt-1 font-mono">
              ₹{metrics.highestNet.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Highest single month paycheck</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${metrics.growthPercentage > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historical Growth</p>
            <h3 className={`text-xl font-extrabold mt-1 flex items-center gap-1 font-mono ${metrics.growthPercentage > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
              {metrics.growthPercentage > 0 ? `+${metrics.growthPercentage.toFixed(1)}%` : '0.0%'}
              {metrics.growthPercentage > 0 && <ArrowUpRight className="h-4 w-4 stroke-[3]" />}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">From earliest slip to latest</p>
          </div>
        </div>
      </div>

      {/* 2. CHART & DETAILS BLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: The Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-50 gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Salary Trajectory & Growth Over Time</h3>
                <p className="text-[11px] text-slate-400">Interactive visualization mapping progression across past billing cycles.</p>
              </div>
              
              {/* Toggle metric buttons */}
              <div className="flex border border-slate-150 rounded-lg p-0.5 bg-slate-50 self-start sm:self-auto shrink-0">
                <button
                  onClick={() => setActiveMetric('netSalary')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                    activeMetric === 'netSalary' 
                      ? 'bg-white text-indigo-600 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Net Pay
                </button>
                <button
                  onClick={() => setActiveMetric('basic')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                    activeMetric === 'basic' 
                      ? 'bg-white text-indigo-600 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Basic
                </button>
                <button
                  onClick={() => setActiveMetric('allowances')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                    activeMetric === 'allowances' 
                      ? 'bg-white text-indigo-600 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Allowances
                </button>
              </div>
            </div>

            {/* Recharts Container */}
            <div className="h-64 w-full pt-2">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 5, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                      axisLine={{ stroke: '#f1f5f9' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                      axisLine={{ stroke: '#f1f5f9' }}
                      tickLine={false}
                      tickFormatter={(val) => `₹${val / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey={activeMetric}
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 5, strokeWidth: 2, fill: '#ffffff', stroke: '#4f46e5' }}
                      activeDot={{ r: 7, strokeWidth: 0, fill: '#4f46e5' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-400 font-medium">No trajectory data points available</p>
                </div>
              )}
            </div>
          </div>

          {showTrajectoryInfo && (
            <div className="mt-4 p-3 bg-amber-50/60 rounded-xl border border-amber-100/50 flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Trajectory Growth Curve Note</p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Only {metrics.slipsCount} payslip{metrics.slipsCount !== 1 ? 's are' : ' is'} issued. Trajectory trends require multiple chronological bills to calculate rolling progressions. As future monthly paychecks are approved by HR, your growth line will adapt in real-time.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Current Structures */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="pb-4 border-b border-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Contractual Salary Base</h3>
              <p className="text-[11px] text-slate-400">Current active contractual parameters in human resources file.</p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Basic Monthly Base</span>
                <span className="text-xs font-extrabold text-slate-800 font-mono">₹{profile.salary?.basic?.toLocaleString() ?? 0}</span>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Allowances & Travel</span>
                <span className="text-xs font-extrabold text-emerald-600 font-mono">+₹{profile.salary?.allowances?.toLocaleString() ?? 0}</span>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Statutory Deductions</span>
                <span className="text-xs font-extrabold text-rose-600 font-mono">-₹{profile.salary?.deductions?.toLocaleString() ?? 0}</span>
              </div>
              <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/50 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900">Total Regular Net Pay</span>
                <span className="text-xs font-black text-indigo-600 font-mono">
                  ₹{((profile.salary?.basic ?? 0) + (profile.salary?.allowances ?? 0) - (profile.salary?.deductions ?? 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Corporate Perks</span>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
              <span>Full Health Coverage Plan active</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 mt-1.5">
              <Calendar className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Performance review cycle: Annual</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. DETAILED LOG INDEX */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Chronological Salary Increments & Ledgers</h3>
            <p className="text-xs text-slate-400">Indexed log of generated direct deposits with percentage metrics.</p>
          </div>
          <Receipt className="h-5 w-5 text-indigo-500" />
        </div>

        <div className="overflow-x-auto">
          {sortedSlips.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No payroll indices currently tracked.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Statement Period</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Gross Sum</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Deductions</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Net Deposit</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Progress/Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedSlips.map((slip, idx) => {
                  // Compute progression relative to preceding slip (or 0 if first)
                  let rateChangeStr = 'Initial Base';
                  let isPositive = false;
                  if (idx > 0) {
                    const prevNet = sortedSlips[idx - 1].netSalary;
                    if (prevNet > 0) {
                      const change = ((slip.netSalary - prevNet) / prevNet) * 100;
                      if (change > 0) {
                        rateChangeStr = `+${change.toFixed(1)}% Increment`;
                        isPositive = true;
                      } else if (change < 0) {
                        rateChangeStr = `${change.toFixed(1)}% Adjustment`;
                      } else {
                        rateChangeStr = 'Unchanged';
                      }
                    }
                  }

                  return (
                    <tr key={slip.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-3.5 text-xs font-bold text-slate-800">
                        {slip.month} {slip.year}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-semibold text-slate-600 font-mono">
                        ₹{(slip.basic + slip.allowances).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-semibold text-rose-500 font-mono">
                        -₹{slip.deductions.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-extrabold text-indigo-600 font-mono">
                        ₹{slip.netSalary.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          rateChangeStr === 'Initial Base' 
                            ? 'bg-slate-100 text-slate-600'
                            : isPositive 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : rateChangeStr === 'Unchanged'
                            ? 'bg-slate-50 text-slate-400'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {rateChangeStr}
                          {isPositive && <ArrowUpRight className="h-3 w-3" />}
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

    </div>
  );
}
