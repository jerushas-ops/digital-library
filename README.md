# Digital Library Management System (P05)
## University / College Digital Library Management REST API & Web Application

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208.9-brightgreen.svg)](https://mongoosejs.com/)
[![JWT](https://img.shields.io/badge/Auth-JWT%20%26%20Bcrypt-orange.svg)](https://jwt.io/)
[![Tests](https://img.shields.io/badge/Tests-Jest%2033%20Passed-success.svg)](#automated-testing)

---

## 1. Project Title & Overview

The **Digital Library Management System (P05)** is a complete, backend-driven, production-quality academic web application built to replace legacy manual register-based library workflows in higher education institutions with a modern, secure, and scalable REST API platform.

Backed by **Node.js**, **Express.js**, and **MongoDB (Mongoose ODM)**, the platform enforces strict business rules, dynamic fine calculation, reservation waitlist queues, granular Role-Based Access Control (RBAC), analytical reporting using MongoDB aggregation pipelines, audit logging, and a responsive single-page client workstation.

---

## 2. Problem Statement & Objectives

### Problem Statement
Traditional university libraries rely on physical registers or rudimentary CRUD applications that lack:
- Enforced borrowing rules, loan durations, and credit limit validations.
- Automated overdue fine computations and multi-step payment tracking.
- Waitlist hold queues for high-demand out-of-stock titles.
- Role-based separation between students, faculty, librarians, and system administrators.
- Real-time inventory tracking accounting for lost and damaged items.

### Objectives
1. **Automate Circulation**: Provide end-to-end book issue, return, renewal, and hold workflows with state validation.
2. **Strict Business Logic**: Validate member status, borrowing limits, duplicate borrowings, available copies, and fine thresholds before any transaction.
3. **Automated Fines Engine**: Automatically calculate overdue fines based on membership tier rates upon book return.
4. **FIFO Reservation Queue**: Manage waiting queues when books are out of stock and auto-dispatch ready notifications on returns.
5. **Role-Based Access Control (RBAC)**: Enforce secure endpoints for `MEMBER`, `LIBRARIAN`, and `ADMIN`.
6. **Analytical Reporting**: Leverage MongoDB aggregation pipelines for overdue tracking, inventory health, and collection metrics.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Backend Runtime** | Node.js (v18.x / v20.x / v22.x) |
| **Web Framework** | Express.js (v4.21.x) |
| **Database & ODM** | MongoDB with Mongoose (v8.9.x) *(Supports Local MongoDB, Atlas, and Automatic In-Memory MongoDB Fallback)* |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` (salt rounds: 10) |
| **Security & Headers** | `helmet`, `cors`, `express-rate-limit` |
| **Testing** | Jest (v29.x), Supertest (v7.x), Postman |
| **Frontend UI** | HTML5, CSS3 (Modern Glassmorphism Design), JavaScript (ES6+), Bootstrap 5, Chart.js, FontAwesome 6 |

---

## 4. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Client Layer (Web Browser / Postman)                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON (REST)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          Express.js Server Layer                       │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Security & Sanitization: Helmet, CORS, RateLimiter, BodyParsers   │ │
│ └─────────────────────────────────┬──────────────────────────────────┘ │
│                                   ▼                                    │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Routing Matrix: /api/auth, /api/books, /api/transactions,          │ │
│ │                 /api/holds, /api/membership-plans, /api/admin      │ │
│ └─────────────────────────────────┬──────────────────────────────────┘ │
│                                   ▼                                    │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Auth & RBAC Middleware: authenticateToken, authorizeRoles          │ │
│ └─────────────────────────────────┬──────────────────────────────────┘ │
│                                   ▼                                    │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Validation Layer: ObjectId guards, schema validators               │ │
│ └─────────────────────────────────┬──────────────────────────────────┘ │
│                                   ▼                                    │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Business Services:                                                 │ │
│ │ - transactionService (Issue/Return, limits, inventory consistency) │ │
│ │ - fineService (Overdue fine calculation, installment payments)     │ │
│ │ - holdService (FIFO queue, auto-notification on book return)       │ │
│ │ - reportService (MongoDB Aggregation Pipelines)                    │ │
│ │ - notificationService (In-app alerts for due soon & overdues)      │ │
│ │ - auditService (System audit trail logger)                         │ │
│ └─────────────────────────────────┬──────────────────────────────────┘ │
│                                   ▼                                    │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Centralized Error Handler: Operational errors, 400/401/403/404/409 │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         MongoDB Database Layer                         │
│ Collections: users, books, transactions, holds, finePayments,          │
│              membershipPlans, notifications, librarySettings, auditLogs│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Project Folder Structure

```
project-root/
├── config/
│   ├── db.js                      # MongoDB connection manager with in-memory fallback
│   └── defaultSettings.js         # Default library system settings
├── constants/
│   └── index.js                   # Application enums (Roles, Statuses, Error Codes)
├── models/
│   ├── User.js                    # Member, Librarian, Admin schema & password methods
│   ├── Book.js                    # Catalog books & copy tracking schema
│   ├── Transaction.js             # Loans, due dates, fines, and return states
│   ├── Hold.js                    # Reservation FIFO queue schema
│   ├── FinePayment.js             # Fine payments and waivers ledger
│   ├── MembershipPlan.js          # Student, Faculty, and custom borrowing plans
│   ├── Notification.js            # Internal in-app notification alerts
│   ├── LibrarySetting.js          # Configurable runtime parameters
│   └── AuditLog.js                # Administrative action audit trail
├── middleware/
│   ├── auth.js                    # authenticateToken JWT verification middleware
│   ├── role.js                    # authorizeRoles RBAC middleware
│   ├── validate.js                # Input schema validator runner
│   ├── errorHandler.js            # Centralized global error handling middleware
│   ├── notFound.js                # 404 Route handler
│   └── audit.js                   # Audit log middleware
├── validators/
│   ├── authValidator.js           # Register, login, profile validation
│   ├── bookValidator.js           # Book create, update, ISBN validation
│   ├── transactionValidator.js    # Issue and return validation
│   ├── holdValidator.js           # Hold placement validation
│   ├── fineValidator.js           # Fine payment validation
│   └── planValidator.js           # Membership plan validation
├── services/
│   ├── transactionService.js      # Core issue/return business logic
│   ├── fineService.js             # Fine calculation, payments & waivers
│   ├── holdService.js             # FIFO waitlist queue and return triggers
│   ├── notificationService.js     # Alert generator and overdue loan scanner
│   ├── reportService.js           # Aggregation pipelines for analytical reports
│   └── auditService.js            # Audit logger service
├── controllers/
│   ├── authController.js          # Authentication endpoints
│   ├── bookController.js          # Book catalog CRUD and search
│   ├── transactionController.js   # Issue and return controller
│   ├── holdController.js          # Reservation queue controller
│   ├── membershipController.js    # Membership plans controller
│   ├── finePaymentController.js   # Fine payment controller
│   ├── notificationController.js  # Notifications controller
│   ├── inventoryController.js     # Copy counts and health controller
│   ├── reportController.js        # Analytics aggregation controller
│   └── adminController.js         # User management, settings, audit controller
├── routes/
│   ├── authRoutes.js
│   ├── bookRoutes.js
│   ├── transactionRoutes.js
│   ├── holdRoutes.js
│   ├── membershipRoutes.js
│   ├── finePaymentRoutes.js
│   ├── notificationRoutes.js
│   ├── inventoryRoutes.js
│   ├── memberRoutes.js
│   ├── reportRoutes.js
│   └── adminRoutes.js
├── utils/
│   ├── apiResponse.js             # Standardized { success, message, data, errorCode }
│   ├── generateMemberId.js        # LIB-YYYY-XXXXX membership ID generator
│   ├── generateToken.js           # JWT signing & verification utilities
│   └── customErrors.js            # Custom error classes (AppError, ConflictError, etc.)
├── seed/
│   └── seed.js                    # Database seeder (20 books, users, plans, transactions)
├── tests/
│   ├── auth.test.js               # Auth unit & integration tests
│   ├── books.test.js              # Catalog & search tests
│   ├── transactions.test.js       # Issue, return, copy counts tests
│   ├── holds.test.js              # FIFO queue & trigger tests
│   ├── fines.test.js              # Fine calculation & payment tests
│   └── reports.test.js            # MongoDB aggregation pipeline tests
├── public/
│   ├── css/
│   │   └── style.css              # Custom modern UI styling
│   ├── js/
│   │   ├── api.js                 # API HTTP client
│   │   ├── auth.js                # Auth state & quick demo switcher
│   │   ├── catalog.js             # Book search & filter module
│   │   ├── memberView.js          # Member dashboard, loans, fines, holds
│   │   ├── librarianView.js       # Circulation desk workstation & catalog editor
│   │   ├── adminView.js           # Executive dashboard, Chart.js, user manager
│   │   └── app.js                 # Core SPA router & notifications
│   └── index.html                 # Single Page Application frontend
├── postman/
│   ├── Digital_Library_Management_System.postman_collection.json
│   └── Digital_Library_Local.postman_environment.json
├── .env.example
├── .gitignore
├── package.json
├── server.js                      # Application server entry point
└── README.md                      # Comprehensive academic documentation
```

---

## 6. MongoDB Database Design & ER Diagram

### 6.1 Database Modeling Rationale
- **Normalized References (`ObjectId`)**: Books and Users have independent lifecycles. Instead of embedding large book catalog objects inside transaction loans, transactions store clean `bookId` and `memberId` references.
- **Embedded Arrays vs Distinct Collections**: Fines and reservation holds are modeled as distinct collections to enable multi-installment payment auditing, independent queue ordering, and efficient indexing without unbound document growth.
- **Strategic Indexes**: Text indexes are placed on `{ title, author, category }` for instant multi-field catalog search. Compound indexes like `{ memberId: 1, bookId: 1, status: 1 }` guarantee $O(1)$ duplicate active loan and duplicate active hold validation.

### 6.2 Entity-Relationship (ER) Diagram

```
+-------------------------+               +----------------------------+
|     MembershipPlan      | 1           * |            User            |
|-------------------------|---------------|----------------------------|
| _id                     |               | _id                        |
| name (STUDENT/FACULTY)  |               | name, email (unique)       |
| maximumBooks            |               | passwordHash               |
| loanDurationDays        |               | role (MEMBER/LIB/ADMIN)    |
| finePerDay              |               | membershipId (unique)      |
| fineThreshold           |               | membershipPlanId (FK)      |
| borrowingEnabled        |               | outstandingFines           |
+-------------------------+               +----------------------------+
                                                         | 1
                                                         |
                           +-----------------------------+-----------------------------+
                           | *                           | *                           | *
                           v                             v                             v
+------------------------------------+   +------------------------------------+   +----------------------------+
|            Transaction             |   |                Hold                |   |        Notification        |
|------------------------------------|   |------------------------------------|   |----------------------------|
| _id                                |   | _id                                |   | _id                        |
| bookId (FK) ------------------+    |   | bookId (FK) ------------------+    |   | memberId (FK)              |
| memberId (FK)                 |    |   | memberId (FK)                 |    |   | transactionId (FK)         |
| issueDate, dueDate            |    |   | status (WAITING/READY/...)    |    |   | type (DUE_SOON/OVERDUE...) |
| returnDate                    |    |   | requestedAt, expiresAt        |    |   | title, message, isRead     |
| fine, finePaid, fineStatus    |    |   +------------------------------------+   +----------------------------+
| status (ACTIVE/RETURNED/...)  |    |                                   |
| issuedBy (FK), returnedBy (FK)|    |                                   |
+------------------------------------+    |                                   |
                  | 1                     |                                   |
                  |                       |                                   |
                  v *                     v *                                 v *
+------------------------------------+  +----------------------------------------------------------------------+
|            FinePayment             |  |                                 Book                                 |
|------------------------------------|  |----------------------------------------------------------------------|
| _id                                |  | _id                                                                  |
| transactionId (FK)                 |  | title, author, isbn (unique)                                         |
| memberId (FK)                      |  | category, publisher, publicationYear                                 |
| amount, paymentMethod              |  | totalCopies, availableCopies, lostCopies, damagedCopies              |
| reference, paidAt, status          |  | status (AVAILABLE/ARCHIVED/MAINTENANCE), borrowCount                 |
+------------------------------------+  +----------------------------------------------------------------------+
```

---

## 7. Mandatory Functional Modules (All 13 Modules)

| # | Module Name | Description & Key Business Logic | Key Endpoints |
|---|---|---|---|
| **1** | **Member Auth & Registration** | User registration, password hashing (bcrypt), JWT generation & verification, auto-generated Membership ID (`LIB-YYYY-XXXXX`), status checks. | `POST /api/auth/register`<br>`POST /api/auth/login`<br>`GET /api/auth/me`<br>`PUT /api/auth/profile` |
| **2** | **Book Catalog Management** | Full CRUD for books, ISBN uniqueness validation, copy count consistency, soft-archiving if historical transactions exist. | `POST /api/books`<br>`GET /api/books`<br>`GET /api/books/:id`<br>`PUT /api/books/:id`<br>`DELETE /api/books/:id` |
| **3** | **Catalog Search & Filtering** | Search by title, author, ISBN, category, availability filter on shelf, sorting, pagination, MongoDB text index. | `GET /api/books/search?q=...`<br>`GET /api/books?category=...&available=true` |
| **4** | **Book Issue Workflow** | Validates member status, borrowing limits, duplicate active loans, fine threshold, available copies; decrements inventory and sets transaction `ACTIVE`. | `POST /api/transactions/issue`<br>`GET /api/transactions/active` |
| **5** | **Book Return & Fine Engine** | Validates active transaction, calculates overdue days & fines dynamically based on member plan rate, increments available copies, triggers hold queue. | `PUT /api/transactions/:id/return`<br>`GET /api/transactions/overdue` |
| **6** | **Reservation / Hold Queue** | Members place holds on out-of-stock books, FIFO queue ordering (`requestedAt`), auto-promoted to `READY` with 48h expiration when a copy is returned. | `POST /api/holds`<br>`GET /api/holds`<br>`PUT /api/holds/:id/cancel`<br>`GET /api/holds/queue/:bookId` |
| **7** | **Membership Plans & Limits** | Configurable plans (`STUDENT`, `FACULTY`, `RESEARCHER`) defining max books, loan days, daily fine rates, and borrowing blocks. | `GET /api/membership-plans`<br>`POST /api/membership-plans`<br>`PUT /api/membership-plans/:id` |
| **8** | **Fine Payment Tracking** | Simulated payments (partial/full installments), prevents overpayment and paying already settled fines, fine waiver support. | `POST /api/fine-payments`<br>`GET /api/fine-payments`<br>`PUT /api/fine-payments/:id/waive`<br>`GET /api/members/:id/fines` |
| **9** | **Overdue Notifications** | In-app alerts for `DUE_SOON`, `OVERDUE`, `HOLD_READY`, and `FINE_PAYMENT`. Background scanner runs periodically. | `GET /api/notifications`<br>`PUT /api/notifications/:id/read`<br>`PUT /api/notifications/read-all` |
| **10** | **Inventory & Copy Management**| Tracks total, available, issued, lost, and damaged copies. Guarantees copy sum consistency and non-negative constraints. | `GET /api/inventory`<br>`PUT /api/inventory/:bookId` |
| **11** | **Member Borrowing History** | Retrieves borrowing history. Members can only view their own; Librarians and Admins can view any member's history. | `GET /api/members/:id/history` |
| **12** | **Librarian/Admin Reports** | High-speed MongoDB Aggregation Pipelines for Overdue Loans, Most Borrowed Books, Inventory Health, Fine Revenue, Member Stats. | `GET /api/admin/reports/overdue`<br>`GET /api/admin/reports/most-borrowed`<br>`GET /api/admin/reports/inventory`<br>`GET /api/admin/reports/fines` |
| **13** | **Role-Based Access Control** | Token authentication & role authorization (`MEMBER`, `LIBRARIAN`, `ADMIN`). Clean 401 Unauthorized and 403 Forbidden responses. | Applied to all protected routes |

---

## 8. Business Rules & State Transition Model

1. **Issue Eligibility Validation**:
   - `member.status === 'ACTIVE'`
   - `member.membershipPlan.borrowingEnabled === true`
   - Active loans count $< \text{plan.maximumBooks}$
   - Unpaid fines $\le \text{plan.fineThreshold}$
   - No active loan of the exact same book (`DUPLICATE_LOAN` check)
   - `book.availableCopies > 0` and `book.status === 'AVAILABLE'`
2. **Return & Auto-Fine Calculation**:
   $$\text{overdueDays} = \max\left(0, \left\lceil \frac{\text{returnDate} - \text{dueDate}}{86,400,000} \right\rceil\right)$$
   $$\text{fine} = \text{overdueDays} \times \text{plan.finePerDay}$$
3. **Reservation Hold Queue FIFO**:
   - Holds are ordered by `requestedAt ASC`.
   - When an active loan is returned, the earliest `WAITING` hold transitions to `READY`, sets `expiresAt = now + 48 hours`, and sends a notification.
4. **Copy Count Invariant**:
   $$\text{availableCopies} + \text{issuedCopies} + \text{lostCopies} + \text{damagedCopies} \le \text{totalCopies}$$

---

## 9. Installation & Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **MongoDB**: Local MongoDB instance, MongoDB Atlas URI, or utilize the built-in **automatic in-memory fallback**.

### 1. Clone & Install Dependencies
```bash
cd "c:/Users/Jerusha/OneDrive/Desktop/newlnt"
npm install
```

### 2. Environment Configuration
Create a `.env` file from `.env.example`:
```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/digital_library
JWT_SECRET=super_secret_jwt_key_for_digital_library_system_2026
JWT_EXPIRES_IN=7d
DEFAULT_FINE_PER_DAY=5
DEFAULT_STUDENT_MAX_BOOKS=3
DEFAULT_STUDENT_LOAN_DAYS=14
DEFAULT_FACULTY_MAX_BOOKS=5
DEFAULT_FACULTY_LOAN_DAYS=30
HOLD_EXPIRATION_HOURS=48
```

### 3. Seed Demo Data
Populate 20 books, users, membership plans, sample active loans, overdue loans, holds, and fines:
```bash
npm run seed
```

### 4. Start the Application Server
```bash
npm start
```
The server will boot at **`http://localhost:5000`**.

---

## 10. Demo Credentials (For Evaluation)

The web UI contains a **1-Click Demo Switcher Bar** at the top. Alternatively, use these pre-seeded credentials:

| Role | Email | Password | Details |
|---|---|---|---|
| **ADMIN** | `admin@library.edu` | `Password123!` | System Administrator (Full Access) |
| **LIBRARIAN** | `sarah.librarian@library.edu` | `Password123!` | Chief Librarian (Circulation & Catalog) |
| **LIBRARIAN** | `david.librarian@library.edu` | `Password123!` | Staff Librarian |
| **MEMBER (Student)** | `alex.student@library.edu` | `Password123!` | Active student borrower |
| **MEMBER (Student)** | `emily.student@library.edu` | `Password123!` | Active student borrower |
| **MEMBER (Fines)** | `michael.student@library.edu` | `Password123!` | Student with outstanding overdue fines |
| **MEMBER (Faculty)** | `dr.robert@university.edu` | `Password123!` | Faculty member (30-day loans) |

---

## 11. Automated Testing

The project includes an automated test suite with **33 comprehensive tests** covering authentication, catalog CRUD, issue/return transactions, hold queues, fine calculations, RBAC, and MongoDB aggregation pipelines.

Run the test suite:
```bash
npm test
```

Test results output:
```
PASS tests/transactions.test.js
PASS tests/books.test.js
PASS tests/fines.test.js
PASS tests/holds.test.js
PASS tests/auth.test.js
PASS tests/reports.test.js

Test Suites: 6 passed, 6 total
Tests:       33 passed, 33 total
Snapshots:   0 total
Time:        63.865 s
```

---

## 12. Postman Collection Instructions

1. Open Postman.
2. Click **Import** -> Select `postman/Digital_Library_Management_System.postman_collection.json`.
3. Click **Import** -> Select `postman/Digital_Library_Local.postman_environment.json`.
4. Select the environment `Digital Library Local Environment` in Postman.
5. Execute requests sequentially across the 12 organized folders:
   - Folder `01 Authentication`: Login as Member, Librarian, Admin (tokens auto-save to environment).
   - Folder `02 Books` & `03 Search`: Catalog management and search tests.
   - Folder `04 Transactions`: Book issue, return, and duplicate checks.
   - Folder `05 Holds`: Waitlist queue and cancellation tests.
   - Folder `06 Membership` & `07 Fines`: Plan creation and fine payments.
   - Folder `09 Inventory` to `12 Admin`: Analytics reports, user management, and audit logs.

---

## 13. End-to-End Demonstration Workflow

A complete 5-minute evaluator walk-through:

1. **Step 1: Admin Governance**
   - Click **"Admin"** in the top demo bar.
   - View Executive Dashboard KPI cards and Chart.js analytics.
   - Navigate to **"User Management"** and **"Membership Plans"**.
2. **Step 2: Librarian Circulation**
   - Click **"Librarian"** in the top demo bar.
   - Navigate to **"Circulation Desk Workstation"**.
   - Select member `Alex Rivera` and book `Introduction to Algorithms` -> Click **"Issue Book"**.
   - Notice available copies reduce from 5 to 4.
3. **Step 3: Member Self-Service**
   - Click **"Student (Alex)"** in the top demo bar.
   - View **"My Dashboard"** -> View the newly active loan with calculated due date.
4. **Step 4: Overdue Return & Fine Payment**
   - Click **"Student (With Fines)"** -> View outstanding fine of $25.00 for `Database System Concepts`.
   - Click **"Pay Fine"** -> Enter $25.00 and confirm payment -> Status becomes **PAID**.
5. **Step 5: Business Rule Violations (Conflict Demonstrations)**
   - As Librarian, try issuing `Quantum Computation` (which is out of stock) -> System rejects with **`409 Conflict: BOOK_UNAVAILABLE`**.
   - Try issuing the same book twice to a member -> System rejects with **`409 Conflict: DUPLICATE_LOAN`**.
   - Attempt accessing admin reports without token -> System rejects with **`401 Unauthorized`**.

---

## 14. License & Academic Submission Notice

Developed for **University Digital Library Management (Project Code: P05)**. Built strictly in accordance with production software engineering standards, RESTful architectural principles, and academic evaluation guidelines.
