import React from 'react';
import { X, Dna, Disc, User, Calendar, ExternalLink, Sparkles } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function SongDnaModal() {
  const { isDnaOpen, setIsDnaOpen, dnaData, isLoadingDna, currentSong } = usePlayer();

  if (!isDnaOpen) return null;

  return (
    <div className="modal-backdrop" onClick={() => setIsDnaOpen(false)}>
      <div
        className="modal-content sketch-card song-dna-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '92%', maxHeight: '88vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '2px solid var(--paper-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Dna size={18} />
            </div>
            <div>
              <h2 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Song DNA
                <span className="sketch-badge" style={{ fontSize: '0.75rem', background: 'var(--highlighter-yellow)', color: '#000' }}>Backstory</span>
              </h2>
              <span className="sketch-font-mono" style={{ fontSize: '0.8rem', color: 'var(--graphite-muted)' }}>
                Genius & Wikipedia Acoustic Backstory
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={() => setIsDnaOpen(false)} aria-label="Close DNA">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {isLoadingDna ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="animate-sketch-wobble" style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--highlighter-yellow)', border: '2px solid var(--paper-border)', borderRadius: 'var(--sketch-radius-pill)' }}>
              <span className="sketch-font-hand" style={{ fontSize: '1.2rem', fontWeight: 600 }}>Uncovering Track DNA...</span>
            </div>
            <p className="sketch-font-mono" style={{ fontSize: '0.85rem', color: 'var(--graphite-muted)', marginTop: '12px' }}>
              Querying crowd-sourced annotations and encyclopedia archives...
            </p>
          </div>
        ) : dnaData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '18px' }}>
            {/* Track Info Card */}
            <div className="sketch-card" style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {currentSong?.thumbnailHigh || currentSong?.thumbnail ? (
                  <img
                    src={currentSong.thumbnailHigh || currentSong.thumbnail}
                    alt={dnaData.title}
                    style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid var(--paper-border)' }}
                  />
                ) : (
                  <div style={{ width: '64px', height: '64px', borderRadius: '8px', background: 'var(--paper-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Disc size={28} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {dnaData.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span className="sketch-font-mono" style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>
                      {dnaData.artist}
                    </span>
                    {dnaData.album && (
                      <span className="sketch-badge" style={{ fontSize: '0.75rem' }}>
                        <Disc size={10} style={{ marginRight: '4px' }} />
                        {dnaData.album}
                      </span>
                    )}
                    {dnaData.releaseDate && (
                      <span className="sketch-badge" style={{ fontSize: '0.75rem' }}>
                        <Calendar size={10} style={{ marginRight: '4px' }} />
                        {dnaData.releaseDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* About the Song */}
            <div className="sketch-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Sparkles size={16} color="#ef4444" />
                <h4 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.2rem', color: '#ef4444' }}>
                  About the Song
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--graphite-main)', whiteSpace: 'pre-line' }}>
                {dnaData.meaning}
              </p>
            </div>

            {/* About the Artist */}
            <div className="sketch-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <User size={16} color="#3b82f6" />
                <h4 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.2rem', color: '#3b82f6' }}>
                  About the Artist
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--graphite-main)', whiteSpace: 'pre-line' }}>
                {dnaData.bio}
              </p>
            </div>

            {/* External Links */}
            {dnaData.geniusUrl && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
                <a
                  href={dnaData.geniusUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="sketch-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                >
                  <span>View on Genius</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
