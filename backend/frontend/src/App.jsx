import { useState, useEffect } from 'react'
import LandingPage from './LandingPage.jsx'
import './App.css'

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function checkOverdue(dueDate) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('lib_token') || null)
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lib_user')) || null
    } catch {
      return null
    }
  })

  const [view, setView] = useState(() => (user ? 'dashboard' : 'landing'))
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authError, setAuthError] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)

  const [activeTab, setActiveTab] = useState('browse')
  const [dbStatus, setDbStatus] = useState('...')
  const [alertMsg, setAlertMsg] = useState(null)

  const [books, setBooks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [myBorrows, setMyBorrows] = useState({ active: [], history: [], totalFine: 0 })
  const [myReservations, setMyReservations] = useState([])
  const [allBorrows, setAllBorrows] = useState([])
  const [overdueBorrows, setOverdueBorrows] = useState([])
  const [adminStats, setAdminStats] = useState(null)
  const [allUsers, setAllUsers] = useState([])

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [issueBookTarget, setIssueBookTarget] = useState(null)

  function showAlert(msg, type = 'info') {
    setAlertMsg({ text: msg, type })
    setTimeout(() => setAlertMsg(null), 5000)
  }

  const apiCall = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }

    try {
      const response = await fetch(url, { ...options, headers })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`)
      }
      return data
    } catch (err) {
      console.error(`API Error on ${url}:`, err.message)
      throw err
    }
  }

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setDbStatus(data.database || 'Connected')
    } catch {
      setDbStatus('Offline')
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const loadBooks = async () => {
    try {
      const isStaff = user && (user.role === 'librarian' || user.role === 'admin')
      const query = isStaff ? '?includeArchived=true' : ''
      const data = await apiCall(`/api/books${query}`)
      setBooks(data)
    } catch (err) {
      showAlert(err.message, 'error')
    }
  }

  const loadMemberData = async () => {
    if (!token || user?.role !== 'member') return
    try {
      const borrowsData = await apiCall('/api/borrows/my')
      setMyBorrows(borrowsData)
      const resData = await apiCall('/api/reservations/my')
      setMyReservations(resData)
    } catch (err) {
      console.error(err)
    }
  }

  const loadLibrarianData = async () => {
    if (!token || (user?.role !== 'librarian' && user?.role !== 'admin')) return
    try {
      const borrows = await apiCall('/api/borrows/all')
      setAllBorrows(borrows)
      const overdues = await apiCall('/api/borrows/overdue')
      setOverdueBorrows(overdues)
    } catch (err) {
      console.error(err)
    }
  }

  const loadAdminData = async () => {
    if (!token || user?.role !== 'admin') return
    try {
      const stats = await apiCall('/api/admin/stats')
      setAdminStats(stats)
      const users = await apiCall('/api/admin/users')
      setAllUsers(users)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadBooks()
    if (user?.role === 'member') loadMemberData()
    if (user?.role === 'librarian' || user?.role === 'admin') loadLibrarianData()
    if (user?.role === 'admin') loadAdminData()
  }, [user, activeTab])

  // ── 8. Authentication Handlers ───────────────────────────────────────────────

  const handleLogin = async (e) => {
    if (e) e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Login failed')

      // Save to localStorage
      localStorage.setItem('lib_token', data.token)
      localStorage.setItem('lib_user', JSON.stringify(data.user))

      setToken(data.token)
      setUser(data.user)
      setView('dashboard')
      setActiveTab(data.user.role === 'admin' ? 'stats' : data.user.role === 'librarian' ? 'manage' : 'browse')
      showAlert(`Welcome back, ${data.user.name}! (${data.user.role.toUpperCase()})`, 'success')
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Registration failed')

      localStorage.setItem('lib_token', data.token)
      localStorage.setItem('lib_user', JSON.stringify(data.user))

      setToken(data.token)
      setUser(data.user)
      setView('dashboard')
      setActiveTab('browse')
      showAlert('Account registered successfully! You are logged in as a Member.', 'success')
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('lib_token')
    localStorage.removeItem('lib_user')
    setToken(null)
    setUser(null)
    setView('landing')
    setActiveTab('browse')
    showAlert('You have logged out successfully.', 'info')
  }

  // Quick 1-click test login for viva demonstrations
  const handleQuickLogin = (email, password) => {
    setAuthForm({ email, password, name: '' })
    // Directly submit login with these credentials
    setAuthLoading(true)
    setAuthError(null)
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status !== 200) throw new Error(data.error || 'Quick login failed')
        localStorage.setItem('lib_token', data.token)
        localStorage.setItem('lib_user', JSON.stringify(data.user))
        setToken(data.token)
        setUser(data.user)
        setView('dashboard')
        setActiveTab(data.user.role === 'admin' ? 'stats' : data.user.role === 'librarian' ? 'manage' : 'browse')
        showAlert(`Logged in as ${data.user.name} (${data.user.role.toUpperCase()})`, 'success')
      })
      .catch(err => setAuthError(err.message))
      .finally(() => setAuthLoading(false))
  }

  // Quick pre-fill when clicking a role card on the 3D Landing Page
  const handleRoleSelectFromLanding = (role) => {
    setView('auth')
    setAuthMode('login')
    setAuthError(null)
    if (role === 'member') {
      setAuthForm({ email: 'member@library.com', password: 'member123', name: '' })
    } else if (role === 'librarian') {
      setAuthForm({ email: 'librarian@library.com', password: 'librarian123', name: '' })
    } else if (role === 'admin') {
      setAuthForm({ email: 'admin@library.com', password: 'admin123', name: '' })
    }
  }

  // ── 9. Member Actions ────────────────────────────────────────────────────────
  const handleReserveBook = async (book) => {
    try {
      await apiCall('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ bookId: book._id })
      })
      showAlert(`Successfully reserved "${book.title}"!`, 'success')
      loadMemberData()
    } catch (err) {
      showAlert(err.message, 'error')
    }
  }

  const handleCancelReservation = async (reservationId) => {
    try {
      await apiCall(`/api/reservations/${reservationId}`, { method: 'DELETE' })
      showAlert('Reservation cancelled.', 'info')
      loadMemberData()
    } catch (err) {
      showAlert(err.message, 'error')
    }
  }

  // ── 10. Librarian Actions ────────────────────────────────────────────────────
  const handleArchiveBook = async (bookId) => {
    try {
      const res = await apiCall(`/api/books/${bookId}/archive`, { method: 'PATCH' })
      showAlert(res.message, 'success')
      loadBooks()
    } catch (err) {
      showAlert(err.message, 'error')
    }
  }

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to permanently delete this book from the library?')) return
    try {
      await apiCall(`/api/books/${bookId}`, { method: 'DELETE' })
      showAlert('Book deleted from system.', 'success')
      loadBooks()
    } catch (err) {
      showAlert(err.message, 'error')
    }
  }

  const handleReturnBook = async (borrowId) => {
    try {
      const res = await apiCall(`/api/borrows/${borrowId}/return`, { method: 'PATCH' })
      showAlert(`Book returned successfully! ${res.finePaid > 0 ? `Fine paid: ₹${res.finePaid}` : ''}`, 'success')
      loadBooks()
      loadLibrarianData()
    } catch (err) {
      showAlert(err.message, 'error')
    }
  }

  const handleRenewBook = async (borrowId) => {
    try {
      const res = await apiCall(`/api/borrows/${borrowId}/renew`, { method: 'PATCH' })
      showAlert(res.message, 'success')
      loadLibrarianData()
    } catch (err) {
      showAlert(err.message, 'error')
    }
  }

  // ── 11. Admin Actions ────────────────────────────────────────────────────────
  const handleChangeRole = async (userId, newRole) => {
    try {
      await apiCall(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      })
      showAlert(`User role updated to ${newRole.toUpperCase()}`, 'success')
      loadAdminData()
    } catch (err) {
      showAlert(err.message, 'error')
    }
  }

  const handleToggleUserStatus = async (userId) => {
    try {
      const res = await apiCall(`/api/admin/users/${userId}/status`, { method: 'PATCH' })
      showAlert(res.message, 'success')
      loadAdminData()
    } catch (err) {
      showAlert(err.message, 'error')
    }
  }

  // Filter books by search query
  const filteredBooks = books.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.genre || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Landing page view
  if (!user && view === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => {
          setView('auth')
          setAuthMode('register')
          setAuthError(null)
        }}
        onLogin={() => {
          setView('auth')
          setAuthMode('login')
          setAuthError(null)
        }}
        onGuestBrowse={() => {
          setView('dashboard')
          setActiveTab('guest_browse')
        }}
        onRoleSelect={handleRoleSelectFromLanding}
      />
    )
  }

  // Authentication view (Login or Register)
  if (!user && (view === 'auth' || activeTab !== 'guest_browse')) {
    return (
      <div className="auth-wrapper">
        <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
          <button
            type="button"
            onClick={() => setView('landing')}
            style={{
              background: 'none',
              border: 'none',
              color: '#1e3a5f',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.88rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            ← Back to Home
          </button>
        </div>

        <div className="auth-header">
          <h2>📚 City Library Portal</h2>
          <p>Role-Based Library Management System</p>
        </div>

        {/* Toggle between Login and Register */}
        <div className="auth-toggle-bar">
          <button
            className={`auth-toggle-btn ${authMode === 'login' ? 'active' : ''}`}
            onClick={() => { setAuthMode('login'); setAuthError(null); }}
          >
            Sign In
          </button>
          <button
            className={`auth-toggle-btn ${authMode === 'register' ? 'active' : ''}`}
            onClick={() => { setAuthMode('register'); setAuthError(null); }}
          >
            Register
          </button>
        </div>

        {authError && (
          <div className="alert-banner alert-error">
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
          {authMode === 'register' && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                className="form-control"
                required
                placeholder="e.g. Ronit Khanna"
                value={authForm.name}
                onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              required
              placeholder="e.g. member@library.com"
              value={authForm.email}
              onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              required
              placeholder="••••••••"
              value={authForm.password}
              onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.75rem' }} disabled={authLoading}>
            {authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In to Dashboard' : 'Register (Member Account)'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <button
            onClick={() => {
              setView('dashboard')
              setActiveTab('guest_browse')
            }}
            style={{ background: 'none', border: 'none', color: '#1e3a5f', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
          >
            Browse Public Catalog as Guest →
          </button>
        </div>

        {/* ── Quick Demo Login Buttons for Viva ── */}
        <div className="quick-login-box">
          <h4>🎓 1-Click Role Login for Viva Evaluation:</h4>
          <div className="quick-login-buttons">
            <button
              type="button"
              className="btn-quick"
              onClick={() => handleQuickLogin('member@library.com', 'member123')}
            >
              👤 Member
            </button>
            <button
              type="button"
              className="btn-quick"
              onClick={() => handleQuickLogin('librarian@library.com', 'librarian123')}
            >
              📚 Librarian
            </button>
            <button
              type="button"
              className="btn-quick"
              onClick={() => handleQuickLogin('admin@library.com', 'admin123')}
            >
              👑 Admin
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main dashboard view
  return (
    <>
      {/* ── Top System Bar ── */}
      <div className="status-bar">
        <div>
          MongoDB: <span className={dbStatus === 'Connected' ? 'online' : 'offline'}>● {dbStatus}</span>
          &nbsp;|&nbsp; Backend: Port 3001 &nbsp;|&nbsp; Frontend: Port 5173
        </div>
        <div>
          Security: JWT Verified &nbsp;|&nbsp; Password: bcrypt Encrypted
        </div>
      </div>

      {/* ── Navbar ── */}
      <header className="navbar">
        <div className="nav-brand">
          <h1>📚 City Library</h1>
          {user ? (
            <span className={`role-badge role-${user.role}`}>
              {user.role}
            </span>
          ) : (
            <span className="role-badge role-member">Guest Mode</span>
          )}
        </div>

        <div className="nav-user-actions">
          {user ? (
            <>
              <button className="btn-nav" onClick={() => setView('landing')} title="View 3D Landing Page">🏛️ Landing Page</button>
              <span className="nav-user-info">Logged in as: <strong>{user.name}</strong></span>
              <button className="btn-nav btn-logout" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button className="btn-nav" onClick={() => setView('landing')} title="Return to Landing Page">🏛️ Home / Landing</button>
              <button className="btn-nav" onClick={() => { setView('auth'); setAuthMode('login'); }}>Sign In / Register</button>
            </>
          )}
        </div>
      </header>

      {/* ── Sub Navigation Tabs (Dynamic Based on Role) ── */}
      <nav className="dashboard-tabs">
        {/* MEMBER TABS */}
        {(!user || user.role === 'member') && (
          <>
            <button
              className={`tab-btn ${activeTab === 'browse' || activeTab === 'guest_browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              📚 Browse Books
            </button>
            {user && (
              <>
                <button
                  className={`tab-btn ${activeTab === 'my_borrows' ? 'active' : ''}`}
                  onClick={() => setActiveTab('my_borrows')}
                >
                  📖 My Borrowed ({myBorrows.active.length})
                </button>
                <button
                  className={`tab-btn ${activeTab === 'my_history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('my_history')}
                >
                  📜 Borrowing History
                </button>
                <button
                  className={`tab-btn ${activeTab === 'my_fines' ? 'active' : ''}`}
                  onClick={() => setActiveTab('my_fines')}
                >
                  💰 Fines & Reservations ({myReservations.length})
                </button>
              </>
            )}
          </>
        )}

        {/* LIBRARIAN TABS */}
        {user?.role === 'librarian' && (
          <>
            <button
              className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              📚 Manage Books ({books.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'circulation' ? 'active' : ''}`}
              onClick={() => setActiveTab('circulation')}
            >
              ⚡ Issue & Return
            </button>
            <button
              className={`tab-btn ${activeTab === 'overdue' ? 'active' : ''}`}
              onClick={() => setActiveTab('overdue')}
            >
              ⚠️ Overdue Tracking ({overdueBorrows.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'all_records' ? 'active' : ''}`}
              onClick={() => setActiveTab('all_records')}
            >
              📋 All Member Records
            </button>
          </>
        )}

        {/* ADMIN TABS */}
        {user?.role === 'admin' && (
          <>
            <button
              className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              📊 System Overview
            </button>
            <button
              className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 Manage Users & Roles ({allUsers.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              📚 Book Catalog
            </button>
            <button
              className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              📈 Popular Books & Reports
            </button>
          </>
        )}
      </nav>

      {/* ── Main Content Container ── */}
      <main className="main-content">
        {alertMsg && (
          <div className={`alert-banner alert-${alertMsg.type}`}>
            <span>{alertMsg.text}</span>
            <button
              onClick={() => setAlertMsg(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab: Browse & Search Books */}
        {(activeTab === 'browse' || activeTab === 'guest_browse') && (
          <section>
            <div className="section-header">
              <h2>📚 Library Catalog</h2>
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Showing {filteredBooks.length} available books
              </span>
            </div>

            <input
              type="text"
              className="search-input-box"
              placeholder="🔍 Search books by title, author, or genre..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />

            {filteredBooks.length === 0 ? (
              <div className="empty-placeholder">No matching books found.</div>
            ) : (
              <div className="books-container">
                {filteredBooks.map(book => (
                  <div className="book-card-item" key={book._id}>
                    <div className="book-cover-banner" style={{ background: book.coverColor || '#1e3a5f' }}>
                      📖
                      {book.isArchived && <span className="archived-ribbon">Archived</span>}
                    </div>

                    <div className="book-details">
                      <div className="book-title">{book.title}</div>
                      <div className="book-author">by {book.author}</div>
                      <span className="book-genre-pill">{book.genre}</span>

                      <div className="book-availability">
                        <span>Availability:</span>
                        <span className={book.available > 0 ? 'avail-badge-yes' : 'avail-badge-no'}>
                          {book.available > 0 ? `${book.available} / ${book.totalCopies}` : 'Out of Stock'}
                        </span>
                      </div>

                      {user && user.role === 'member' && (
                        <div className="book-action-row" style={{ marginTop: '0.5rem' }}>
                          <button
                            className="btn btn-blue btn-sm"
                            style={{ width: '100%' }}
                            onClick={() => handleReserveBook(book)}
                          >
                            🔖 Reserve This Book
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab: Member Loans */}
        {activeTab === 'my_borrows' && (
          <section>
            <div className="section-header">
              <h2>📖 My Current Loans</h2>
              {myBorrows.totalFine > 0 && (
                <span className="fine-amount">⚠️ Total Pending Fine: ₹{myBorrows.totalFine}</span>
              )}
            </div>

            {myBorrows.active.length === 0 ? (
              <div className="empty-placeholder">You have no active loans right now.</div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>Borrowed On</th>
                      <th>Due Date</th>
                      <th>Fine Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myBorrows.active.map(b => {
                      const isOverdue = checkOverdue(b.dueDate)
                      return (
                        <tr key={b._id}>
                          <td><strong>{b.bookId?.title || 'Unknown Title'}</strong></td>
                          <td>{formatDate(b.borrowedOn)}</td>
                          <td className={isOverdue ? 'overdue-tag' : ''}>
                            {formatDate(b.dueDate)} {isOverdue && '⚠️ OVERDUE'}
                          </td>
                          <td>
                            {b.currentFine > 0 ? (
                              <span className="fine-amount">₹{b.currentFine} accrued</span>
                            ) : (
                              <span className="active-tag">No Fine (On Time)</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tab: Member Borrowing History */}
        {activeTab === 'my_history' && (
          <section>
            <div className="section-header">
              <h2>📜 Borrowing History</h2>
            </div>

            {myBorrows.history.length === 0 ? (
              <div className="empty-placeholder">No past return records found.</div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>Borrowed Date</th>
                      <th>Due Date</th>
                      <th>Returned Date</th>
                      <th>Fine Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myBorrows.history.map(b => (
                      <tr key={b._id}>
                        <td><strong>{b.bookId?.title || '—'}</strong></td>
                        <td>{formatDate(b.borrowedOn)}</td>
                        <td>{formatDate(b.dueDate)}</td>
                        <td><span className="active-tag">{formatDate(b.returnedOn)}</span></td>
                        <td>₹{b.fine || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tab: Member Fines & Reservations */}
        {activeTab === 'my_fines' && (
          <section>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-icon">💰</div>
                <div className="stat-data">
                  <h4>₹{myBorrows.totalFine}</h4>
                  <p>Current Pending Fines (₹2 / day overdue)</p>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-icon">🔖</div>
                <div className="stat-data">
                  <h4>{myReservations.length}</h4>
                  <p>Active Book Reservations</p>
                </div>
              </div>
            </div>

            <div className="section-header" style={{ marginTop: '1.5rem' }}>
              <h2>Active Reservations</h2>
            </div>

            {myReservations.length === 0 ? (
              <div className="empty-placeholder">You have no active reservations. Reserve any book from the catalog!</div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>Reserved On</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myReservations.map(res => (
                      <tr key={res._id}>
                        <td><strong>{res.bookTitle}</strong></td>
                        <td>{formatDate(res.reservedAt)}</td>
                        <td><span className="active-tag">{res.status.toUpperCase()}</span></td>
                        <td>
                          <button
                            className="btn btn-red btn-sm"
                            onClick={() => handleCancelReservation(res._id)}
                          >
                            Cancel Reservation
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tab: Manage Books */}
        {activeTab === 'manage' && (
          <section>
            <div className="section-header">
              <h2>📚 Book Catalog Management</h2>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                ➕ Add New Book
              </button>
            </div>

            <input
              type="text"
              className="search-input-box"
              placeholder="🔍 Search catalog..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />

            <div className="books-container">
              {filteredBooks.map(book => (
                <div className="book-card-item" key={book._id}>
                  <div className="book-cover-banner" style={{ background: book.coverColor || '#1e3a5f' }}>
                    📖
                    {book.isArchived && <span className="archived-ribbon">Archived</span>}
                  </div>

                  <div className="book-details">
                    <div className="book-title">{book.title}</div>
                    <div className="book-author">by {book.author}</div>
                    <span className="book-genre-pill">{book.genre}</span>

                    <div className="book-availability">
                      <span>Available:</span>
                      <strong>{book.available} / {book.totalCopies}</strong>
                    </div>

                    <div className="book-action-row">
                      <button
                        className="btn btn-blue btn-sm"
                        onClick={() => { setIssueBookTarget(book); setShowIssueModal(true); }}
                        disabled={book.available < 1 || book.isArchived}
                      >
                        Issue
                      </button>
                      <button
                        className="btn btn-amber btn-sm"
                        onClick={() => setEditingBook(book)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-slate btn-sm"
                        onClick={() => handleArchiveBook(book._id)}
                      >
                        {book.isArchived ? 'Restore' : 'Archive'}
                      </button>
                      <button
                        className="btn btn-red btn-sm"
                        onClick={() => handleDeleteBook(book._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab: Issue & Return */}
        {activeTab === 'circulation' && (
          <section>
            <div className="section-header">
              <h2>⚡ Active Loans & Returns</h2>
              <button
                className="btn btn-green"
                onClick={() => { setIssueBookTarget(null); setShowIssueModal(true); }}
              >
                ➕ Issue Book to Member
              </button>
            </div>

            {allBorrows.filter(b => b.status === 'borrowed').length === 0 ? (
              <div className="empty-placeholder">No active loans found.</div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Book</th>
                      <th>Borrower</th>
                      <th>Issued On</th>
                      <th>Due Date</th>
                      <th>Renews</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBorrows.filter(b => b.status === 'borrowed').map(b => {
                      const isOverdue = checkOverdue(b.dueDate)
                      return (
                        <tr key={b._id}>
                          <td><strong>{b.bookId?.title || '—'}</strong></td>
                          <td>{b.borrowerName}</td>
                          <td>{formatDate(b.borrowedOn)}</td>
                          <td className={isOverdue ? 'overdue-tag' : ''}>
                            {formatDate(b.dueDate)} {isOverdue && `(₹${b.currentFine} Fine)`}
                          </td>
                          <td>{b.renewCount || 0} times</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                className="btn btn-green btn-sm"
                                onClick={() => handleReturnBook(b._id)}
                              >
                                Return Book
                              </button>
                              <button
                                className="btn btn-amber btn-sm"
                                onClick={() => handleRenewBook(b._id)}
                              >
                                Renew (+14d)
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tab: Overdue Tracking */}
        {activeTab === 'overdue' && (
          <section>
            <div className="section-header">
              <h2>⚠️ Overdue Books & Fine Audit</h2>
              <span className="overdue-tag">Total Overdue: {overdueBorrows.length}</span>
            </div>

            {overdueBorrows.length === 0 ? (
              <div className="empty-placeholder">🎉 Excellent! No books are currently overdue.</div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>Borrower Name</th>
                      <th>Due Date</th>
                      <th>Days Overdue</th>
                      <th>Accrued Fine (₹2/day)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueBorrows.map(b => (
                      <tr key={b._id}>
                        <td><strong>{b.bookId?.title || '—'}</strong></td>
                        <td>{b.borrowerName}</td>
                        <td className="overdue-tag">{formatDate(b.dueDate)}</td>
                        <td><strong>{b.daysOverdue} days</strong></td>
                        <td><span className="fine-amount">₹{b.currentFine}</span></td>
                        <td>
                          <button
                            className="btn btn-green btn-sm"
                            onClick={() => handleReturnBook(b._id)}
                          >
                            Collect & Return
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tab: All Borrowing Records */}
        {activeTab === 'all_records' && (
          <section>
            <div className="section-header">
              <h2>📋 All Member Borrowing Records</h2>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Borrower</th>
                    <th>Status</th>
                    <th>Issued Date</th>
                    <th>Due Date</th>
                    <th>Returned Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allBorrows.map(b => (
                    <tr key={b._id}>
                      <td><strong>{b.bookId?.title || '—'}</strong></td>
                      <td>{b.borrowerName}</td>
                      <td>
                        <span className={b.status === 'borrowed' ? 'overdue-tag' : 'active-tag'}>
                          {b.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{formatDate(b.borrowedOn)}</td>
                      <td>{formatDate(b.dueDate)}</td>
                      <td>{b.returnedOn ? formatDate(b.returnedOn) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tab: System Overview */}
        {activeTab === 'stats' && adminStats && (
          <section>
            <div className="section-header">
              <h2>📊 Library System Overview</h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Data fetched live from MongoDB Atlas</span>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-icon">👥</div>
                <div className="stat-data">
                  <h4>{adminStats.users.total}</h4>
                  <p>Total Registered Users ({adminStats.users.members} Members, {adminStats.users.librarians} Staff)</p>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon">📚</div>
                <div className="stat-data">
                  <h4>{adminStats.books.total}</h4>
                  <p>Total Books ({adminStats.books.active} Active, {adminStats.books.archived} Archived)</p>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon">📖</div>
                <div className="stat-data">
                  <h4>{adminStats.circulation.activeIssues}</h4>
                  <p>Active Issues ({adminStats.circulation.totalReturned} Past Returns)</p>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon">💰</div>
                <div className="stat-data">
                  <h4>₹{adminStats.circulation.totalFines}</h4>
                  <p>Accrued Fines ({adminStats.circulation.overdueIssues} Overdue Books)</p>
                </div>
              </div>
            </div>

            <div className="section-header" style={{ marginTop: '2rem' }}>
              <h2>🔥 Most Popular Books (Most Borrowed)</h2>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Book Title</th>
                    <th>Author</th>
                    <th>Genre</th>
                    <th>Borrow Count</th>
                  </tr>
                </thead>
                <tbody>
                  {adminStats.popularBooks.map((b, idx) => (
                    <tr key={b._id}>
                      <td><strong>#{idx + 1}</strong></td>
                      <td><strong>{b.title}</strong></td>
                      <td>{b.author}</td>
                      <td><span className="book-genre-pill">{b.genre}</span></td>
                      <td><span className="active-tag">{b.borrowCount || 0} times</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tab: User Management */}
        {activeTab === 'users' && (
          <section>
            <div className="section-header">
              <h2>👥 Manage User Accounts & Permissions</h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Only Admins can elevate or change user roles</span>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Current Role</th>
                    <th>Change Role</th>
                    <th>Account Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map(u => (
                    <tr key={u._id}>
                      <td><strong>{u.name}</strong></td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-badge role-${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-control"
                          style={{ padding: '0.3rem 0.5rem', width: 'auto' }}
                          value={u.role}
                          disabled={u._id === user.id} // Cannot change own role
                          onChange={e => handleChangeRole(u._id, e.target.value)}
                        >
                          <option value="member">member</option>
                          <option value="librarian">librarian</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>
                        <span className={u.isActive ? 'active-tag' : 'overdue-tag'}>
                          {u.isActive ? '● Active' : '● Deactivated'}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`btn ${u.isActive ? 'btn-red' : 'btn-green'} btn-sm`}
                          disabled={u._id === user.id} // Cannot deactivate own account
                          onClick={() => handleToggleUserStatus(u._id)}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tab: Circulation Reports */}
        {activeTab === 'reports' && adminStats && (
          <section>
            <div className="section-header">
              <h2>📈 Library Circulation Reports</h2>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Total Active Members</strong></td>
                    <td>{adminStats.users.members}</td>
                    <td>Registered patrons eligible to borrow library books</td>
                  </tr>
                  <tr>
                    <td><strong>Library Staff Members</strong></td>
                    <td>{adminStats.users.librarians}</td>
                    <td>Staff members handling book checkouts and cataloging</td>
                  </tr>
                  <tr>
                    <td><strong>System Administrators</strong></td>
                    <td>{adminStats.users.admins}</td>
                    <td>Users with complete administrative and role privileges</td>
                  </tr>
                  <tr>
                    <td><strong>Total Shelf Volume</strong></td>
                    <td>{adminStats.books.total} titles</td>
                    <td>Complete catalog volume in MongoDB database</td>
                  </tr>
                  <tr>
                    <td><strong>Archived Titles</strong></td>
                    <td>{adminStats.books.archived}</td>
                    <td>Retired or preserved books hidden from public catalog</td>
                  </tr>
                  <tr>
                    <td><strong>Total Accrued Fines</strong></td>
                    <td><span className="fine-amount">₹{adminStats.circulation.totalFines}</span></td>
                    <td>Total outstanding late fees due from overdue borrowers</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Modal: Add Book */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>➕ Add Book to Catalog</h3>
              <button className="btn-close-modal" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.target)
              try {
                await apiCall('/api/books', {
                  method: 'POST',
                  body: JSON.stringify({
                    title: fd.get('title'),
                    author: fd.get('author'),
                    genre: fd.get('genre'),
                    totalCopies: Number(fd.get('totalCopies')),
                    coverColor: fd.get('coverColor'),
                  })
                })
                showAlert('Book added successfully!', 'success')
                setShowAddModal(false)
                loadBooks()
              } catch (err) {
                showAlert(err.message, 'error')
              }
            }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input name="title" required className="form-control" placeholder="Book title" />
                </div>
                <div className="form-group">
                  <label>Author</label>
                  <input name="author" required className="form-control" placeholder="Author name" />
                </div>
                <div className="form-group">
                  <label>Genre</label>
                  <select name="genre" className="form-control">
                    <option>Fiction</option>
                    <option>Non-Fiction</option>
                    <option>Technology</option>
                    <option>Science</option>
                    <option>History</option>
                    <option>Finance</option>
                    <option>Self-Help</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Total Copies</label>
                  <input name="totalCopies" type="number" min="1" defaultValue="3" className="form-control" />
                </div>
                <div className="form-group">
                  <label>Cover Color</label>
                  <input name="coverColor" type="color" defaultValue="#1e3a5f" className="form-control" />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '1rem 1.5rem', background: '#f8fafc' }}>
                <button type="button" className="btn btn-slate" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Book</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Book */}
      {editingBook && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>✏️ Edit Book Details</h3>
              <button className="btn-close-modal" onClick={() => setEditingBook(null)}>✕</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.target)
              try {
                await apiCall(`/api/books/${editingBook._id}`, {
                  method: 'PUT',
                  body: JSON.stringify({
                    title: fd.get('title'),
                    author: fd.get('author'),
                    genre: fd.get('genre'),
                    totalCopies: Number(fd.get('totalCopies')),
                    coverColor: fd.get('coverColor'),
                  })
                })
                showAlert('Book updated successfully!', 'success')
                setEditingBook(null)
                loadBooks()
              } catch (err) {
                showAlert(err.message, 'error')
              }
            }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input name="title" defaultValue={editingBook.title} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>Author</label>
                  <input name="author" defaultValue={editingBook.author} required className="form-control" />
                </div>
                <div className="form-group">
                  <label>Genre</label>
                  <input name="genre" defaultValue={editingBook.genre} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Total Copies</label>
                  <input name="totalCopies" type="number" min="1" defaultValue={editingBook.totalCopies} className="form-control" />
                </div>
                <div className="form-group">
                  <label>Cover Color</label>
                  <input name="coverColor" type="color" defaultValue={editingBook.coverColor} className="form-control" />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '1rem 1.5rem', background: '#f8fafc' }}>
                <button type="button" className="btn btn-slate" onClick={() => setEditingBook(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Book</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue Book */}
      {showIssueModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>⚡ Issue Book to Member</h3>
              <button className="btn-close-modal" onClick={() => setShowIssueModal(false)}>✕</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const fd = new FormData(e.target)
              try {
                await apiCall('/api/borrows/issue', {
                  method: 'POST',
                  body: JSON.stringify({
                    bookId: fd.get('bookId'),
                    borrowerName: fd.get('borrowerName'),
                    userEmail: fd.get('userEmail'),
                    durationDays: Number(fd.get('durationDays')),
                  })
                })
                showAlert('Book issued successfully!', 'success')
                setShowIssueModal(false)
                loadBooks()
                loadLibrarianData()
              } catch (err) {
                showAlert(err.message, 'error')
              }
            }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Book</label>
                  <select name="bookId" className="form-control" defaultValue={issueBookTarget?._id || ''} required>
                    {books.filter(b => b.available > 0 && !b.isArchived).map(b => (
                      <option key={b._id} value={b._id}>
                        {b.title} (by {b.author}) — {b.available} available
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Borrower Full Name</label>
                  <input name="borrowerName" required className="form-control" placeholder="e.g. Ronit Khanna" />
                </div>
                <div className="form-group">
                  <label>Registered Member Email (Optional)</label>
                  <input name="userEmail" type="email" className="form-control" placeholder="e.g. member@library.com" />
                </div>
                <div className="form-group">
                  <label>Loan Duration (Days)</label>
                  <input name="durationDays" type="number" min="1" max="90" defaultValue="14" className="form-control" />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '1rem 1.5rem', background: '#f8fafc' }}>
                <button type="button" className="btn btn-slate" onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-green">Confirm & Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
