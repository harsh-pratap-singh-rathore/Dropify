import React, { useState } from 'react';
import { X, Share2, Copy, Check, ExternalLink, Music, Radio, Disc } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function ShareModal() {
  const { isShareOpen, setIsShareOpen, shareSong } = usePlayer();
  const [copied, setCopied] = useState(false);

  if (!isShareOpen || !shareSong) return null;

  const universalUrl = `https://song.link/y/${shareSong.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(universalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyText = () => {
    const text = `🎧 Listening to "${shareSong.title}" by ${shareSong.artist} on Dropify\n${universalUrl}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsShareOpen(false)}>
      <div
        className="modal-content sketch-card share-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '90%', padding: '22px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '2px solid var(--paper-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#10b981', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={18} />
            </div>
            <div>
              <h2 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Universal Share
              </h2>
              <span className="sketch-font-mono" style={{ fontSize: '0.8rem', color: 'var(--graphite-muted)' }}>
                Powered by Odesli / Song.link
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={() => setIsShareOpen(false)} aria-label="Close Share">
            <X size={18} />
          </button>
        </div>

        {/* Track Preview Card */}
        <div
          className="sketch-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            margin: '18px 0',
            padding: '14px',
            background: 'rgba(255, 255, 255, 0.04)'
          }}
        >
          <img
            src={shareSong.thumbnailHigh || shareSong.thumbnail || `https://i.ytimg.com/vi/${shareSong.id}/mqdefault.jpg`}
            alt={shareSong.title}
            style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {shareSong.title}
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
              {shareSong.artist}
            </div>
            <div className="sketch-font-mono" style={{ fontSize: '0.75rem', color: 'var(--graphite-muted)', marginTop: '2px' }}>
              Universal Cross-Platform Link
            </div>
          </div>
        </div>

        {/* Universal Link Box */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            className="sketch-input"
            readOnly
            value={universalUrl}
            style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', background: 'rgba(0, 0, 0, 0.2)' }}
          />
          <button
            className="sketch-btn sketch-btn-primary"
            onClick={handleCopy}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 16px' }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Platform compatibility badges */}
        <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '16px' }}>
          <div className="sketch-font-mono" style={{ fontSize: '0.75rem', color: 'var(--graphite-muted)', marginBottom: '8px' }}>
            Friends can open this link on:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span className="sketch-badge" style={{ background: '#1db954', color: '#000', fontWeight: 'bold' }}>Spotify</span>
            <span className="sketch-badge" style={{ background: '#fc3c44', color: '#fff', fontWeight: 'bold' }}>Apple Music</span>
            <span className="sketch-badge" style={{ background: '#ff0000', color: '#fff', fontWeight: 'bold' }}>YouTube</span>
            <span className="sketch-badge" style={{ background: '#a238ff', color: '#fff', fontWeight: 'bold' }}>Deezer</span>
            <span className="sketch-badge" style={{ background: '#ff9900', color: '#000', fontWeight: 'bold' }}>Amazon Music</span>
            <span className="sketch-badge" style={{ background: '#000', color: '#fff', border: '1px solid #333' }}>Tidal</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            className="sketch-btn"
            onClick={handleCopyText}
            style={{ flex: 1, fontSize: '0.85rem', padding: '8px 0', textAlign: 'center' }}
          >
            Copy with Description
          </button>
          <a
            href={universalUrl}
            target="_blank"
            rel="noreferrer"
            className="sketch-btn"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1, fontSize: '0.85rem', textDecoration: 'none' }}
          >
            <span>Open Link</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
