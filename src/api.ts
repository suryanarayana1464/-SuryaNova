/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const getHeaders = () => {
  const token = localStorage.getItem('emp_jwt_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

async function handleResponse(res: Response) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export const api = {
  // Authentication
  async login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    localStorage.setItem('emp_jwt_token', data.token);
    return data;
  },

  async signup(email: string, password: string) {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    localStorage.setItem('emp_jwt_token', data.token);
    return data;
  },

  async forgotPassword(email: string) {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  async resetPassword(email: string, password: string) {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await fetch('/api/auth/me', {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  logout() {
    localStorage.removeItem('emp_jwt_token');
  },

  // Employees
  async getEmployees() {
    const res = await fetch('/api/employees', {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createEmployee(employeeData: any) {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(employeeData),
    });
    return handleResponse(res);
  },

  async updateEmployee(id: string, updateData: any) {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updateData),
    });
    return handleResponse(res);
  },

  async deleteEmployee(id: string) {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Leaves
  async getLeaves() {
    const res = await fetch('/api/leaves', {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async submitLeave(leaveData: { leaveType: 'casual' | 'medical'; startDate: string; endDate: string; reason: string }) {
    const res = await fetch('/api/leaves', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(leaveData),
    });
    return handleResponse(res);
  },

  async reviewLeave(id: string, reviewData: { status: 'approved' | 'rejected'; comments?: string }) {
    const res = await fetch(`/api/leaves/${id}/review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(reviewData),
    });
    return handleResponse(res);
  },

  // Salary Slips
  async getSlips() {
    const res = await fetch('/api/slips', {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async generateSlip(slipData: { employeeEmail: string; month: string; year: number }) {
    const res = await fetch('/api/slips', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(slipData),
    });
    return handleResponse(res);
  },

  // Attendance
  async getAttendance() {
    const res = await fetch('/api/attendance', {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async punchIn() {
    const res = await fetch('/api/attendance/punch-in', {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async punchOut() {
    const res = await fetch('/api/attendance/punch-out', {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Audit Logs
  async getAuditLogs() {
    const res = await fetch('/api/audit-logs', {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Notifications
  async getNotifications() {
    const res = await fetch('/api/notifications', {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Projects & Tasks
  async getProjects() {
    const res = await fetch('/api/projects', {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async updateTask(id: string, updateData: { status?: 'todo' | 'in-progress' | 'completed'; completionPercentage?: number; performanceReviewLinkId?: string }) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updateData),
    });
    return handleResponse(res);
  },

  // Resource Calendar
  async getResourceEvents() {
    const res = await fetch('/api/resource-events', {
      headers: getHeaders(),
    });
    return handleResponse(res);
  }
};
