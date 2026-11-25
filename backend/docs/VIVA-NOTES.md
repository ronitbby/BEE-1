# 📚 Library Management System — College Viva & Exam Notes

This guide provides beginner-friendly, plain-English explanations of all technologies, architecture patterns, and features implemented in this project so you can confidently answer any question in your practical viva evaluation.

---

## 1. 🏗️ High-Level System Architecture & Request Lifecycle

### The Complete Request Flow:
Whenever a user clicks a button on the screen, the data travels through this exact pipeline:

```
[React Frontend (Port 5173)]
         │
         ▼  (1) HTTP Request (e.g. GET /api/books or POST /api/borrows/issue)
            Includes Header: "Authorization: Bearer <JWT_TOKEN>"
[Express Router in server.js]
         │
         ▼  (2) Middleware Pipeline
            1. cors() -> Allows frontend to communicate with backend
            2. express.json() -> Parses incoming JSON body
            3. protect() -> Decodes JWT, verifies signature, finds user in MongoDB
            4. restrictTo('librarian', 'admin') -> Checks if user.role is authorized
         │
         ▼  (3) Route Handler Function (Controller Logic)
            Validates inputs (e.g. checks if book copies are available)
         │
         ▼  (4) Mongoose Model (e.g. Book.findById(), Borrow.create())
            Validates schema types (String, Number, ObjectId, Date)
         │
         ▼  (5) MongoDB Atlas Cloud Database
            Executes read/write query on collection
         │
         ▲  (6) JSON Response
            Sent back with HTTP status code (200 OK, 201 Created, 401 Unauthorized, 403 Forbidden)
         │
[React Frontend Updates State (useState)]
         │
         ▼  (7) UI Re-renders automatically in the browser
```

---

## 2. 🔑 Core Concepts Explained for Viva

### Q1: What is JWT (JSON Web Token)?
* **Definition:** A compact, URL-safe string used to securely transmit claims between a client and a server.
* **Why we use it:** It enables **stateless authentication**. The server doesn't have to keep a session table in memory. Once the user logs in, the server gives them a signed token. On every subsequent request, the client sends this token in the header (`Authorization: Bearer <token>`).
* **The 3 Parts of a JWT:**
  1. **Header:** Algorithm used (`HS256`).
  2. **Payload:** Data stored inside the token (`id`, `name`, `email`, `role`).
  3. **Signature:** `HMACSHA256(header + payload, secretKey)`. Prevents tampering — if anyone alters the role in the payload, the signature becomes invalid!

### Q2: What is bcrypt and why do we hash passwords?
* **Definition:** A one-way adaptive cryptographic hashing function.
* **Why not plain text?** If the database is compromised, plain text passwords would expose user accounts.
* **Why one-way?** A hash cannot be decrypted back into the original password.
* **How verification works:** When a user logs in, `bcrypt.compare(enteredPassword, storedHash)` hashes the entered password with the stored salt and checks if both hashes match.
* **Salt rounds:** We use `10` salt rounds, which adds random data to the password before hashing to defeat dictionary attacks and rainbow tables.

### Q3: What is Middleware in Express?
* **Definition:** A function that runs in the middle — after a request arrives at the server, but before the final route handler sends back a response.
* **Signature:** `(req, res, next) => { ... }`
* **What `next()` does:** Passes control to the next middleware or route handler in the chain. If a check fails (e.g., token is invalid), the middleware sends an error response immediately and does NOT call `next()`.

### Q4: What is the difference between Authentication and Authorization?
* **Authentication (AuthN):** *"Who are you?"*
  - Example: Logging in with email and password to prove your identity.
* **Authorization (AuthZ):** *"What are you allowed to do?"*
  - Example: A Member is logged in (authenticated), but they are NOT authorized to delete books or promote users (only Admins can do that).

### Q5: What is Role-Based Access Control (RBAC)?
* Our system defines three distinct user roles:
  1. **Member:** Public college student/patron. Can search books, view their active loans, history, and reserve titles.
  2. **Librarian:** Library staff. Can catalog books, issue loans, renew loans, return books, and view overdue logs.
  3. **Admin:** System administrator. Can view overall analytics, audit late fines, change user roles, and activate/deactivate accounts.
