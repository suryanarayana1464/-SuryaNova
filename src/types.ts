/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Admin' | 'HR' | 'Employee';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  password?: string; // hashed, omitted in responses
}

export interface SalaryStructure {
  basic: number;
  allowances: number;
  deductions: number;
}

export interface LeaveBalance {
  casual: number;
  medical: number;
}

export interface Employee {
  id: string;
  email: string;
  name: string;
  employeeId: string;
  department: string;
  role: UserRole;
  joiningDate: string;
  leaveBalance: LeaveBalance;
  salary: SalaryStructure;
  avatarUrl?: string;
}

export interface LeaveRequest {
  id: string;
  employeeEmail: string;
  employeeName: string;
  leaveType: 'casual' | 'medical';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  comments?: string;
}

export interface SalarySlip {
  id: string;
  employeeEmail: string;
  employeeName: string;
  employeeId: string;
  month: string; // e.g., "July"
  year: number; // e.g., 2026
  basic: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  generatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeEmail: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // HH:MM:SS
  checkOut?: string; // HH:MM:SS
  status: 'Present' | 'Absent' | 'On Leave';
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO 8601 string
  actorEmail: string;
  actorName: string;
  actorRole: UserRole;
  action: string; // e.g. 'Login Success', 'Leave Review', 'Employee Onboarded', 'Employee Profile Edited', 'Employee Removed'
  details: string; // Descriptions of changes or metadata
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  category: 'Policy' | 'Tax' | 'Legal' | 'Other';
  uploadedAt: string;
  uploaderEmail: string;
  url: string; // Placeholder for file URL
}

export interface Notification {
  id: string;
  type: 'leave' | 'salary' | 'system';
  message: string;
  timestamp: string; // ISO 8601 string
  read: boolean;
  link?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'todo' | 'in-progress' | 'completed';
  completionPercentage: number;
  assignedTo: string; // employeeEmail
  performanceReviewLinkId?: string; // Optional link to performance review
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'on-hold';
  tasks: Task[];
}

export type ResourceType = 'employee' | 'room' | 'hardware';

export interface ResourceEvent {
  id: string;
  resourceId: string;
  resourceName: string;
  type: ResourceType;
  title: string;
  startTime: string; // ISO
  endTime: string; // ISO
}

