import { useState, useRef } from 'react'
import './LandingPage.css'

// Curated 3D books data for the hero bookshelf showcase
const SHOWCASE_BOOKS = [
  {
    id: 1,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    theme: 'lp-book-theme-1',
    spineCode: 'LIT-101',
    crest: '🏛️',
    genre: 'Classic Literature',
    shelf: 'Wing A • Shelf 04',
    status: 'Available',
    summary: 'A timeless critique of wealth, longing, and the American dream set in the Roaring Twenties.'
  },
  {
    id: 2,
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    theme: 'lp-book-theme-2',
    spineCode: 'CS-204',
    crest: '⚡',
    genre: 'Computer Science',
    shelf: 'Wing C • Shelf 12',
    status: 'Available',
    summary: 'Essential software structure and design principles for building resilient, maintainable systems.'
  },
  {
    id: 3,
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    theme: 'lp-book-theme-3',
    spineCode: 'LT-318',
    crest: '🌿',
    genre: 'Historical Fiction',
    shelf: 'Wing B • Shelf 08',
    status: 'Available',
    summary: 'A profound exploration of moral courage, racial justice, and compassion in the American South.'
  },
  {
    id: 4,
    title: 'Design Patterns',
    author: 'Gang of Four',
    theme: 'lp-book-theme-4',
    spineCode: 'CS-402',
    crest: '⚙️',
    genre: 'Software Engineering',
    shelf: 'Wing C • Shelf 15',
    status: 'Available',
    summary: 'The classic catalog of 23 foundational object-oriented design patterns used across modern software.'
  }
]

