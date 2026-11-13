import React from 'react';
import { X, Gauge, RotateCcw, CassetteTape, Radio } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function SpeedPitchModal() {
  const {
    isSpeedModalOpen,
    setIsSpeedModalOpen,
    playbackSpeed,
    setPlaybackSpeed,
    varispeed,
    setVarispeed
  } = usePlayer();

  if (!isSpeedModalOpen) return null;

  const presets = [0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 2.0];

  return (
    <div className="modal-backdrop" onClick={() => setIsSpeedModalOpen(false)}>
      <div
        className="modal-content sketch-card speed-pitch-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', width: '90%', padding: '22px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '2px solid var(--paper-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gauge size={18} />
            </div>
            <div>
              <h2 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Tempo & Pitch
              </h2>
              <span className="sketch-font-mono" style={{ fontSize: '0.8rem', color: 'var(--graphite-muted)' }}>
                Varispeed & Acoustic Playback Speed
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={() => setIsSpeedModalOpen(false)} aria-label="Close Speed Settings">
            <X size={18} />
          </button>
        </div>

        {/* Current Speed Display */}
        <div style={{ textAlign: 'center', margin: '20px 0 14px' }}>
          <div className="sketch-font-mono" style={{ fontSize: '2.8rem', fontWeight: 'bold', color: '#3b82f6' }}>
            {playbackSpeed.toFixed(2)}x
          </div>
          <span className="sketch-font-hand" style={{ fontSize: '1rem', color: 'var(--graphite-muted)' }}>
            {playbackSpeed === 1.0
              ? 'Normal Speed'
              : playbackSpeed < 1.0
              ? 'Slowed / Daycore'
              : 'Sped Up / Nightcore'}
          </span>
        </div>

        {/* Speed Slider */}
        <div style={{ padding: '0 8px', marginBottom: '20px' }}>
          <input
            type="range"
            min="0.25"
            max="2.0"
            step="0.05"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#3b82f6' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--graphite-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            <span>0.25x</span>
            <span>1.0x (Default)</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Presets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {presets.map((rate) => {
            const isSelected = Math.abs(playbackSpeed - rate) < 0.01;
            return (
              <button
                key={rate}
                className={`sketch-btn ${isSelected ? 'sketch-btn-primary' : ''}`}
                onClick={() => setPlaybackSpeed(rate)}
                style={{
                  padding: '8px 0',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'center',
                  background: isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.04)',
                  borderColor: isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'
                }}
              >
                {rate}x
              </button>
            );
          })}
        </div>

        {/* Varispeed Mode Toggle */}
        <div
          className="sketch-card"
          onClick={() => setVarispeed(!varispeed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px',
            marginBottom: '16px',
            cursor: 'pointer',
            background: varispeed ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
            border: varispeed ? '1.5px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CassetteTape size={20} color={varispeed ? '#3b82f6' : 'var(--graphite-muted)'} />
            <div>
              <div className="sketch-font-hand" style={{ fontSize: '1.1rem', margin: 0 }}>
                Varispeed Mode
              </div>
              <div className="sketch-font-mono" style={{ fontSize: '0.75rem', color: 'var(--graphite-muted)' }}>
                {varispeed
                  ? 'Tape/Vinyl style: Alters pitch with speed'
                  : 'Digital mode: Preserves natural vocal pitch'}
              </div>
            </div>
          </div>
          <div className="sketch-toggle" style={{ pointerEvents: 'none' }}>
            <input type="checkbox" checked={varispeed} readOnly />
            <span className="slider round"></span>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            className="sketch-btn"
            onClick={() => {
              setPlaybackSpeed(1.0);
              setVarispeed(false);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <RotateCcw size={14} />
            <span>Reset (1.0x)</span>
          </button>
          <button
            className="sketch-btn sketch-btn-primary"
            onClick={() => setIsSpeedModalOpen(false)}
            style={{ fontSize: '0.85rem', padding: '6px 16px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
