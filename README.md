<<<<<<< HEAD
# -SuryaNova
This MERN Stack web application provides a modern and responsive interface for managing data efficiently. Built with React.js, Node.js, Express.js, and MongoDB, it supports seamless CRUD operations, secure backend APIs, and real-time database integration. The project demonstrates full-stack development skills and a scalable application architecture
=======
# TalentSync - Enterprise Employee Management System with RBAC

TalentSync is a full-stack corporate management application demonstrating robust **Role-Based Access Control (RBAC)**, custom workflows, leave balancing, and salary statement generation.

---

## 🔐 Role Structure & Credentials

To test the application's RBAC boundaries, use the pre-seeded demo accounts available directly via the "Quick Login" panel on the sign-in screen, or use the credentials below:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `suryanarayana@sny.com` | `admin123` | Full user onboarding, employee removal, and global analytics. |
| **HR Manager** | `vchandana@sny.com` | `hr123` | Employee profile edits, salary slip calculations, leave approvals/rejections, and attendance log monitoring. |
| **Employee** | `surya@sny.com` | `emp123` | Profile overview, live attendance punch-in/out, leave applications (checked against remaining balances), and print-ready payslips. |

---

## 🛠️ Tech Stack & Key Modules

- **Frontend**: React 19 + TypeScript + Tailwind CSS (v4) + Lucide Icons
- **Backend**: Node.js + Express + JWT Session Security + JSON DB Persistence
- **State & Router**: Custom Token Decryption Engine with dynamic React view injection based on JWT Claims

---

## 🚀 How to Run Locally

### 1. Prerequisites
- **Node.js** (v18+)
- **NPM** (v9+)

### 2. Environment Variables
Create a `.env` file in the project root:
```env
# Secret key used to sign session cookies and JWT access tokens
JWT_SECRET="talent-sync-corporate-super-secret-key-2026"
```

### 3. Startup Commands
Install dependencies and boot up the development server:
```bash
# Install core modules
npm install

# Start the full-stack server
npm run dev
```
The application will run locally on `http://localhost:3000`.

---

## 📡 Protected API Endpoints

All endpoints starting with `/api` validate JWT headers.

- **Authentication**:
  - `POST /api/auth/login` - Authenticate credentials and sign JWT
  - `GET /api/auth/me` - Restore user session details from token
- **Employee Management**:
  - `GET /api/employees` - Read complete staff list *(Admin, HR only)*
  - `POST /api/employees` - Register a new staff profile & user account *(Admin only)*
  - `PUT /api/employees/:id` - Update employee particulars and variable salaries *(Admin, HR only)*
  - `DELETE /api/employees/:id` - Erase employee and user access records *(Admin only)*
- **Leave Requests Pipeline**:
  - `GET /api/leaves` - Get all requests *(Admin/HR)* or own requests *(Employee)*
  - `POST /api/leaves` - Apply for leaves with overlap and balance validation *(Employee only)*
  - `POST /api/leaves/:id/review` - Approve or reject a pending request and update balances *(HR only)*
- **Salary Statements & Attendance**:
  - `GET /api/slips` - Read slips *(Admin/HR)* or own slips *(Employee)*
  - `POST /api/slips` - Calculate net pay and issue new slips *(HR only)*
  - `GET /api/attendance` - Sync daily attendance logs
  - `POST /api/attendance/punch-in` - Mark today's punch-in *(Employee only)*
  - `POST /api/attendance/punch-out` - Mark today's punch-out *(Employee only)*
>>>>>>> 31da6ee (Initial commit)
