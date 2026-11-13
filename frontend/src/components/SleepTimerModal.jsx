import React from 'react';
import { X, Moon, Clock, Check, VolumeX } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function SleepTimerModal() {
  const {
    isSleepTimerModalOpen,
    setIsSleepTimerModalOpen,
    sleepTimer,
    startSleepTimer,
    clearSleepTimer
  } = usePlayer();

  if (!isSleepTimerModalOpen) return null;

  const presets = [
    { label: '5 Minutes', value: 5 },
    { label: '10 Minutes', value: 10 },
    { label: '15 Minutes', value: 15 },
    { label: '30 Minutes', value: 30 },
    { label: '45 Minutes', value: 45 },
    { label: '60 Minutes', value: 60 },
    { label: 'End of Current Track', value: -1 }
  ];

  const formatCountdown = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsSleepTimerModalOpen(false)}>
      <div
        className="modal-content sketch-card sleep-timer-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', width: '90%', padding: '22px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '2px solid var(--paper-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#8b5cf6', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Moon size={18} />
            </div>
            <div>
              <h2 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Sleep Timer
              </h2>
              <span className="sketch-font-mono" style={{ fontSize: '0.8rem', color: 'var(--graphite-muted)' }}>
                Auto-Fade & Rest Mode
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={() => setIsSleepTimerModalOpen(false)} aria-label="Close Timer">
            <X size={18} />
          </button>
        </div>

        {/* Active Countdown Card */}
        {sleepTimer.active && (
          <div
            className="sketch-card"
            style={{
              margin: '18px 0',
              padding: '16px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1.5px solid #8b5cf6',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#8b5cf6' }}>
              <Clock size={18} />
              <span className="sketch-font-mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {sleepTimer.pauseAtSongEnd ? 'Pauses at end of track' : 'Time Remaining'}
              </span>
            </div>

            {!sleepTimer.pauseAtSongEnd && (
              <div className="sketch-font-mono" style={{ fontSize: '2.4rem', fontWeight: 'bold', margin: '8px 0', color: '#8b5cf6' }}>
                {formatCountdown(sleepTimer.remainingSeconds)}
              </div>
            )}

            <button
              className="sketch-btn"
              onClick={clearSleepTimer}
              style={{ marginTop: '8px', color: '#ef4444', borderColor: '#ef4444', fontSize: '0.85rem' }}
            >
              Turn Off Timer
            </button>
          </div>
        )}

        {/* Presets List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: sleepTimer.active ? '10px' : '18px' }}>
          {presets.map((item) => {
            const isSelected =
              sleepTimer.active &&
              (item.value === -1 ? sleepTimer.pauseAtSongEnd : sleepTimer.initialMinutes === item.value);

            return (
              <button
                key={item.label}
                className={`sketch-card ${isSelected ? 'selected-preset' : ''}`}
                onClick={() => {
                  startSleepTimer(item.value);
                  setIsSleepTimerModalOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: isSelected ? 'rgba(139, 92, 246, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? '1.5px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span className="sketch-font-hand" style={{ fontSize: '1.15rem', color: isSelected ? '#8b5cf6' : 'var(--graphite-main)' }}>
                  {item.label}
                </span>
                {isSelected && <Check size={18} color="#8b5cf6" />}
              </button>
            );
          })}
        </div>

        {/* Note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', color: 'var(--graphite-muted)', fontSize: '0.78rem' }}>
          <VolumeX size={14} />
          <span>Fades out volume smoothly before stopping playback.</span>
        </div>
      </div>
    </div>
  );
}
