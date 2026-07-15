/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Employee, LeaveRequest, SalarySlip, AttendanceRecord } from './types.js';

const DATA_DIR = path.join(process.cwd(), 'data');

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
  }
}

export async function readCollection<T>(collectionName: string): Promise<T[]> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T[];
  } catch (error) {
    return [];
  }
}

export async function writeCollection<T>(collectionName: string, data: T[]): Promise<void> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function seedDatabase() {
  await ensureDir();

  const users = await readCollection<User>('users');
  const employees = await readCollection<Employee>('employees');

  if (users.length === 0) {
    console.log('Seeding initial data...');
    const salt = bcrypt.genSaltSync(10);

    // 1. Seed Users
    const seededUsers: User[] = [
      {
        id: 'user_admin',
        email: 'suryanarayana@sny.com',
        role: 'Admin',
        password: bcrypt.hashSync('admin123', salt),
      },
      {
        id: 'user_hr',
        email: 'vchandana@sny.com',
        role: 'HR',
        password: bcrypt.hashSync('hr123', salt),
      },
      {
        id: 'user_emp1',
        email: 'surya@sny.com',
        role: 'Employee',
        password: bcrypt.hashSync('emp123', salt),
      },
      {
        id: 'user_emp2',
        email: 'dindu@sny.com',
        role: 'Employee',
        password: bcrypt.hashSync('emp123', salt),
      },
    ];
    await writeCollection('users', seededUsers);

    // 2. Seed Employees
    const seededEmployees: Employee[] = [
      {
        id: 'emp_admin',
        email: 'suryanarayana@sny.com',
        name: 'suryanarayana',
        employeeId: 'EMP000',
        department: 'Operations',
        role: 'Admin',
        joiningDate: '2024-01-15',
        leaveBalance: { casual: 15, medical: 10 },
        salary: { basic: 160000, allowances: 50000, deductions: 10000 },
      },
      {
        id: 'emp_hr',
        email: 'vchandana@sny.com',
        name: 'V.Chandana',
        employeeId: 'EMP001',
        department: 'Human Resources',
        role: 'HR',
        joiningDate: '2024-03-01',
        leaveBalance: { casual: 15, medical: 10 },
        salary: { basic: 120000, allowances: 36000, deductions: 6000 },
      },
      {
        id: 'emp_emp1',
        email: 'surya@sny.com',
        name: 'Surya',
        employeeId: 'EMP002',
        department: 'Engineering',
        role: 'Employee',
        joiningDate: '2025-06-15',
        leaveBalance: { casual: 12, medical: 9 },
        salary: { basic: 80000, allowances: 24000, deductions: 4000 },
      },
      {
        id: 'emp_emp2',
        email: 'dindu@sny.com',
        name: 'Dindu',
        employeeId: 'EMP003',
        department: 'Marketing',
        role: 'Employee',
        joiningDate: '2025-09-01',
        leaveBalance: { casual: 14, medical: 10 },
        salary: { basic: 64000, allowances: 20000, deductions: 4000 },
      },
    ];
    await writeCollection('employees', seededEmployees);

    // 3. Seed some initial leave requests
    const seededLeaves: LeaveRequest[] = [
      {
        id: 'leave_1',
        employeeEmail: 'surya@sny.com',
        employeeName: 'Surya',
        leaveType: 'casual',
        startDate: '2026-08-10',
        endDate: '2026-08-12',
        reason: 'Family event',
        status: 'pending',
        createdAt: '2026-07-10T10:00:00Z',
      },
      {
        id: 'leave_2',
        employeeEmail: 'dindu@sny.com',
        employeeName: 'Dindu',
        leaveType: 'medical',
        startDate: '2026-07-20',
        endDate: '2026-07-21',
        reason: 'Dental checkup',
        status: 'approved',
        createdAt: '2026-07-12T09:30:00Z',
      },
    ];
    await writeCollection('leaves', seededLeaves);

    // 4. Seed some initial salary slips
    const seededSalarySlips: SalarySlip[] = [
      {
        id: 'slip_1',
        employeeEmail: 'surya@sny.com',
        employeeName: 'Surya',
        employeeId: 'EMP002',
        month: 'June',
        year: 2026,
        basic: 80000,
        allowances: 24000,
        deductions: 4000,
        netSalary: 100000,
        generatedAt: '2026-06-30T18:00:00Z',
      },
    ];
    await writeCollection('slips', seededSalarySlips);

    // 5. Seed some attendance records
    const seededAttendance: AttendanceRecord[] = [
      {
        id: 'att_1',
        employeeEmail: 'surya@sny.com',
        date: '2026-07-13',
        checkIn: '09:05:12',
        checkOut: '18:02:45',
        status: 'Present',
      },
      {
        id: 'att_2',
        employeeEmail: 'dindu@sny.com',
        date: '2026-07-13',
        checkIn: '08:55:00',
        checkOut: '17:30:15',
        status: 'Present',
      },
    ];
    await writeCollection('attendance', seededAttendance);

    // 6. Seed some initial audit logs
    const seededAuditLogs = [
      {
        id: 'log_seed1',
        timestamp: '2026-07-13T09:00:00.000Z',
        actorEmail: 'suryanarayana@sny.com',
        actorName: 'suryanarayana',
        actorRole: 'Admin',
        action: 'Login Success',
        details: 'User suryanarayana successfully logged into the system.',
      },
      {
        id: 'log_seed2',
        timestamp: '2026-07-13T10:30:15.000Z',
        actorEmail: 'vchandana@sny.com',
        actorName: 'V.Chandana',
        actorRole: 'HR',
        action: 'Leave Approved',
        details: 'Leave request of type "medical" for Dindu (dindu@sny.com) from 2026-07-20 to 2026-07-21 was approved by V.Chandana.',
      },
      {
        id: 'log_seed3',
        timestamp: '2026-07-14T08:15:30.000Z',
        actorEmail: 'suryanarayana@sny.com',
        actorName: 'suryanarayana',
        actorRole: 'Admin',
        action: 'Employee Onboarded',
        details: 'Onboarded employee Surya (surya@sny.com) with ID EMP002 in the Engineering department.',
      }
    ];
    await writeCollection('audit_logs', seededAuditLogs);

    console.log('Database seeded successfully.');
  } else {
    console.log('Database already has data. Seeding skipped.');
  }
}
