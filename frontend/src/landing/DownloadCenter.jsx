import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Download, Copy, Check, Info, ShieldCheck } from 'lucide-react';

export default function DownloadCenter({ onOpenChecksumModal }) {
  const [copiedHash, setCopiedHash] = useState(null);
  const [releaseInfo, setReleaseInfo] = useState({
    android: {
      version: '1.0.2',
      filename: 'dropify-v1.0.2.apk',
      sizeFormatted: '18.9 MB',
      sha256: 'CC447F3C33EC5E4C253D52CA3E306C75428C7DAA43E0485E83A86CC780335449',
      downloadUrl: '/downloads/dropify-v1.0.2.apk',
      minOs: 'Android 8.0 (Oreo) or higher'
    },
    windows: {
      version: '1.0.0',
      installer: {
        filename: 'Dropify-Setup-1.0.0.exe',
        sizeFormatted: '128.9 MB',
        sha256: '05FD37B08B0C72B4A70958851118F257E37791D09B657B4AD8C271F7404B0E6B',
        downloadUrl: 'https://github.com/harsh-pratap-singh-rathore/Dropify/releases/download/v1.0.0/Dropify-Setup-1.0.0.exe'
      },
      portable: {
        filename: 'Dropify-Portable-1.0.0.exe',
        sizeFormatted: '109.1 MB',
        sha256: 'E3211562F661BA719A93C64E0A58E0DCFED7F5A7BEE591A16C3F06880D484AD0',
        downloadUrl: 'https://github.com/harsh-pratap-singh-rathore/Dropify/releases/download/v1.0.0/Dropify-Portable-1.0.0.exe'
      },
      minOs: 'Windows 10 / 11 (64-bit)'
    }
  });

  // Fetch dynamic release metadata from /releases.json with graceful fallback
  useEffect(() => {
    fetch('/releases.json')
      .then((res) => {
        if (!res.ok) throw new Error('Release manifest response not ok');
        return res.json();
      })
      .then((data) => {
        if (data && data.platforms) {
          setReleaseInfo((prev) => ({
            ...prev,
            android: data.platforms.android || prev.android,
            windows: data.platforms.windows || prev.windows
          }));
        }
      })
      .catch((err) => {
        console.info('[Dropify] Using verified built-in release configuration:', err.message);
      });
  }, []);

  const handleCopyHash = (hash, label) => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedHash(label);
      setTimeout(() => setCopiedHash(null), 2500);
    });
  };

  return (
    <section id="downloads" className="landing-section">
      <div className="landing-container downloads-container">
        <div className="section-header">
          <div className="section-tag yellow">Download Center</div>
          <h2 className="section-title">Get Dropify on your devices.</h2>
          <p className="section-subtitle">
            All downloads are 100% free, signed, and ad-free. Verify SHA-256 checksums anytime for maximum integrity.
          </p>
        </div>

        <div className="downloads-grid">
          {/* Card 1: Android Release */}
          <div className="neo-card download-portal-card">
            <div className="washi-tape pink"></div>
            
            <div className="download-card-header">
              <div className="download-platform-icon android">
                <Smartphone size={32} />
              </div>
              <span className="download-version-pill">v{releaseInfo.android.version} STABLE</span>
            </div>

            <h3 className="download-card-title">Dropify for Android</h3>
            <p className="download-card-desc">
              Standalone signed APK with background playback, lockscreen controls, notification Like/Unlike, and vinyl turntable.
            </p>

            <div className="download-specs-table">
              <div className="spec-row">
                <span className="spec-label">Package Format:</span>
                <span className="spec-value">Universal Signed APK</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">File Size:</span>
                <span className="spec-value">{releaseInfo.android.sizeFormatted}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Compatibility:</span>
                <span className="spec-value">{releaseInfo.android.minOs}</span>
              </div>
            </div>

            <div className="download-cta-group">
              <a
                href={releaseInfo.android.downloadUrl}
                download={releaseInfo.android.filename || "dropify-v1.0.2.apk"}
                className="neo-btn neo-btn-primary"
              >
                <Download size={18} />
                <span>Download APK ({releaseInfo.android.sizeFormatted})</span>
              </a>
            </div>

            {/* SHA-256 Checksum Box */}
            <div className="sha256-box">
              <span className="sha256-text" title={releaseInfo.android.sha256}>
                SHA-256: {releaseInfo.android.sha256.substring(0, 16)}...
              </span>
              <button
                className="copy-hash-btn"
                onClick={() => handleCopyHash(releaseInfo.android.sha256, 'android')}
                title="Copy full SHA-256 Checksum"
              >
                {copiedHash === 'android' ? (
                  <>
                    <Check size={12} color="#10B981" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Sideload Guidance */}
            <div className="install-guide-box">
              <div className="guide-summary-title">
                <Info size={14} color="#FF2D55" />
                <span>Installation Guidance (APK Sideloading)</span>
              </div>
              <ol className="guide-steps-list">
                <li>Download the APK file directly to your phone.</li>
                <li>Tap the downloaded file in your notification or Files app.</li>
                <li>If prompted, tap <em>Settings</em> and enable <em>"Allow from this source"</em>.</li>
                <li>Tap <em>Install</em> and enjoy ad-free music immediately.</li>
              </ol>
            </div>
          </div>

          {/* Card 2: Windows PC Release */}
          <div className="neo-card download-portal-card">
            <div className="washi-tape cyan"></div>

            <div className="download-card-header">
              <div className="download-platform-icon windows">
                <Monitor size={32} />
              </div>
              <span className="download-version-pill">v{releaseInfo.windows.version} STABLE</span>
            </div>

            <h3 className="download-card-title">Dropify for Windows PC</h3>
            <p className="download-card-desc">
              Audiophile desktop app with 10-band DSP equalizer, Taskbar Thumbar buttons, Discord Rich Presence, and System Tray.
            </p>

            <div className="download-specs-table">
              <div className="spec-row">
                <span className="spec-label">Installer Options:</span>
                <span className="spec-value">NSIS Setup (.exe) & Portable</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Setup Size:</span>
                <span className="spec-value">{releaseInfo.windows.installer.sizeFormatted}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Requirements:</span>
                <span className="spec-value">{releaseInfo.windows.minOs}</span>
              </div>
            </div>

            <div className="download-cta-group">
              <a
                href={releaseInfo.windows.installer.downloadUrl}
                className="neo-btn neo-btn-primary"
                title="Download full Windows NSIS Setup installer"
              >
                <Download size={18} />
                <span>Download Setup Installer ({releaseInfo.windows.installer.sizeFormatted})</span>
              </a>

              <a
                href={releaseInfo.windows.portable.downloadUrl}
                className="neo-btn neo-btn-secondary"
                title="Download portable zero-installation executable"
              >
                <Download size={16} />
                <span>Download Portable ({releaseInfo.windows.portable.sizeFormatted})</span>
              </a>
            </div>

            {/* SHA-256 Checksum Box */}
            <div className="sha256-box">
              <span className="sha256-text" title={releaseInfo.windows.installer.sha256}>
                SHA-256: {releaseInfo.windows.installer.sha256.substring(0, 16)}...
              </span>
              <button
                className="copy-hash-btn"
                onClick={() => handleCopyHash(releaseInfo.windows.installer.sha256, 'windows')}
                title="Copy full SHA-256 Checksum"
              >
                {copiedHash === 'windows' ? (
                  <>
                    <Check size={12} color="#10B981" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Windows SmartScreen Note */}
            <div className="install-guide-box">
              <div className="guide-summary-title">
                <ShieldCheck size={14} color="#0284C7" />
                <span>Windows SmartScreen Note</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Because Dropify is an open-source, community-distributed build without an expensive EV code signing certificate, Windows Defender SmartScreen may display an alert. Simply click <strong>"More info"</strong> then <strong>"Run anyway"</strong> to launch.
              </p>
            </div>
          </div>
        </div>

        {/* Checksum & Release Integrity Banner */}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            onClick={onOpenChecksumModal}
            className="neo-btn neo-btn-sm neo-btn-yellow"
          >
            <ShieldCheck size={16} />
            <span>View All Cryptographic SHA-256 Checksums</span>
          </button>
        </div>
      </div>
    </section>
  );
}