* **Security Rule:** Roles are enforced on the backend via the `restrictTo()` middleware. Even if a user alters the frontend JavaScript code, the backend blocks unauthorized API requests with `HTTP 403 Forbidden`.

### Q6: What is CRUD?
CRUD represents the four fundamental operations of any database system:
| Operation | HTTP Verb | Example Route | Description |
| :--- | :--- | :--- | :--- |
| **C**reate | `POST` | `/api/books` | Add a new book to the catalog |
| **R**ead | `GET` | `/api/books` | Fetch books from MongoDB |
| **U**pdate | `PUT` / `PATCH` | `/api/books/:id` | Modify book details or archive status |
| **D**elete | `DELETE` | `/api/books/:id` | Remove a book document from the database |

---

## 3. 🖥️ The Three Dashboard Workflows

### 1. Member Dashboard Workflow
1. **Catalog Browsing:** Fetches all non-archived books via `GET /api/books`. Instant client-side search filters by title, author, or genre.
2. **Book Reservation:** If a member wants a book, clicking "Reserve This Book" triggers `POST /api/reservations`. The server creates a reservation record tied to `req.user._id`.
3. **Active Loans & Due Dates:** `GET /api/borrows/my` returns books issued to this member. If `dueDate < today`, the backend dynamically calculates late fees:
   $$\text{Fine} = \text{Days Overdue} \times \text{₹2/day}$$
4. **Borrowing History:** Displays returned books (`status: 'returned'`) with their past return timestamps.

### 2. Librarian Dashboard Workflow
1. **Catalog Management:**
   - **Add Book:** `POST /api/books` saves new book documents.
   - **Edit Book:** `PUT /api/books/:id` updates title, author, copies.
   - **Archive Book:** `PATCH /api/books/:id/archive` toggles `isArchived: true`. The book is hidden from members without breaking historical loan records!
   - **Delete Book:** `DELETE /api/books/:id` removes book permanently.
2. **Issue Book:** `POST /api/borrows/issue` creates a borrow record, calculates a 14-day due date, decrements `available` copies, and increments `borrowCount`.
3. **Renew Book:** `PATCH /api/borrows/:id/renew` extends the loan period by another 14 days and tracks `renewCount`.
4. **Return Book:** `PATCH /api/borrows/:id/return` marks the loan as returned, calculates final fine if late, and increments `available` copies on the shelf.
5. **Overdue Tracking:** `GET /api/borrows/overdue` finds all active loans with past due dates and lists borrowers with accrued fines.

### 3. Admin Dashboard Workflow
1. **System Statistics:** `GET /api/admin/stats` runs MongoDB aggregations:
   - Total users partitioned by role (Members, Librarians, Admins).
   - Total book titles (active vs archived).
   - Active loans vs returned loans.
   - Total accrued late fines.
   - Top 5 popular books ranked by `borrowCount`.
2. **User & Role Management:** `GET /api/admin/users` displays all accounts.
   - **Promote / Demote:** `PATCH /api/admin/users/:id/role` alters a user's role. Admins cannot demote themselves to prevent system lockouts.
   - **Activate / Deactivate:** `PATCH /api/admin/users/:id/status` toggles `isActive`. Deactivated users are blocked from logging in.

---

## 4. 🧪 Demo Accounts for Viva Evaluation

Use these pre-seeded accounts during your demonstration:

| Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| 👑 **Admin** | `admin@library.com` | `admin123` | Full control: system overview, user roles, deactivations, reports |
| 📚 **Librarian** | `librarian@library.com` | `librarian123` | Book cataloging, book issuance, returns, renewals, overdue audit |
| 👤 **Member** | `member@library.com` | `member123` | Book browsing, personal loans, overdue fee viewing, book reservations |

---

## 5. 💻 MacBook Startup Commands

To start the project from scratch on macOS:

```bash
# 1. Open Terminal 1 — Start the Backend API (Port 3001)
cd backend
npm run dev

# 2. Open Terminal 2 — Start the React Frontend (Port 5173)
cd frontend
npm run dev

# 3. (Optional) Re-seed fresh demo data anytime:
cd backend
node seed.js
```
Open **`http://localhost:5173`** in your browser to test!

