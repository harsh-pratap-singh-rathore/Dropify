import React from 'react';
import { X, Command, Play, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Maximize2, Volume2, Heart, Music } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

const SHORTCUTS = [
  { key: 'Space / K', desc: 'Toggle Play / Pause', icon: <Play size={15} /> },
  { key: 'F', desc: 'Toggle Fullscreen Player & Synced Lyrics', icon: <Maximize2 size={15} /> },
  { key: 'L', desc: 'Like / Save Track to Library', icon: <Heart size={15} /> },
  { key: 'M', desc: 'Mute / Unmute Audio', icon: <Volume2 size={15} /> },
  { key: '← / →', desc: 'Seek 5 Seconds Backward / Forward', icon: <ArrowRight size={15} /> },
  { key: 'Shift + ← / →', desc: 'Previous / Next Track (with Crossfade)', icon: <Music size={15} /> },
  { key: '↑ / ↓', desc: 'Adjust Volume ±5%', icon: <ArrowUp size={15} /> },
  { key: 'Esc', desc: 'Close Modals or Exit Fullscreen', icon: <X size={15} /> }
];

export default function ShortcutsModal() {
  const { isShortcutsOpen, setIsShortcutsOpen } = usePlayer();

  if (!isShortcutsOpen) return null;

  return (
    <div className="modal-backdrop" onClick={() => setIsShortcutsOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="washi-tape-top" />
        <div className="modal-header">
          <div className="modal-title">
            <Command size={20} />
            <span className="sketch-font-title">Studio Keyboard Shortcuts</span>
          </div>
          <button className="btn-icon" onClick={() => setIsShortcutsOpen(false)} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="shortcuts-subtitle sketch-font-hand">
          Control Dropify with studio keyboard gestures from anywhere in your notebook.
        </p>

        <div className="shortcuts-grid">
          {SHORTCUTS.map((item, idx) => (
            <div key={idx} className="shortcut-card">
              <div className="shortcut-left">
                <span style={{ display: 'flex', color: 'var(--graphite-secondary)' }}>{item.icon}</span>
                <span className="shortcut-desc">{item.desc}</span>
              </div>
              <kbd className="shortcut-kbd">{item.key}</kbd>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button className="sketch-btn sketch-btn-primary" onClick={() => setIsShortcutsOpen(false)}>
            Got it, Let's Doodle
          </button>
        </div>
      </div>
    </div>
  );
}
