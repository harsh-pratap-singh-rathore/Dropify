import React, { useState } from 'react';
import {
  X,
  ListMusic,
  Trash2,
  BookmarkPlus,
  Radio,
  ArrowUp,
  ArrowDown,
  Play,
  Volume2,
  Disc,
  Sparkles
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function QueueDrawer() {
  const {
    isQueueOpen,
    setIsQueueOpen,
    queue,
    queueIndex,
    currentSong,
    isPlaying,
    playSong,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    saveQueueAsPlaylist,
    autoplayEnabled,
    setAutoplayEnabled
  } = usePlayer();

  const [playlistName, setPlaylistName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isQueueOpen) return null;

  const handleSavePlaylist = async (e) => {
    e.preventDefault();
    if (!playlistName.trim()) return;
    const ok = await saveQueueAsPlaylist(playlistName.trim());
    if (ok) {
      setSaveSuccess(true);
      setPlaylistName('');
      setTimeout(() => {
        setSaveSuccess(false);
        setShowSaveInput(false);
      }, 2000);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsQueueOpen(false)}>
      <div
        className="modal-content sketch-card queue-drawer"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '92%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '2px solid var(--paper-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ListMusic size={18} />
            </div>
            <div>
              <h2 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Playback Queue
                <span className="sketch-badge" style={{ fontSize: '0.75rem', background: 'var(--paper-border)' }}>
                  {queue.length} Tracks
                </span>
              </h2>
              <span className="sketch-font-mono" style={{ fontSize: '0.8rem', color: 'var(--graphite-muted)' }}>
                Up Next & Live Transition Stream
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={() => setIsQueueOpen(false)} aria-label="Close Queue">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', flexWrap: 'wrap', gap: '8px' }}>
          <button
            className={`sketch-btn ${autoplayEnabled ? 'sketch-btn-primary' : ''}`}
            onClick={() => setAutoplayEnabled(!autoplayEnabled)}
            style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Automatically queue similar songs when playlist finishes"
          >
            <Radio size={14} />
            <span>Autoplay Radio: {autoplayEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="sketch-btn"
              onClick={() => setShowSaveInput(!showSaveInput)}
              style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Save current queue as a custom playlist"
            >
              <BookmarkPlus size={14} />
              <span>Save as Playlist</span>
            </button>
            <button
              className="sketch-btn"
              onClick={clearQueue}
              style={{ fontSize: '0.8rem', padding: '4px 10px', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Clear all upcoming tracks"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Save as Playlist Form */}
        {showSaveInput && (
          <form onSubmit={handleSavePlaylist} style={{ display: 'flex', gap: '8px', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <input
              type="text"
              className="sketch-input"
              placeholder="New Sketchbook Name..."
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem' }}
              autoFocus
            />
            <button type="submit" className="sketch-btn sketch-btn-primary" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
              {saveSuccess ? 'Saved!' : 'Save'}
            </button>
          </form>
        )}

        {/* Track List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--graphite-muted)' }}>
              <Disc size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <p className="sketch-font-hand" style={{ fontSize: '1.2rem', margin: 0 }}>Queue is currently empty</p>
              <span className="sketch-font-mono" style={{ fontSize: '0.8rem' }}>Play any track to begin an audio sketch session</span>
            </div>
          ) : (
            queue.map((track, idx) => {
              const isCurrent = idx === queueIndex;
              return (
                <div
                  key={`${track.id}-${idx}`}
                  className="sketch-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    background: isCurrent ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: isCurrent ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px'
                  }}
                >
                  {/* Status Indicator */}
                  <div style={{ width: '24px', textAlign: 'center', color: isCurrent ? '#ef4444' : 'var(--graphite-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {isCurrent ? (
                      isPlaying ? <Volume2 size={16} className="animate-pulse" /> : <Play size={16} />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Artwork */}
                  <img
                    src={track.thumbnail || `https://i.ytimg.com/vi/${track.id}/mqdefault.jpg`}
                    alt={track.title}
                    style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover' }}
                  />

                  {/* Title & Artist */}
                  <div
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => playSong(track, queue, idx)}
                  >
                    <div
                      className="sketch-font-hand"
                      style={{
                        fontWeight: isCurrent ? 700 : 500,
                        fontSize: '1rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: isCurrent ? '#ef4444' : 'var(--graphite-main)'
                      }}
                    >
                      {track.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--graphite-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.artist}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="sketch-font-mono" style={{ fontSize: '0.75rem', color: 'var(--graphite-muted)' }}>
                    {track.durationFormatted || '3:30'}
                  </div>

                  {/* Reorder Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <button
                      className="btn-icon"
                      disabled={idx === 0}
                      onClick={() => reorderQueue(idx, idx - 1)}
                      style={{ padding: '4px', opacity: idx === 0 ? 0.3 : 1 }}
                      title="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className="btn-icon"
                      disabled={idx === queue.length - 1}
                      onClick={() => reorderQueue(idx, idx + 1)}
                      style={{ padding: '4px', opacity: idx === queue.length - 1 ? 0.3 : 1 }}
                      title="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => removeFromQueue(idx)}
                      style={{ padding: '4px', color: '#ef4444' }}
                      title="Remove from queue"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
