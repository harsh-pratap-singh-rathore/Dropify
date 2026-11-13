import React from 'react';
import {
  X,
  Palette,
  Moon,
  Sparkles,
  Sun,
  Monitor,
  Check
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function ThemeSelectorModal({ isOpen, onClose }) {
  const { themeMode, setThemeMode } = usePlayer();

  if (!isOpen) return null;

  const themes = [
    {
      id: 'dark',
      title: 'Dark',
      subtitle: 'Matte charcoal (#141414) with layered cards',
      icon: Moon,
      color: '#ef4444'
    },
    {
      id: 'amoled',
      title: 'AMOLED Matte',
      subtitle: 'Pure pitch black (#000000) true black & zero glare',
      icon: Sparkles,
      color: '#8b5cf6'
    },
    {
      id: 'light',
      title: 'Light',
      subtitle: 'Warm off-white notebook paper aesthetic (#FAF7F2)',
      icon: Sun,
      color: '#f59e0b'
    },
    {
      id: 'system',
      title: 'System Theme',
      subtitle: 'Follows device appearance automatically',
      icon: Monitor,
      color: '#06b6d4'
    }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content sketch-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          width: '90%',
          padding: '22px',
          boxShadow: 'var(--sketch-shadow)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1.5px solid var(--paper-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444'
              }}
            >
              <Palette size={18} />
            </div>
            <div>
              <h3 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
                Select Theme
              </h3>
              <p className="sketch-font-mono" style={{ margin: 0, fontSize: '0.75rem', color: 'var(--graphite-muted)' }}>
                Choose visual aesthetic for Dropify
              </p>
            </div>
          </div>

          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Theme Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {themes.map((thm) => {
            const isSelected = themeMode === thm.id;
            const IconComp = thm.icon;
            return (
              <div
                key={thm.id}
                onClick={() => setThemeMode(thm.id)}
                className="sketch-card"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  border: isSelected ? `2px solid ${thm.color}` : '1.5px solid var(--paper-border-light)',
                  background: isSelected ? 'var(--paper-card-subtle)' : 'var(--paper-card)',
                  borderRadius: '10px',
                  boxShadow: isSelected ? `0 3px 0 ${thm.color}` : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: isSelected ? `${thm.color}22` : 'var(--graphite-wash)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? thm.color : 'var(--graphite-main)'
                    }}
                  >
                    <IconComp size={18} />
                  </div>
                  <div>
                    <div className="sketch-font-hand" style={{ fontSize: '1.05rem', fontWeight: 700, color: isSelected ? thm.color : 'var(--graphite-main)' }}>
                      {thm.title}
                    </div>
                    <div className="sketch-font-mono" style={{ fontSize: '0.73rem', color: 'var(--graphite-muted)' }}>
                      {thm.subtitle}
                    </div>
                  </div>
                </div>

                {isSelected && <Check size={18} color={thm.color} />}
              </div>
            );
          })}
        </div>

        {/* Done Button */}
        <button
          type="button"
          className="sketch-btn sketch-btn-primary"
          onClick={onClose}
          style={{ width: '100%', marginTop: '16px', padding: '10px' }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