export default function LandingPage({
  onGetStarted,
  onLogin,
  onGuestBrowse,
  onRoleSelect
}) {
  // ── State for Interactive 3D Showcase ──────────────────────────────────────
  const [activeBookIndex, setActiveBookIndex] = useState(1) // Default to Clean Architecture
  const [rotX, setRotX] = useState(8)
  const [rotY, setRotY] = useState(-12)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const sceneRef = useRef(null)

  // ── Mouse-Responsive 3D Parallax Tilt ──────────────────────────────────────
  const handleMouseMove = (e) => {
    if (!sceneRef.current) return
    const rect = sceneRef.current.getBoundingClientRect()
    // Calculate mouse position relative to center of the scene (-1 to 1)
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5

    // Subtle natural tilt ranges: X: 4deg to 16deg, Y: -24deg to 0deg
    setRotX(8 - y * 14)
    setRotY(-12 + x * 20)
  }

  const handleMouseLeave = () => {
    // Smoothly restore default rest orientation
    setRotX(8)
    setRotY(-12)
  }

  const activeBook = SHOWCASE_BOOKS[activeBookIndex]

  const handleRoleClick = (role) => {
    if (onRoleSelect) {
      onRoleSelect(role)
    } else {
      onLogin()
    }
  }

  // Smooth scroll helper for on-page navigation
  const scrollToSection = (id) => {
    setMobileMenuOpen(false)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="landing-page" id="home">
      {/* ── Sticky Luxury Navigation Bar ── */}
      <header className="lp-navbar">
        <div className="lp-brand" onClick={() => scrollToSection('home')}>
          <div className="lp-brand-emblem">📚</div>
          <div className="lp-brand-text">
            <h1>City Library</h1>
            <span>Academic Archival Portal</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav>
          <ul className="lp-nav-links">
            <li>
              <a href="#home" className="lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>
                Home
              </a>
            </li>
            <li>
              <a href="#features" className="lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>
                Features
              </a>
            </li>
            <li>
              <a href="#about" className="lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>
                About
              </a>
            </li>
            <li>
              <a href="#roles" className="lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('roles'); }}>
                User Roles
              </a>
            </li>
          </ul>
        </nav>

        {/* Action Buttons */}
        <div className="lp-nav-actions">
          <button className="lp-btn-login" onClick={onLogin}>
            Sign In
          </button>
          <button className="lp-btn-primary" onClick={onGetStarted}>
            Get Started →
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="lp-mobile-toggle"
          aria-label="Toggle Navigation Menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lp-mobile-drawer">
          <a href="#home" className="lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>
            Home
          </a>
          <a href="#features" className="lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>
            Features
          </a>
          <a href="#about" className="lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>
            About
          </a>
          <a href="#roles" className="lp-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('roles'); }}>
            User Roles
          </a>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="lp-btn-login" style={{ flex: 1 }} onClick={onLogin}>
              Sign In
            </button>
            <button className="lp-btn-primary" style={{ flex: 1 }} onClick={onGetStarted}>
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* ── 1. Hero Section with 3D Bookshelf ── */}
      <section className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <span>✨</span> Next-Gen Archival System
          </div>

          <h1 className="lp-hero-title">
            Your Library, <em>Reimagined.</em>
          </h1>

          <p className="lp-hero-subtitle">
            A modern, dignified digital sanctuary built for students, scholars, and librarians.
            Explore over 15,000 physical volumes, manage instant reservations, and track circulation with effortless precision.
          </p>

          <div className="lp-hero-actions">
            <button className="lp-btn-primary" style={{ padding: '0.8rem 1.8rem', fontSize: '1rem' }} onClick={onGetStarted}>
              Get Started Free →
            </button>
            <button className="lp-btn-secondary" style={{ padding: '0.8rem 1.6rem', fontSize: '1rem' }} onClick={onGuestBrowse}>
              📖 Browse Catalog as Guest
            </button>
          </div>

          {/* Quick Statistics Strip */}
          <div className="lp-hero-stats-strip">
            <div className="lp-stat-item">
              <h3>15,000+</h3>
              <p>Physical Volumes</p>
            </div>
            <div className="lp-stat-item">
              <h3>3 Portals</h3>
              <p>Member • Staff • Admin</p>
            </div>
            <div className="lp-stat-item">
              <h3>Zero Paper</h3>
              <p>Automated Fines & Dues</p>
            </div>
          </div>
        </div>

        {/* ── Pure CSS 3D Floating Bookshelf Showcase ── */}
        <div className="lp-hero-3d-showcase">
          <div
            className="lp-3d-scene-container"
            ref={sceneRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              '--rot-x': `${rotX}deg`,
              '--rot-y': `${rotY}deg`
            }}
          >
            {/* 3D Stage holding books and shelf base */}
            <div
              className="lp-3d-stage"
              style={{
                transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`
              }}
            >
              {/* Wooden Bookshelf Pedestal with realistic depth & bevel */}
              <div className="lp-3d-shelf-pedestal" />

              {/* 4 Pure CSS 3D Books */}
              {SHOWCASE_BOOKS.map((book, idx) => (
                <div
                  key={book.id}
                  className={`lp-3d-book ${book.theme} ${activeBookIndex === idx ? 'active' : ''}`}
                  onClick={() => setActiveBookIndex(idx)}
                  title={`Click to inspect ${book.title}`}
                >
                  {/* Front Cover */}
                  <div className="lp-book-cover">
                    <div className="lp-cover-crest">{book.crest}</div>
                    <div className="lp-cover-title">{book.title}</div>
                    <div className="lp-cover-author">{book.author}</div>
                  </div>

                  {/* 3D Left Spine with gold ribbed bands */}
                  <div className="lp-book-spine">
                    <div className="lp-spine-rib" />
                    <span className="lp-spine-text">{book.title}</span>
                    <div className="lp-spine-rib" />
                    <span className="lp-spine-code">{book.spineCode}</span>
                  </div>

                  {/* 3D Right Page Edges with paper ridges */}
                  <div className="lp-book-pages-right" />

                  {/* 3D Top Page Edges */}
                  <div className="lp-book-pages-top" />

                  {/* Soft 3D Floor Shadow */}
                  <div className="lp-book-shadow" />
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Inspection Card for Selected Book */}
          <div className="lp-book-preview-card">
            <div className="lp-book-preview-info">
              <h4>{activeBook.title}</h4>
              <p>by {activeBook.author} • <em>{activeBook.genre}</em></p>
              <span className="lp-book-preview-tag">📍 {activeBook.shelf} • {activeBook.status}</span>
            </div>
            <button className="lp-btn-inspect" onClick={onGetStarted}>
              Reserve Title →
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. Features Section ── */}
      <section className="lp-features-section" id="features">
        <div className="lp-section-header">
          <span className="lp-section-tag">Engineered for Excellence</span>
          <h2 className="lp-section-title">Everything a Modern Library Needs</h2>
          <p className="lp-section-desc">
            Designed to bridge the tactile beauty of archival books with the speed and reliability of modern web technologies.
          </p>
        </div>

        <div className="lp-features-grid">
          {/* Feature 1 */}
          <div className="lp-feature-card">
            <div className="lp-feature-icon">🔍</div>
            <h3>Intelligent Catalog Discovery</h3>
            <p>
              Instant search across titles, authors, and genres. Live availability badges let users know immediately whether a volume is in stock or reserved.
            </p>
            <span className="lp-feature-pill">Real-Time Search</span>
          </div>

          {/* Feature 2 */}
          <div className="lp-feature-card">
            <div className="lp-feature-icon">🛡️</div>
            <h3>Role-Based Access Control</h3>
            <p>
              Strict separation of concerns powered by JWT authentication. Three distinct interfaces purpose-built for Students, Librarians, and System Administrators.
            </p>
            <span className="lp-feature-pill">JWT + RBAC Security</span>
          </div>

          {/* Feature 3 */}
          <div className="lp-feature-card">
            <div className="lp-feature-icon">⚡</div>
            <h3>Automated Circulation & Fines</h3>
            <p>
              Automated 14-day borrowing cycles, dynamic overdue penalty calculation (₹2/day), and instant return settlement with zero manual spreadsheets.
            </p>
            <span className="lp-feature-pill">Smart Ledger</span>
          </div>

          {/* Feature 4 */}
          <div className="lp-feature-card">
            <div className="lp-feature-icon">📑</div>
            <h3>Digital Reservation Queue</h3>
            <p>
              Place holds on high-demand volumes with a single click. When a copy is returned, the reservation pipeline automatically alerts the next member.
            </p>
            <span className="lp-feature-pill">Queue Management</span>
          </div>
        </div>
      </section>

      {/* ── 3. About the Library Section ── */}
      <section className="lp-about-section" id="about">
        <div className="lp-about-layout">
          <div className="lp-about-content">
            <span className="lp-section-tag">Our Heritage & Mission</span>
            <h2 className="lp-section-title">Where Classical Archival Wisdom Meets Digital Precision</h2>

            <blockquote className="lp-about-quote">
              "A library is not a luxury, but one of the necessities of life. It connects us to the wisdom of antiquity and the frontiers of tomorrow."
              <cite>— Archival Philosophy & Curation Charter</cite>
            </blockquote>

            <p className="lp-about-text">
              The City Library portal preserves a physical collection of over 15,000 academic texts, rare literary classics, and scientific journals.
              By moving to this modern web platform, our patrons enjoy frictionless borrowing, transparent accountability, and round-the-clock digital access.
            </p>

            <div style={{ marginTop: '0.5rem' }}>
              <button className="lp-btn-secondary" onClick={onGuestBrowse}>
                Explore Public Catalog →
              </button>
            </div>
          </div>

          {/* Key Metrics & Operational Hours */}
          <div className="lp-about-cards-grid">
            <div className="lp-about-metric-card">
              <div className="lp-metric-icon">🏛️</div>
              <h4>50+ Years</h4>
              <p>Archival Excellence</p>
            </div>
            <div className="lp-about-metric-card">
              <div className="lp-metric-icon">⏰</div>
              <h4>08:00 – 21:00</h4>
              <p>Reading Hall Hours</p>
            </div>
            <div className="lp-about-metric-card">
              <div className="lp-metric-icon">📍</div>
              <h4>North Campus</h4>
              <p>Central Building</p>
            </div>
            <div className="lp-about-metric-card">
              <div className="lp-metric-icon">🔒</div>
              <h4>100% Encrypted</h4>
              <p>bcrypt & JWT Standard</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. User Roles Section ── */}
      <section className="lp-roles-section" id="roles">
        <div className="lp-section-header">
          <span className="lp-section-tag">Customized Workflows</span>
          <h2 className="lp-section-title">Tailored Portals for Every User</h2>
          <p className="lp-section-desc">
            Experience role-specific features carefully optimized for your responsibilities in the academic community.
          </p>
        </div>

        <div className="lp-roles-grid">
          {/* Member Role */}
          <div className="lp-role-card lp-role-member">
            <span className="lp-role-badge">Student / Faculty</span>
            <div className="lp-role-icon">👤</div>
            <h3>Library Member</h3>
            <p className="lp-role-desc">
              Designed for readers seeking discovery, research material, and self-managed borrowing.
            </p>
            <ul className="lp-role-features-list">
              <li>Browse 15,000+ cataloged volumes</li>
              <li>1-click digital book reservations</li>
              <li>Active loans and due date tracker</li>
              <li>Transparent fine breakdown & loan history</li>
            </ul>
            <button className="lp-role-action-btn" onClick={() => handleRoleClick('member')}>
              Sign In as Member →
            </button>
          </div>

          {/* Librarian Role */}
          <div className="lp-role-card lp-role-librarian">
            <span className="lp-role-badge">Desk Staff</span>
            <div className="lp-role-icon">📚</div>
            <h3>Certified Librarian</h3>
            <p className="lp-role-desc">
              Fast circulation desk interface for high-volume checkouts, returns, and inventory cataloging.
            </p>
            <ul className="lp-role-features-list">
              <li>Add, update, and archive books</li>
              <li>Process checkouts and returns instantly</li>
              <li>Inspect overdue loans & assess fines</li>
              <li>Manage book reservation queues</li>
            </ul>
            <button className="lp-role-action-btn" onClick={() => handleRoleClick('librarian')}>
              Sign In as Librarian →
            </button>
          </div>

          {/* Admin Role */}
          <div className="lp-role-card lp-role-admin">
            <span className="lp-role-badge">Governance</span>
            <div className="lp-role-icon">👑</div>
            <h3>System Administrator</h3>
            <p className="lp-role-desc">
              Comprehensive control over the entire system, user directory, security audits, and analytics.
            </p>
            <ul className="lp-role-features-list">
              <li>Manage all user accounts & assign roles</li>
              <li>Complete circulation records & audit logs</li>
              <li>Database health status & system metrics</li>
              <li>Comprehensive inventory reports</li>
            </ul>
            <button className="lp-role-action-btn" onClick={() => handleRoleClick('admin')}>
              Sign In as Admin →
            </button>
          </div>
        </div>
      </section>

      {/* ── 5. Call To Action Banner ── */}
      <section className="lp-cta-section">
        <div className="lp-cta-card">
          <h2>Ready to Step Into the Modern Reading Era?</h2>
          <p>
            Join our university community today. Access thousands of titles, reserve in seconds, and experience effortless library management.
          </p>
          <div className="lp-cta-actions">
            <button className="lp-btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }} onClick={onGetStarted}>
              Get Started with Portal →
            </button>
            <button className="lp-btn-secondary" style={{ padding: '0.85rem 1.8rem', fontSize: '1.05rem' }} onClick={onLogin}>
              Sign In to Existing Account
            </button>
          </div>
        </div>
      </section>

      {/* ── 6. Professional Academic Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-content">
          <div className="lp-footer-brand">
            <div className="lp-brand" onClick={() => scrollToSection('home')}>
              <div className="lp-brand-emblem">📚</div>
              <div className="lp-brand-text">
                <h1>City Library</h1>
                <span>Academic Archival Portal</span>
              </div>
            </div>
            <p>
              An intelligent, role-based Library Management System built with React, Node.js, Express, and MongoDB.
            </p>
            <div className="lp-viva-badge">
              🎓 Capstone Project Viva 2026
            </div>
          </div>

          <div className="lp-footer-col">
            <h4>Navigation</h4>
            <ul>
              <li><a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}>Home</a></li>
              <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a></li>
              <li><a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>About Library</a></li>
              <li><a href="#roles" onClick={(e) => { e.preventDefault(); scrollToSection('roles'); }}>User Roles</a></li>
            </ul>
          </div>

          <div className="lp-footer-col">
            <h4>Access Portals</h4>
            <ul>
              <li><a href="#roles" onClick={(e) => { e.preventDefault(); handleRoleClick('member'); }}>Student Portal</a></li>
              <li><a href="#roles" onClick={(e) => { e.preventDefault(); handleRoleClick('librarian'); }}>Librarian Desk</a></li>
              <li><a href="#roles" onClick={(e) => { e.preventDefault(); handleRoleClick('admin'); }}>Administrator</a></li>
              <li><a href="#home" onClick={(e) => { e.preventDefault(); onGuestBrowse(); }}>Public Catalog</a></li>
            </ul>
          </div>

          <div className="lp-footer-col">
            <h4>Architecture</h4>
            <ul>
              <li><span style={{ color: '#94a3b8' }}>CSS3 3D Transforms</span></li>
              <li><span style={{ color: '#94a3b8' }}>JWT + RBAC Auth</span></li>
              <li><span style={{ color: '#94a3b8' }}>RESTful APIs</span></li>
              <li><span style={{ color: '#94a3b8' }}>MongoDB Engine</span></li>
            </ul>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <p>© 2026 City Library Management System. All rights reserved.</p>
          <p>Engineered for College Viva Examination • Fully Responsive & Hardware-Accelerated</p>
        </div>
      </footer>
    </div>
  )
}
