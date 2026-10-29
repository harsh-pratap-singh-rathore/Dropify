import React, { useState } from 'react';
import { Download, Play, Menu, X } from 'lucide-react';
import dropifyLogo from '../assets/brand/dropify_logo.png';

export default function Navbar({ onLaunchWebPlayer }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="landing-nav-wrapper">
      <nav className="landing-nav">
        {/* Brand Logo & Wordmark Matching App Header */}
        <a href="#hero" className="nav-brand" onClick={closeMobileMenu}>
          <img src={dropifyLogo} alt="Dropify Logo" className="nav-logo-icon" />
          <span className="nav-brand-text">Dropify</span>
          <span className="nav-badge-universe">SOUND UNIVERSE</span>
        </a>

        {/* Desktop Navigation Links */}
        <div className="nav-links-desktop">
          <a href="#experience" className="nav-link">Experience</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#platforms" className="nav-link">Platforms</a>
          <a href="#downloads" className="nav-link">Downloads</a>
          <a href="#faq" className="nav-link">FAQ</a>
        </div>

        {/* Desktop Action Buttons */}
        <div className="nav-actions-desktop">
          {onLaunchWebPlayer && (
            <button
              onClick={onLaunchWebPlayer}
              className="neo-btn neo-btn-sm neo-btn-secondary"
              title="Launch Web Player inside your browser"
            >
              <Play size={14} fill="currentColor" />
              <span>Web Player</span>
            </button>
          )}
          <a href="#downloads" className="neo-btn neo-btn-sm neo-btn-primary">
            <Download size={14} />
            <span>Download Dropify</span>
          </a>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="nav-mobile-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-menu">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '2px solid #000' }}>
            <img src={dropifyLogo} alt="Dropify" style={{ width: 36, height: 36, borderRadius: 10, border: '2px solid #000' }} />
            <span style={{ fontWeight: 900, fontSize: '1.3rem' }}>Dropify</span>
            <span className="nav-badge-universe" style={{ marginLeft: 'auto' }}>SOUND UNIVERSE</span>
          </div>
          <a href="#experience" className="mobile-nav-link" onClick={closeMobileMenu}>Experience</a>
          <a href="#features" className="mobile-nav-link" onClick={closeMobileMenu}>Features</a>
          <a href="#platforms" className="mobile-nav-link" onClick={closeMobileMenu}>Platforms</a>
          <a href="#downloads" className="mobile-nav-link" onClick={closeMobileMenu}>Downloads</a>
          <a href="#faq" className="mobile-nav-link" onClick={closeMobileMenu}>FAQ</a>
          <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '4px 0' }} />
          {onLaunchWebPlayer && (
            <button
              onClick={() => { closeMobileMenu(); onLaunchWebPlayer(); }}
              className="neo-btn neo-btn-secondary"
              style={{ width: '100%' }}
            >
              <Play size={16} fill="currentColor" />
              <span>Launch Web Player</span>
            </button>
          )}
          <a
            href="#downloads"
            className="neo-btn neo-btn-primary"
            style={{ width: '100%' }}
            onClick={closeMobileMenu}
          >
            <Download size={16} />
            <span>Download Dropify (v1.0.1)</span>
          </a>
        </div>
      )}
    </header>
  );
}
