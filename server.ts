/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { readCollection, writeCollection, seedDatabase } from './src/db.js';
import { User, Employee, LeaveRequest, SalarySlip, AttendanceRecord, UserRole, AuditLog, Project, Task, ResourceEvent, ResourceType } from './src/types.js';
import { sendLeaveStatusEmail } from './src/emailService.js';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || process.env.GEMINI_API_KEY || 'super-secret-employee-management-key-2026';

app.use(express.json());

// Helper to generate IDs
const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to record a sensitive operational audit log
async function addAuditLog(actorEmail: string, actorName: string, actorRole: UserRole, action: string, details: string) {
  try {
    const logs = await readCollection<AuditLog>('audit_logs');
    const newLog: AuditLog = {
      id: generateId('log'),
      timestamp: new Date().toISOString(),
      actorEmail,
      actorName,
      actorRole,
      action,
      details,
    };
    logs.unshift(newLog); // Prepend to show most recent first
    await writeCollection('audit_logs', logs);
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
}

// Helper to get detailed actor information from request context
async function getActorInfo(req: express.Request) {
  const user = (req as any).user;
  if (!user) {
    return { email: 'system@sny.com', name: 'System', role: 'Admin' as UserRole };
  }
  try {
    const employees = await readCollection<Employee>('employees');
    const employee = employees.find(e => e.email.toLowerCase() === user.email.toLowerCase());
    return {
      email: user.email,
      name: employee ? employee.name : user.email,
      role: user.role as UserRole
    };
  } catch (err) {
    return { email: user.email, name: user.email, role: user.role as UserRole };
  }
}

// ============================================================================
// MIDDLEWARES
// ============================================================================

// Authenticate JWT Token
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    (req as any).user = user;
    next();
  });
}

