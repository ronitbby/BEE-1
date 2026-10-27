# 📚 Library Management System

A full-stack web application for managing a college library with role-based access control.

**Tech Stack:** Node.js · Express.js · MongoDB Atlas · React · Vite · Tailwind CSS · JWT

---

## 👥 Group Members

| Member | Role |
|--------|------|
| Member A | Backend Lead — Auth & Middleware |
| Member B | Backend — Books & Borrowing |
| Member C | Backend — Reservations, Admin & Tests |
| Member D | Frontend & Deployment |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18 LTS
- npm ≥ 9
- A free MongoDB Atlas account → https://mongodb.com/atlas

### Backend Setup

```bash
cd backend
cp .env.example .env        # Copy the template
# Open .env and fill in your MONGODB_URI and JWT_SECRET
npm install
npm run dev                 # Starts server with hot-reload on port 5000
```

### Frontend Setup *(coming in M11)*

```bash
cd frontend
npm install
npm run dev                 # Starts React on port 5173
```

---

## 🌐 API Base URL

- Development: `http://localhost:5000/api/v1`
- Production: `https://<your-render-app>.onrender.com/api/v1`

**Health check:** `GET /api/v1/health`

---

## 📁 Project Structure

```
BEE-1-main/
├── backend/         ← Express API (Node.js)
│   ├── config/      ← DB connection
│   ├── models/      ← Mongoose schemas
│   ├── middleware/  ← Auth & authorization
│   ├── routes/      ← URL definitions
│   ├── controllers/ ← Business logic
│   ├── utils/       ← Logger, helpers
│   ├── seed/        ← Demo data script
│   └── tests/       ← Jest + Supertest
└── frontend/        ← React app (coming in M11)
```

---

## 🔐 User Roles

| Role | Permissions |
|------|------------|
| Member | Browse catalogue, borrow/renew/return, view history, pay fines |
| Librarian | Issue/return books, manage reservations, view overdue list |
| Admin | All librarian permissions + manage users + view reports |

---

## 🌿 Git Workflow

```
main          ← production only
└── develop   ← integration branch
    ├── feature/auth
    ├── feature/books
    ├── feature/borrow
    ├── feature/reservations
    ├── feature/admin
    ├── feature/tests
    └── feature/frontend
```

---

## 📋 Implementation Progress

- [x] M1 — Project scaffold, Git, backend server, DB connection
- [ ] M2 — User model, registration, login, JWT, bcrypt
- [ ] M3 — Auth + role middleware
- [ ] M4 — Book CRUD + search/filter
- [ ] M5 — Borrow / Return / Renew
- [ ] M6 — Due dates, overdue, fines
- [ ] M7 — Reservations
- [ ] M8 — Admin reports
- [ ] M9 — Validation, error handling, logging
- [ ] M10 — Seed script + test suite
- [ ] M11–M14 — Frontend + Deployment
