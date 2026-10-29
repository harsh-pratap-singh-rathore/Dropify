import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck } from 'lucide-react';

export default function ChecksumModal({ isOpen, onClose }) {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen) return null;

  const artifacts = [
    {
      platform: "Android APK v1.0.2 (Latest)",
      file: "dropify-v1.0.2.apk / app-release.apk",
      size: "19,849,445 bytes (~18.9 MB)",
      sha256: "CC447F3C33EC5E4C253D52CA3E306C75428C7DAA43E0485E83A86CC780335449"
    },
    {
      platform: "Android APK v1.0.1 (Previous)",
      file: "dropify-v1.0.1.apk / app-release.apk",
      size: "19,849,449 bytes (~18.9 MB)",
      sha256: "7898CA54EC6E8757A3603023B2B1764944521AF4F716711DBE6FF46A0A80516F"
    },
    {
      platform: "Android APK v1.0.0 (Baseline)",
      file: "dropify-v1.0.0.apk / app-release.apk",
      size: "19,816,149 bytes (~18.9 MB)",
      sha256: "6A14F791F86480D69AFF15D2CF391E4A6B110070CFB3CB13EE0FBBB864AE58E2"
    },
    {
      platform: "Windows Setup (NSIS Installer)",
      file: "Dropify Setup 1.0.0.exe",
      size: "135,163,574 bytes (~128.9 MB)",
      sha256: "05FD37B08B0C72B4A70958851118F257E37791D09B657B4AD8C271F7404B0E6B"
    },
    {
      platform: "Windows Portable (Standalone)",
      file: "Dropify-Portable-1.0.0.exe",
      size: "114,367,762 bytes (~109.1 MB)",
      sha256: "E3211562F661BA719A93C64E0A58E0DCFED7F5A7BEE591A16C3F06880D484AD0"
    }
  ];

  const handleCopy = (hash, key) => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <ShieldCheck size={28} color="#10B981" />
          <h3 className="modal-title" style={{ margin: 0 }}>Cryptographic Checksums</h3>
        </div>

        <p className="modal-subtitle">
          Verify the authenticity of your Dropify release binary using the official SHA-256 hashes generated during the production compilation.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {artifacts.map((a, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--color-canvas)',
                border: 'var(--border-thin)',
                borderRadius: 12,
                padding: 16
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{a.platform}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{a.size}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
                {a.file}
              </div>
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #000',
                  borderRadius: 6,
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  minWidth: 0,
                  width: '100%'
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                  {a.sha256}
                </span>
                <button
                  className="copy-hash-btn"
                  onClick={() => handleCopy(a.sha256, idx)}
                  title="Copy SHA-256 Hash"
                >
                  {copiedKey === idx ? (
                    <>
                      <Check size={12} color="#10B981" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button className="neo-btn neo-btn-sm neo-btn-secondary" onClick={onClose} style={{ width: '100%' }}>
            Close Verification Window
          </button>
        </div>
      </div>
    </div>
  );
}