// Require specific role(s)
function requireRole(roles: UserRole[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: `Access denied. Requires one of the following roles: ${roles.join(', ')}` });
      return;
    }
    next();
  };
}

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const users = await readCollection<User>('users');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate JWT token with user context (id, email, role)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Get corresponding employee record
    const employees = await readCollection<Employee>('employees');
    const employee = employees.find(e => e.email.toLowerCase() === email.toLowerCase());

    const actorName = employee ? employee.name : 'System Admin';
    await addAuditLog(user.email, actorName, user.role, 'Login Success', `User ${actorName} successfully logged into the system.`);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: actorName,
        employeeId: employee ? employee.employeeId : undefined,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  try {
    const users = await readCollection<User>('users');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ message: 'User found', email: user.email });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error during forgot password' });
  }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  try {
    const users = await readCollection<User>('users');
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (userIndex === -1) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const salt = bcrypt.genSaltSync(10);
    users[userIndex].password = bcrypt.hashSync(password, salt);
    await writeCollection('users', users);
    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const employees = await readCollection<Employee>('employees');
    const targetEmployee = employees.find(e => e.email.toLowerCase() === email.toLowerCase());

    if (!targetEmployee) {
      res.status(400).json({ error: 'Your email is not onboarded yet. Please contact an Admin or HR to onboard you first.' });
      return;
    }

    const users = await readCollection<User>('users');
    let userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    let user: User;
    if (userIndex !== -1) {
      // Update existing user password
      users[userIndex].password = hashedPassword;
      user = users[userIndex];
    } else {
      // Create new user record
      const userId = generateId('user');
      user = {
        id: userId,
        email: email.toLowerCase(),
        role: targetEmployee.role,
        password: hashedPassword,
      };
      users.push(user);
    }

    await writeCollection('users', users);

    // Generate JWT token for automatic sign-in after sign-up
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await addAuditLog(
      user.email,
      targetEmployee.name,
      user.role,
      'Employee Signed Up',
      `Employee ${targetEmployee.name} (${user.email}) successfully registered and activated their account.`
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: targetEmployee.name,
        employeeId: targetEmployee.employeeId,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const userPayload = (req as any).user;
  try {
    const employees = await readCollection<Employee>('employees');
    const employee = employees.find(e => e.email.toLowerCase() === userPayload.email.toLowerCase());

    res.json({
      id: userPayload.id,
      email: userPayload.email,
      role: userPayload.role,
      name: employee ? employee.name : 'User',
      employeeId: employee ? employee.employeeId : undefined,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/audit-logs (Admin only)
app.get('/api/audit-logs', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const logs = await readCollection<AuditLog>('audit_logs');
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});

// ============================================================================
// EMPLOYEE MANAGEMENT ENDPOINTS
// ============================================================================

// GET /api/employees (Admin & HR)
app.get('/api/employees', authenticateToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const employees = await readCollection<Employee>('employees');
    res.json(employees);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve employees' });
  }
});

// POST /api/employees (Admin only)
app.post('/api/employees', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { email, password, name, employeeId, department, role, joiningDate, salary } = req.body;

  if (!email || !password || !name || !employeeId || !department || !role || !joiningDate || !salary) {
    res.status(400).json({ error: 'All fields are required to create an employee' });
    return;
  }

  try {
    const users = await readCollection<User>('users');
    const employees = await readCollection<Employee>('employees');

    // Check if email or employeeId is already taken
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }
    if (employees.some(e => e.employeeId === employeeId)) {
      res.status(400).json({ error: 'Employee ID already exists' });
      return;
    }

    // Create User record
    const salt = bcrypt.genSaltSync(10);
    const userId = generateId('user');
    const newUser: User = {
      id: userId,
      email: email.toLowerCase(),
      role: role as UserRole,
      password: bcrypt.hashSync(password, salt),
    };

    // Create Employee record
    const empId = generateId('emp');
    const newEmployee: Employee = {
      id: empId,
      email: email.toLowerCase(),
      name,
      employeeId,
      department,
      role: role as UserRole,
      joiningDate,
      leaveBalance: { casual: 15, medical: 10 },
      salary: {
        basic: Number(salary.basic) || 0,
        allowances: Number(salary.allowances) || 0,
        deductions: Number(salary.deductions) || 0,
      },
    };

    users.push(newUser);
    employees.push(newEmployee);

    await writeCollection('users', users);
    await writeCollection('employees', employees);

    // Audit Log
    const actor = await getActorInfo(req);
    await addAuditLog(
      actor.email,
      actor.name,
      actor.role,
      'Employee Onboarded',
      `Onboarded employee ${newEmployee.name} (${newEmployee.email}) with ID ${newEmployee.employeeId} in the ${newEmployee.department} department.`
    );

    res.status(201).json(newEmployee);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /api/employees/:id (HR & Admin)
app.put('/api/employees/:id', authenticateToken, requireRole(['HR', 'Admin']), async (req, res) => {
  const { id } = req.params;
  const { name, department, salary, leaveBalance } = req.body;

  try {
    const employees = await readCollection<Employee>('employees');
    const empIndex = employees.findIndex(e => e.id === id);

    if (empIndex === -1) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // HR can edit information
    const currentEmp = employees[empIndex];
    if (name) currentEmp.name = name;
    if (department) currentEmp.department = department;
    if (salary) {
      currentEmp.salary = {
        basic: salary.basic !== undefined ? Number(salary.basic) : currentEmp.salary.basic,
        allowances: salary.allowances !== undefined ? Number(salary.allowances) : currentEmp.salary.allowances,
        deductions: salary.deductions !== undefined ? Number(salary.deductions) : currentEmp.salary.deductions,
      };
    }
    if (leaveBalance) {
      currentEmp.leaveBalance = {
        casual: leaveBalance.casual !== undefined ? Number(leaveBalance.casual) : currentEmp.leaveBalance.casual,
        medical: leaveBalance.medical !== undefined ? Number(leaveBalance.medical) : currentEmp.leaveBalance.medical,
      };
    }

    employees[empIndex] = currentEmp;
    await writeCollection('employees', employees);

    // Audit Log
    const actor = await getActorInfo(req);
    await addAuditLog(
      actor.email,
      actor.name,
      actor.role,
      'Employee Profile Edited',
      `Updated profile for ${currentEmp.name} (${currentEmp.email}). Modified sections: ${[
        name ? 'Name' : null,
        department ? 'Department' : null,
        salary ? 'Salary Structure' : null,
        leaveBalance ? 'Leave Balance' : null,
      ].filter(Boolean).join(', ') || 'none'}.`
    );

    res.json(currentEmp);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE /api/employees/:id (Admin only)
app.delete('/api/employees/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const employees = await readCollection<Employee>('employees');
    const empToDelete = employees.find(e => e.id === id);

    if (!empToDelete) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // Filter out from employees
    const updatedEmployees = employees.filter(e => e.id !== id);
    await writeCollection('employees', updatedEmployees);

    // Filter out from users
    const users = await readCollection<User>('users');
    const updatedUsers = users.filter(u => u.email.toLowerCase() !== empToDelete.email.toLowerCase());
    await writeCollection('users', updatedUsers);

    // Audit Log
    const actor = await getActorInfo(req);
    await addAuditLog(
      actor.email,
      actor.name,
      actor.role,
      'Employee Removed',
      `Permanently removed employee profile and user login for ${empToDelete.name} (${empToDelete.email}) with ID ${empToDelete.employeeId}.`
    );

    res.json({ message: 'Employee and user account successfully removed' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// ============================================================================
// LEAVE MANAGEMENT ENDPOINTS
// ============================================================================

// GET /api/leaves (All roles, scoped)
app.get('/api/leaves', authenticateToken, async (req, res) => {
  const user = (req as any).user;
  try {
    const leaves = await readCollection<LeaveRequest>('leaves');

    if (user.role === 'Admin' || user.role === 'HR') {
      res.json(leaves);
    } else {
      // Employee: can only see their own requests
      const empLeaves = leaves.filter(l => l.employeeEmail.toLowerCase() === user.email.toLowerCase());
      res.json(empLeaves);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve leave requests' });
  }
});

// POST /api/leaves (Employee only)
app.post('/api/leaves', authenticateToken, requireRole(['Employee']), async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;
  const user = (req as any).user;

  if (!leaveType || !startDate || !endDate || !reason) {
    res.status(400).json({ error: 'leaveType, startDate, endDate, and reason are required' });
    return;
  }

  if (leaveType !== 'casual' && leaveType !== 'medical') {
    res.status(400).json({ error: 'Invalid leave type. Must be "casual" or "medical"' });
    return;
  }

  try {
    const employees = await readCollection<Employee>('employees');
    const emp = employees.find(e => e.email.toLowerCase() === user.email.toLowerCase());

    if (!emp) {
      res.status(404).json({ error: 'Employee profile not found' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: 'Invalid start date or end date format' });
      return;
    }

    if (start > end) {
      res.status(400).json({ error: 'Start date cannot be after end date' });
      return;
    }

    // Check for overlapping leaves for this user
    const leaves = await readCollection<LeaveRequest>('leaves');
    const existingActiveLeaves = leaves.filter(l => 
      l.employeeEmail.toLowerCase() === user.email.toLowerCase() && 
      l.status !== 'rejected'
    );

    const isOverlapping = existingActiveLeaves.some(l => {
      return (startDate <= l.endDate) && (endDate >= l.startDate);
    });

    if (isOverlapping) {
      res.status(400).json({ error: 'You have an overlapping active leave request during these dates' });
      return;
    }

    // Calculate days requested
    const timeDiff = end.getTime() - start.getTime();
    const daysRequested = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    // Check balance
    const currentBalance = emp.leaveBalance[leaveType];
    if (daysRequested > currentBalance) {
      res.status(400).json({ 
        error: `Insufficient leave balance. Requested: ${daysRequested} days, Available: ${currentBalance} days` 
      });
      return;
    }

    // Submit leave request
    const newLeave: LeaveRequest = {
      id: generateId('leave'),
      employeeEmail: user.email.toLowerCase(),
      employeeName: emp.name,
      leaveType,
      startDate,
      endDate,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    leaves.push(newLeave);
    await writeCollection('leaves', leaves);

    res.status(201).json(newLeave);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to submit leave request' });
  }
});

// POST /api/leaves/:id/review (HR only)
app.post('/api/leaves/:id/review', authenticateToken, requireRole(['HR']), async (req, res) => {
  const { id } = req.params;
  const { status, comments } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Review status must be either "approved" or "rejected"' });
    return;
  }

  try {
    const leaves = await readCollection<LeaveRequest>('leaves');
    const leaveIndex = leaves.findIndex(l => l.id === id);

    if (leaveIndex === -1) {
      res.status(404).json({ error: 'Leave request not found' });
      return;
    }

    const leave = leaves[leaveIndex];
    if (leave.status !== 'pending') {
      res.status(400).json({ error: 'Leave request has already been processed' });
      return;
    }

    const employees = await readCollection<Employee>('employees');
    const empIndex = employees.findIndex(e => e.email.toLowerCase() === leave.employeeEmail.toLowerCase());

    if (empIndex === -1) {
      res.status(404).json({ error: 'Employee associated with leave request not found' });
      return;
    }

    const emp = employees[empIndex];

    if (status === 'approved') {
      // Calculate days requested
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const timeDiff = end.getTime() - start.getTime();
      const daysRequested = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      // Verify leave balance again just to be secure
      const currentBalance = emp.leaveBalance[leave.leaveType];
      if (daysRequested > currentBalance) {
        res.status(400).json({ error: 'Employee has insufficient leave balance to approve this request' });
        return;
      }

      // Deduct balance
      emp.leaveBalance[leave.leaveType] -= daysRequested;
      employees[empIndex] = emp;
      await writeCollection('employees', employees);
    }

    // Update status
    leave.status = status;
    leave.comments = comments || '';
    leaves[leaveIndex] = leave;
    await writeCollection('leaves', leaves);

    // Audit Log
    const actor = await getActorInfo(req);

    // Dispatch automated email alert notification to employee
    const emailResult = await sendLeaveStatusEmail(leave, emp, actor.name);
    let emailLogText = '';
    if (emailResult.success) {
      emailLogText = ` Automated email alert sent to ${emp.email}.` + (emailResult.previewUrl ? ` Sandbox Link: ${emailResult.previewUrl}` : '');
    } else {
      emailLogText = ` Failed to send automated email alert: ${emailResult.error}`;
    }

    await addAuditLog(
      actor.email,
      actor.name,
      actor.role,
      status === 'approved' ? 'Leave Approved' : 'Leave Rejected',
      `Leave request of type "${leave.leaveType}" for ${leave.employeeName} (${leave.employeeEmail}) from ${leave.startDate} to ${leave.endDate} was ${status} by ${actor.name}.${comments ? ' Reason: "' + comments + '"' : ''}${emailLogText}`
    );

    res.json(leave);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to process leave request' });
  }
});

// ============================================================================
// SALARY SLIP ENDPOINTS
// ============================================================================

// GET /api/slips (All roles, scoped)
app.get('/api/slips', authenticateToken, async (req, res) => {
  const user = (req as any).user;
  try {
    const slips = await readCollection<SalarySlip>('slips');

    if (user.role === 'Admin' || user.role === 'HR') {
      res.json(slips);
    } else {
      // Employee: see their own slips only
      const empSlips = slips.filter(s => s.employeeEmail.toLowerCase() === user.email.toLowerCase());
      res.json(empSlips);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve salary slips' });
  }
});

// POST /api/slips (HR only)
app.post('/api/slips', authenticateToken, requireRole(['HR']), async (req, res) => {
  const { employeeEmail, month, year } = req.body;

  if (!employeeEmail || !month || !year) {
    res.status(400).json({ error: 'employeeEmail, month, and year are required' });
    return;
  }

  try {
    const employees = await readCollection<Employee>('employees');
    const emp = employees.find(e => e.email.toLowerCase() === employeeEmail.toLowerCase());

    if (!emp) {
      res.status(404).json({ error: 'Employee profile not found' });
      return;
    }

    // Prevent duplicate slip for same month + year
    const slips = await readCollection<SalarySlip>('slips');
    const duplicateExists = slips.some(s => 
      s.employeeEmail.toLowerCase() === employeeEmail.toLowerCase() &&
      s.month.toLowerCase() === month.toLowerCase() &&
      Number(s.year) === Number(year)
    );

    if (duplicateExists) {
      res.status(400).json({ error: `Salary slip already exists for ${month} ${year}` });
      return;
    }

    // Calculations
    const basic = Number(emp.salary.basic) || 0;
    const allowances = Number(emp.salary.allowances) || 0;
    const deductions = Number(emp.salary.deductions) || 0;
    const netSalary = (basic + allowances) - deductions;

    const newSlip: SalarySlip = {
      id: generateId('slip'),
      employeeEmail: emp.email.toLowerCase(),
      employeeName: emp.name,
      employeeId: emp.employeeId,
      month,
      year: Number(year),
      basic,
      allowances,
      deductions,
      netSalary,
      generatedAt: new Date().toISOString()
    };

    slips.push(newSlip);
    await writeCollection('slips', slips);

    res.status(201).json(newSlip);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate salary slip' });
  }
});

// ============================================================================
// ATTENDANCE ENDPOINTS
// ============================================================================

// GET /api/attendance (All roles, scoped)
app.get('/api/attendance', authenticateToken, async (req, res) => {
  const user = (req as any).user;
  try {
    const attendance = await readCollection<AttendanceRecord>('attendance');

    if (user.role === 'Admin' || user.role === 'HR') {
      res.json(attendance);
    } else {
      // Employee: own attendance only
      const empAttendance = attendance.filter(a => a.employeeEmail.toLowerCase() === user.email.toLowerCase());
      res.json(empAttendance);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve attendance records' });
  }
});

// POST /api/attendance/punch-in (Employee only)
app.post('/api/attendance/punch-in', authenticateToken, requireRole(['Employee']), async (req, res) => {
  const user = (req as any).user;
  // Get local date format: YYYY-MM-DD
  const todayStr = new Date().toLocaleDateString('en-CA'); // en-CA format returns YYYY-MM-DD reliably

  try {
    const attendance = await readCollection<AttendanceRecord>('attendance');
    const existingToday = attendance.find(a => 
      a.employeeEmail.toLowerCase() === user.email.toLowerCase() && 
      a.date === todayStr
    );

    if (existingToday) {
      res.status(400).json({ error: 'You have already punched in for today' });
      return;
    }

    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

    const newRecord: AttendanceRecord = {
      id: generateId('att'),
      employeeEmail: user.email.toLowerCase(),
      date: todayStr,
      checkIn: timeStr,
      status: 'Present'
    };

    attendance.push(newRecord);
    await writeCollection('attendance', attendance);

    res.status(201).json(newRecord);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to punch in' });
  }
});

// POST /api/attendance/punch-out (Employee only)
app.post('/api/attendance/punch-out', authenticateToken, requireRole(['Employee']), async (req, res) => {
  const user = (req as any).user;
  const todayStr = new Date().toLocaleDateString('en-CA');

  try {
    const attendance = await readCollection<AttendanceRecord>('attendance');
    const recordIndex = attendance.findIndex(a => 
      a.employeeEmail.toLowerCase() === user.email.toLowerCase() && 
      a.date === todayStr
    );

    if (recordIndex === -1) {
      res.status(400).json({ error: 'You have not punched in for today' });
      return;
    }

    const record = attendance[recordIndex];
    if (record.checkOut) {
      res.status(400).json({ error: 'You have already punched out for today' });
      return;
    }

    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    record.checkOut = timeStr;
    attendance[recordIndex] = record;

    await writeCollection('attendance', attendance);
    res.json(record);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to punch out' });
  }
});

// GET /api/notifications (All roles)
app.get('/api/notifications', authenticateToken, async (req, res) => {
  const user = (req as any).user;
  try {
    // Mock notifications based on role
    const notifications = [
      { id: 'n1', type: 'system', message: 'Welcome to the new document vault!', timestamp: new Date().toISOString(), read: false },
      ...(user.role === 'HR' ? [{ id: 'n2', type: 'leave', message: '3 pending leave requests to review', timestamp: new Date().toISOString(), read: false }] : []),
      ...(user.role === 'Employee' ? [{ id: 'n3', type: 'salary', message: 'Salary slip for July 2026 is ready', timestamp: new Date().toISOString(), read: false }] : [])
    ];
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

// GET /api/resource-events (All)
app.get('/api/resource-events', authenticateToken, async (req, res) => {
  try {
    // Mock data
    const events: ResourceEvent[] = [
      { id: 'e1', resourceId: 'emp_1', resourceName: 'Alice Smith', type: 'employee', title: 'On-site: Team Meeting', startTime: '2026-07-15T09:00:00Z', endTime: '2026-07-15T10:00:00Z' },
      { id: 'r1', resourceId: 'room_1', resourceName: 'Conference Room A', type: 'room', title: 'HR Meeting', startTime: '2026-07-15T10:00:00Z', endTime: '2026-07-15T11:00:00Z' },
      { id: 'h1', resourceId: 'hw_1', resourceName: 'MacBook Pro #12', type: 'hardware', title: 'Assigned to Bob', startTime: '2026-07-15T00:00:00Z', endTime: '2026-07-20T00:00:00Z' },
    ];
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve resource events' });
  }
});

// POST /api/projects (HR/Admin)
app.post('/api/projects', authenticateToken, requireRole(['HR', 'Admin']), async (req, res) => {
  const { title, description, startDate, endDate, status } = req.body;
  try {
    const projects = await readCollection<Project>('projects');
    const newProject: Project = {
      id: generateId('proj'),
      title,
      description,
      startDate,
      endDate,
      status: status || 'active',
      tasks: []
    };
    projects.push(newProject);
    await writeCollection('projects', projects);
    res.status(201).json(newProject);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/tasks/:id (Employee only - update status)
app.put('/api/tasks/:id', authenticateToken, requireRole(['Employee']), async (req, res) => {
  const { id } = req.params;
  const { status, completionPercentage } = req.body;
  try {
    const projects = await readCollection<Project>('projects');
    let taskFound = false;
    projects.forEach(p => {
        const task = p.tasks.find(t => t.id === id);
        if(task) {
            if(status) task.status = status;
            if(completionPercentage !== undefined) task.completionPercentage = completionPercentage;
            taskFound = true;
        }
    });
    
    if(!taskFound) {
        res.status(404).json({error: 'Task not found'});
        return;
    }
    
    await writeCollection('projects', projects);
    res.json({message: 'Task updated'});
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ============================================================================
// MAIN STARTUP ROUTINE
// ============================================================================

async function startServer() {
  // Seed the database
  try {
    await seedDatabase();
  } catch (seedErr) {
    console.error('Error during database seeding:', seedErr);
  }

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
