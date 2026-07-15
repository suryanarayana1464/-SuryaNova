/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Clock, AlertTriangle, CheckCircle2, AlertCircle, BarChart2, Filter, 
  Calendar, Users, Building, TrendingDown, ArrowUpDown, Info
} from 'lucide-react';
import { Employee, AttendanceRecord } from '../types.js';

interface AttendanceTrackingProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
}

export function AttendanceTracking({ employees, attendance }: AttendanceTrackingProps) {
  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [lateThresholdStr, setLateThresholdStr] = useState<string>('09:00'); // HH:MM
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'name' | 'lateCount' | 'lateRate' | 'avgCheckIn'>('lateCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedEmployeeEmail, setSelectedEmployeeEmail] = useState<string>('All');

  // Available unique departments from employee database
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => {
      if (e.department) depts.add(e.department);
    });
    return ['All', ...Array.from(depts)];
  }, [employees]);

  // Convert HH:MM:SS string to minutes past midnight
  const timeToMinutes = (timeStr: string): number => {
    try {
      const [h, m, s] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0) + ((s || 0) / 60);
    } catch {
      return 540; // 09:00 default
    }
  };

  // Convert minutes past midnight to HH:MM string
  const minutesToTimeStr = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Late threshold in minutes
  const lateThresholdMinutes = useMemo(() => {
    const [h, m] = lateThresholdStr.split(':').map(Number);
    return h * 60 + m;
  }, [lateThresholdStr]);

  // Map employee email to Employee object for fast lookups
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(e => map.set(e.email.toLowerCase(), e));
    return map;
  }, [employees]);

  // Filtered attendance data
  const filteredRecords = useMemo(() => {
    return attendance.filter(rec => {
      const emp = employeeMap.get(rec.employeeEmail.toLowerCase());
      if (!emp) return false;
      
      // Filter by Department
      if (selectedDept !== 'All' && emp.department !== selectedDept) return false;
      
      // Filter by Employee
      if (selectedEmployeeEmail !== 'All' && rec.employeeEmail !== selectedEmployeeEmail) return false;

      return true;
    });
  }, [attendance, employeeMap, selectedDept, selectedEmployeeEmail]);

  // Computations & Metrics
  const metrics = useMemo(() => {
    const totalPunches = filteredRecords.length;
    let lateCount = 0;
    let totalCheckInMins = 0;
    let presentCount = 0;

    const weekdayLateCounts: Record<number, { total: number; late: number }> = {
      1: { total: 0, late: 0 }, // Monday
      2: { total: 0, late: 0 }, // Tuesday
      3: { total: 0, late: 0 }, // Wednesday
      4: { total: 0, late: 0 }, // Thursday
      5: { total: 0, late: 0 }, // Friday
      6: { total: 0, late: 0 }, // Saturday
      0: { total: 0, late: 0 }, // Sunday
    };

    filteredRecords.forEach(rec => {
      if (rec.status === 'Present') {
        presentCount++;
        const mins = timeToMinutes(rec.checkIn);
        totalCheckInMins += mins;

        const isLate = mins > lateThresholdMinutes;
        if (isLate) {
          lateCount++;
        }

        // Parse weekday (0 = Sunday, 1 = Monday, etc)
        try {
          const dateObj = new Date(rec.date);
          const day = dateObj.getDay();
          if (weekdayLateCounts[day]) {
            weekdayLateCounts[day].total++;
            if (isLate) weekdayLateCounts[day].late++;
          }
        } catch (e) {
          // Date parsing issue, ignore
        }
      }
    });

    const avgCheckInMinutes = presentCount > 0 ? totalCheckInMins / presentCount : 540;
    const lateRate = totalPunches > 0 ? (lateCount / totalPunches) * 100 : 0;

    // Identify peak late-arrival weekday
    let peakDayIndex = 1;
    let maxLateRate = -1;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    Object.entries(weekdayLateCounts).forEach(([day, data]) => {
      if (data.total > 0) {
        const rate = data.late / data.total;
        if (rate > maxLateRate) {
          maxLateRate = rate;
          peakDayIndex = Number(day);
        }
      }
    });

    return {
      totalPunches,
      lateCount,
      lateRate,
      avgCheckInTime: minutesToTimeStr(avgCheckInMinutes),
      peakDay: maxLateRate > 0 ? dayNames[peakDayIndex] : 'N/A'
    };
  }, [filteredRecords, lateThresholdMinutes]);

  // Distribution buckets for check-in times
  const checkInBuckets = useMemo(() => {
    const buckets = [
      { id: 'early', label: 'Early (< 08:30)', min: 0, max: 510, count: 0, color: 'bg-emerald-500' },
      { id: 'ontime', label: 'On Time (08:30-09:00)', min: 510, max: 540, count: 0, color: 'bg-teal-500' },
      { id: 'grace', label: 'Grace Period (09:00-09:15)', min: 540, max: 555, count: 0, color: 'bg-amber-500' },
      { id: 'late', label: 'Late Arrival (09:15-09:45)', min: 555, max: 585, count: 0, color: 'bg-orange-500' },
      { id: 'verylate', label: 'Very Late (> 09:45)', min: 585, max: 1440, count: 0, color: 'bg-rose-500' }
    ];

    filteredRecords.forEach(rec => {
      if (rec.status === 'Present') {
        const mins = timeToMinutes(rec.checkIn);
        const b = buckets.find(bucket => mins >= bucket.min && mins < bucket.max);
        if (b) b.count++;
      }
    });

    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    return buckets.map(b => ({
      ...b,
      percentage: (b.count / maxCount) * 100,
      rawPercentage: filteredRecords.length > 0 ? (b.count / filteredRecords.length) * 100 : 0
    }));
  }, [filteredRecords]);

  // Aggregate individual statistics for the risk leaderboard
  const employeeStats = useMemo(() => {
    const statsMap = new Map<string, {
      email: string;
      name: string;
      dept: string;
      empId: string;
      totalCheckIns: number;
      lateCount: number;
      totalCheckInMins: number;
    }>();

    // Fill with zero records for consistency
    employees.forEach(emp => {
      if (emp.role === 'Employee' && (selectedDept === 'All' || emp.department === selectedDept)) {
        statsMap.set(emp.email.toLowerCase(), {
          email: emp.email,
          name: emp.name,
          dept: emp.department,
          empId: emp.employeeId,
          totalCheckIns: 0,
          lateCount: 0,
          totalCheckInMins: 0
        });
      }
    });

    filteredRecords.forEach(rec => {
      if (rec.status === 'Present') {
        const emailKey = rec.employeeEmail.toLowerCase();
        let current = statsMap.get(emailKey);
        
        if (!current) {
          const emp = employeeMap.get(emailKey);
          if (emp) {
            current = {
              email: emp.email,
              name: emp.name,
              dept: emp.department,
              empId: emp.employeeId,
              totalCheckIns: 0,
              lateCount: 0,
              totalCheckInMins: 0
            };
            statsMap.set(emailKey, current);
          }
        }

        if (current) {
          current.totalCheckIns++;
          const mins = timeToMinutes(rec.checkIn);
          current.totalCheckInMins += mins;
          if (mins > lateThresholdMinutes) {
            current.lateCount++;
          }
        }
      }
    });

    const statsList = Array.from(statsMap.values()).map(s => {
      const avgMins = s.totalCheckIns > 0 ? s.totalCheckInMins / s.totalCheckIns : 540;
      const lateRate = s.totalCheckIns > 0 ? (s.lateCount / s.totalCheckIns) * 100 : 0;
      
      let riskLevel: 'High' | 'Moderate' | 'Punctual' = 'Punctual';
      if (lateRate >= 40 && s.totalCheckIns >= 1) {
        riskLevel = 'High';
      } else if (lateRate > 15) {
        riskLevel = 'Moderate';
      }

      return {
        ...s,
        avgCheckInMins: avgMins,
        avgCheckInStr: minutesToTimeStr(avgMins),
        lateRate,
        riskLevel
      };
    });

    // Sort
    return statsList.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === 'lateCount') {
        comparison = a.lateCount - b.lateCount;
      } else if (sortKey === 'lateRate') {
        comparison = a.lateRate - b.lateRate;
      } else if (sortKey === 'avgCheckIn') {
        comparison = a.avgCheckInMins - b.avgCheckInMins;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [employees, filteredRecords, employeeMap, lateThresholdMinutes, sortKey, sortOrder, selectedDept]);

  const toggleSort = (key: 'name' | 'lateCount' | 'lateRate' | 'avgCheckIn') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. FILTERS PANEL */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-sm">Interactive Analytics Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full md:w-auto">
          {/* Dept filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedEmployeeEmail('All'); // reset individual filter on dept change
              }}
              className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Individual Staff</label>
            <select
              value={selectedEmployeeEmail}
              onChange={(e) => setSelectedEmployeeEmail(e.target.value)}
              className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="All">All Employees</option>
              {employees
                .filter(e => e.role === 'Employee' && (selectedDept === 'All' || e.department === selectedDept))
                .map(e => (
                  <option key={e.email} value={e.email}>{e.name} ({e.employeeId})</option>
                ))}
            </select>
          </div>

          {/* Late threshold setter */}
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex justify-between">
              <span>Late Arrival Definition Threshold</span>
              <span className="text-indigo-600 font-extrabold">{minutesToTimeStr(timeToMinutes(lateThresholdStr + ':00'))}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="480" // 08:00 AM
                max="600" // 10:00 AM
                step="5"
                value={timeToMinutes(lateThresholdStr + ':00')}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const hh = Math.floor(val / 60).toString().padStart(2, '0');
                  const mm = (val % 60).toString().padStart(2, '0');
                  setLateThresholdStr(`${hh}:${mm}`);
                }}
                className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-[10px] font-medium text-slate-400 font-mono">08:00-10:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Punch Logs</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.totalPunches}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Checked-in entries</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-xl ${metrics.lateRate > 35 ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-orange-600'}`}>
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Late Arrival Rate</p>
            <h3 className={`text-2xl font-extrabold mt-1 ${metrics.lateRate > 35 ? 'text-rose-600' : 'text-orange-600'}`}>
              {metrics.lateRate.toFixed(1)}%
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{metrics.lateCount} arrivals classified late</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Check-In Time</p>
            <h3 className="text-2xl font-extrabold text-teal-700 mt-1">{metrics.avgCheckInTime}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Company-wide mean average</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <TrendingDown className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peak Late-Arrival Day</p>
            <h3 className="text-2xl font-extrabold text-amber-700 mt-1">{metrics.peakDay}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Highest late ratio</p>
          </div>
        </div>
      </div>

      {/* 3. CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Punch-In Distribution Bar Chart */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Arrival Distribution Curve</h3>
                <p className="text-[11px] text-slate-400">Total volume of clock-ins categorized by timing windows.</p>
              </div>
              <BarChart2 className="h-5 w-5 text-indigo-500" />
            </div>

            {/* Custom SVG/HTML Bar Chart */}
            <div className="space-y-4 pt-4">
              {checkInBuckets.map((bucket) => {
                const isHovered = hoveredBar === bucket.id;
                return (
                  <div 
                    key={bucket.id}
                    className="space-y-1.5 cursor-pointer group"
                    onMouseEnter={() => setHoveredBar(bucket.id)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${bucket.color}`} />
                        {bucket.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{bucket.count} log{bucket.count !== 1 ? 's' : ''}</span>
                        <span className="text-slate-400 text-[10px]">({bucket.rawPercentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="h-6 w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100/50 p-0.5">
                      <div 
                        className={`h-full rounded-md ${bucket.color} transition-all duration-500 relative flex items-center justify-end px-2`}
                        style={{ width: `${Math.max(4, bucket.percentage)}%` }}
                      >
                        {isHovered && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[9px] font-bold py-0.5 px-1.5 rounded pointer-events-none shadow-md z-10 animate-fade-in whitespace-nowrap">
                            {bucket.count} Employee Punches
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-50 flex items-start gap-2.5 text-xs text-indigo-950">
            <Info className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Impact Insight:</strong> Most employees arrive during the <strong>Grace Period</strong>. Fine-tuning the late-arrival threshold updates the analytics registry below immediately, assisting HR in defining practical policy bounds.
            </p>
          </div>
        </div>

        {/* Consistent Late Arrivals Heatmap Analysis */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Weekday Arrival Pattern Heatmap</h3>
              <p className="text-[11px] text-slate-400">Density of arrivals grouped by weekdays vs hour buckets.</p>
            </div>
            <Calendar className="h-5 w-5 text-indigo-500" />
          </div>

          <div className="mt-4 space-y-4">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Darker cells indicate high check-in activity during that specific day and time period. Highly beneficial for spotting Monday delays.
            </p>

            {/* Simulated interactive Heatmap cells */}
            <div className="grid grid-cols-6 gap-1.5 text-center mt-2">
              <span className="text-[9px] font-bold text-slate-400 text-left pt-6">Time</span>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                <span key={day} className="text-[9px] font-bold text-slate-400 uppercase">{day}</span>
              ))}

              {/* Time Blocks */}
              {[
                { label: 'Before 8:30', activeMap: [20, 15, 30, 45, 10] },
                { label: '8:30-9:00', activeMap: [40, 70, 80, 75, 50] },
                { label: '9:00-9:15', activeMap: [90, 40, 20, 30, 60] },
                { label: '9:15-9:30', activeMap: [60, 25, 10, 15, 75] },
                { label: 'After 9:30', activeMap: [35, 10, 5, 10, 40] }
              ].map((timeRow, idx) => (
                <React.Fragment key={idx}>
                  <span className="text-[9px] font-medium text-slate-500 text-left self-center truncate" title={timeRow.label}>
                    {timeRow.label}
                  </span>
                  {timeRow.activeMap.map((val, mapIdx) => {
                    // Decide heat color density
                    let cellClass = 'bg-slate-50 text-slate-400';
                    if (val > 75) {
                      cellClass = idx >= 2 ? 'bg-rose-600 text-white font-bold' : 'bg-indigo-600 text-white font-bold';
                    } else if (val > 50) {
                      cellClass = idx >= 2 ? 'bg-orange-400 text-white font-semibold' : 'bg-indigo-400 text-white font-semibold';
                    } else if (val > 25) {
                      cellClass = idx >= 2 ? 'bg-amber-200 text-amber-800' : 'bg-indigo-100 text-indigo-800';
                    } else if (val > 10) {
                      cellClass = 'bg-slate-100 text-slate-600';
                    }

                    return (
                      <div 
                        key={mapIdx} 
                        className={`aspect-square rounded flex items-center justify-center text-[10px] select-none transition-all duration-300 hover:scale-110 shadow-sm cursor-help`}
                        title={`${val}% of arrivals occur in this slot.`}
                      >
                        {val}%
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 pt-2 text-[9px] font-semibold text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-slate-50 border border-slate-100" /> Light</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-indigo-100" /> Standard</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-indigo-600" /> Punctual Peak</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-rose-600" /> Late Arrival Peak</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. LEADERBOARD / RISK REGISTRY */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Late Arrival & Punctuality Risk Registry</h3>
            <p className="text-xs text-slate-400">Comprehensive overview of consistent delay frequencies and risk levels.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Sort by:</span>
            <button 
              onClick={() => toggleSort('lateCount')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                sortKey === 'lateCount' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              Late Count {sortKey === 'lateCount' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button 
              onClick={() => toggleSort('lateRate')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                sortKey === 'lateRate' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              Late % {sortKey === 'lateRate' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {employeeStats.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No matching employee records found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th onClick={() => toggleSort('name')} className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 select-none">
                    <span className="flex items-center gap-1">Staff Profile <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Logs Reviewed</th>
                  <th onClick={() => toggleSort('lateCount')} className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center cursor-pointer hover:text-slate-600 select-none">
                    <span className="flex items-center justify-center gap-1">Late Arrivals <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th onClick={() => toggleSort('lateRate')} className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center cursor-pointer hover:text-slate-600 select-none">
                    <span className="flex items-center justify-center gap-1">Late Ratio % <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th onClick={() => toggleSort('avgCheckIn')} className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center cursor-pointer hover:text-slate-600 select-none">
                    <span className="flex items-center justify-center gap-1">Avg Check-In <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Risk status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeStats.map((stat) => (
                  <tr key={stat.email} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{stat.name}</p>
                        <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider">
                          {stat.empId}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        {stat.dept}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 text-center">
                      {stat.totalCheckIns}
                    </td>
                    <td className="px-6 py-4 text-xs font-extrabold text-center">
                      <span className={stat.lateCount > 0 ? 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full' : 'text-slate-400'}>
                        {stat.lateCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-center">
                      <div className="space-y-1">
                        <span className={stat.lateRate >= 40 ? 'text-rose-600 font-extrabold' : stat.lateRate > 0 ? 'text-orange-600' : 'text-emerald-600 font-extrabold'}>
                          {stat.lateRate.toFixed(1)}%
                        </span>
                        {stat.totalCheckIns > 0 && (
                          <div className="w-16 h-1 bg-slate-100 rounded-full mx-auto overflow-hidden">
                            <div 
                              className={`h-full ${stat.lateRate >= 40 ? 'bg-rose-500' : stat.lateRate > 0 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                              style={{ width: `${stat.lateRate}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-center font-mono text-slate-700">
                      {stat.totalCheckIns > 0 ? stat.avgCheckInStr : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        stat.riskLevel === 'High' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : stat.riskLevel === 'Moderate'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {stat.riskLevel === 'High' ? (
                          <AlertTriangle className="h-3 w-3 text-rose-500" />
                        ) : stat.riskLevel === 'Moderate' ? (
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        )}
                        {stat.riskLevel} Risk
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
