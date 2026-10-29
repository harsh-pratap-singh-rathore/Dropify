import React from 'react';
import { Heart } from 'lucide-react';
import dropifyLogo from '../assets/brand/dropify_logo.png';

function GithubIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function Footer({ onOpenChecksumModal, onLaunchWebPlayer }) {
  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <div className="footer-grid">
          {/* Col 1: Brand Info */}
          <div className="footer-brand-col">
            <div className="footer-logo-row">
              <img src={dropifyLogo} alt="Dropify Logo" className="nav-logo-icon" />
              <span className="nav-brand-text">Dropify</span>
              <span className="nav-badge-universe">SOUND UNIVERSE</span>
            </div>
            <p className="footer-desc">
              Free, ad-free music player crafted with a 2D tactile aesthetic, vinyl turntable player, synchronized lyrics, and audiophile equalizer for Android, Windows PC, and Web.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <a
                href="https://github.com/harsh-pratap-singh-rathore/Dropify"
                target="_blank"
                rel="noopener noreferrer"
                className="neo-btn neo-btn-sm neo-btn-secondary"
                title="View Dropify on GitHub"
              >
                <GithubIcon size={16} />
                <span>GitHub Source</span>
              </a>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="footer-links-title">Navigation</h4>
            <ul className="footer-links-list">
              <li><a href="#hero" className="footer-link">Home</a></li>
              <li><a href="#experience" className="footer-link">App Experience</a></li>
              <li><a href="#features" className="footer-link">Core Features</a></li>
              <li><a href="#platforms" className="footer-link">Platform Comparison</a></li>
              <li><a href="#faq" className="footer-link">FAQ</a></li>
            </ul>
          </div>

          {/* Col 3: Downloads */}
          <div>
            <h4 className="footer-links-title">Downloads</h4>
            <ul className="footer-links-list">
              <li><a href="#downloads" className="footer-link">Android APK (v1.0.2)</a></li>
              <li><a href="#downloads" className="footer-link">Windows Installer (x64)</a></li>
              <li><a href="#downloads" className="footer-link">Windows Portable (.exe)</a></li>
              {onLaunchWebPlayer && (
                <li>
                  <button
                    onClick={onLaunchWebPlayer}
                    className="footer-link"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                  >
                    Launch Web Player
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={onOpenChecksumModal}
                  className="footer-link"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'var(--color-pink)' }}
                >
                  Verify SHA-256 Hashes
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Privacy & Product Policy */}
          <div>
            <h4 className="footer-links-title">Privacy & Ethics</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Dropify is built with privacy in mind. We do not require account registration, collect user tracking metrics, or sell telemetry data. Playlists and liked tracks remain stored locally on your device.
            </p>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <div>
            © 2026 Dropify. Released as open-source under MIT License.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Crafted with</span>
            <Heart size={14} color="#FF2D55" fill="#FF2D55" />
            <span>for pure sound lovers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
