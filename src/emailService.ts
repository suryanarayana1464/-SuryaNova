/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from 'nodemailer';
import { LeaveRequest, Employee } from './types.js';

let transporter: nodemailer.Transporter | null = null;
let testAccountInfo: any = null;

/**
 * Lazy initializer for nodemailer transporter
 */
async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    console.log(`[EmailService] Initializing custom SMTP transport with ${host}:${port}`);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return transporter;
  }

  // Fallback to Ethereal test account (zero-config, real SMTP test sandbox)
  try {
    console.log('[EmailService] Creating automated Ethereal Email test account...');
    const testAccount = await nodemailer.createTestAccount();
    testAccountInfo = testAccount;
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[EmailService] Ethereal test account created successfully: ${testAccount.user}`);
    return transporter;
  } catch (err) {
    console.warn('[EmailService] Failed to create Ethereal account, falling back to JSON logging:', err);
    return null;
  }
}

/**
 * Helper to calculate total calendar days for a leave request
 */
function calculateLeaveDays(startDate: string, endDate: string): number {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)) + 1);
  } catch {
    return 1;
  }
}

/**
 * Sends a stylized HTML email to an employee when their leave request is reviewed.
 */
export async function sendLeaveStatusEmail(
  leave: LeaveRequest,
  employee: Employee,
  reviewerName: string
): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
  const totalDays = calculateLeaveDays(leave.startDate, leave.endDate);
  const isApproved = leave.status === 'approved';
  const statusLabel = isApproved ? 'Approved' : 'Rejected';
  const statusColor = isApproved ? '#10b981' : '#f43f5e'; // Emerald vs Rose
  const statusBg = isApproved ? '#ecfdf5' : '#fff1f2';
  const statusBorder = isApproved ? '#bbf7d0' : '#ffe4e6';

  const subject = `[Leave Request Update] Your Leave Application has been ${statusLabel}`;

  // Premium, highly polished HTML Email Template matching SuryaNova Enterprise guidelines
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 32px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    .header {
      background-color: #0f172a; /* deep slate */
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    .header p {
      margin: 4px 0 0 0;
      font-size: 14px;
      color: #94a3b8;
    }
    .content {
      padding: 32px 24px;
      color: #334155;
    }
    .greeting {
      font-size: 16px;
      line-height: 24px;
      margin-bottom: 24px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${statusColor};
      background-color: ${statusBg};
      border: 1px solid ${statusBorder};
      margin-bottom: 24px;
    }
    .details-card {
      background-color: #f1f5f9;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .details-row:last-child {
      border-bottom: none;
    }
    .details-label {
      font-weight: 600;
      color: #64748b;
      font-size: 13px;
      text-transform: uppercase;
    }
    .details-value {
      font-weight: 700;
      color: #1e293b;
      font-size: 14px;
    }
    .feedback-box {
      border-left: 4px solid #6366f1; /* Indigo */
      background-color: #f5f3ff;
      padding: 16px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 24px;
    }
    .feedback-title {
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      color: #4f46e5;
      margin-bottom: 6px;
    }
    .feedback-text {
      font-style: italic;
      font-size: 14px;
      color: #475569;
      margin: 0;
    }
    .footer {
      background-color: #f8fafc;
      border-t: 1px solid #e2e8f0;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>SuryaNova Enterprise</h1>
        <p>Human Resources & Compensation Management</p>
      </div>
      <div class="content">
        <div class="greeting">
          Dear <strong>${employee.name}</strong>,
        </div>
        <p>Your request for time-off has been processed and reviewed by <strong>${reviewerName}</strong>.</p>
        
        <div class="status-badge">
          ${statusLabel}
        </div>

        <div class="details-card">
          <div class="details-row">
            <span class="details-label">Leave Category</span>
            <span class="details-value">${leave.leaveType.toUpperCase()}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Start Date</span>
            <span class="details-value">${leave.startDate}</span>
          </div>
          <div class="details-row">
            <span class="details-label">End Date</span>
            <span class="details-value">${leave.endDate}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Total Duration</span>
            <span class="details-value">${totalDays} Day${totalDays > 1 ? 's' : ''}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Leave Purpose</span>
            <span class="details-value">${leave.reason}</span>
          </div>
        </div>

        ${
          leave.comments
            ? `
        <div class="feedback-box">
          <div class="feedback-title">HR Feedback & Decision Notes</div>
          <p class="feedback-text">"${leave.comments}"</p>
        </div>
        `
            : ''
        }

        <p style="font-size: 14px; line-height: 20px; color: #64748b; margin-top: 24px;">
          If you have any questions or require modifications to this leave request, please get in touch with the Human Resources department.
        </p>
      </div>
      <div class="footer">
        <p>&copy; 2026 SuryaNova Enterprise. All rights reserved.</p>
        <p>This is an automated system notification. Please do not reply directly to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const client = await getTransporter();

    if (!client) {
      console.log(`[EmailService] No transporter active. Simulated email to ${employee.email}:`, subject);
      return { success: true };
    }

    const fromAddress = process.env.SMTP_FROM || '"SuryaNova HR Portal" <noreply@sny.com>';
    const info = await client.sendMail({
      from: fromAddress,
      to: employee.email,
      subject,
      html: htmlContent,
    });

    console.log(`[EmailService] Notification successfully sent to ${employee.email}. Message ID: ${info.messageId}`);
    
    let previewUrl: string | undefined;
    if (testAccountInfo) {
      previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      console.log(`[EmailService] View test email preview at: ${previewUrl}`);
    }

    return { success: true, previewUrl };
  } catch (error: any) {
    console.error(`[EmailService] Failed to deliver leave status email to ${employee.email}:`, error);
    return { success: false, error: error.message || String(error) };
  }
}
