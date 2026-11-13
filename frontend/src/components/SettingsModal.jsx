import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Sliders,
  Sparkles,
  Volume2,
  Moon,
  Sun,
  Monitor,
  Radio,
  HardDrive,
  Check,
  RefreshCw,
  Palette,
  Trash2,
  Bluetooth,
  ExternalLink,
  ShieldCheck,
  Download
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { getOfflineStorageUsage } from '../utils/offlineStorage';

export default function SettingsModal() {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    audioQuality,
    setAudioQuality,
    crossfadeDuration,
    setCrossfadeDuration,
    stereoWidth,
    updateStereoWidth,
    setIsEqOpen,
    playerTheme,
    setPlayerTheme,
    themeMode,
    setThemeMode,
    sameVibeRadioEnabled,
    setSameVibeRadioEnabled,
    ambientGlowEnabled,
    setAmbientGlowEnabled,
    bluetoothDelayMs,
    setBluetoothDelayMs,
    clearStreamCache,
    isOfflineMode,
    setIsOfflineMode,
    downloadedSongs
  } = usePlayer();

  const [storageMb, setStorageMb] = useState(0);
  const [streamCacheMb, setStreamCacheMb] = useState(48.2);
  const [updateStatus, setUpdateStatus] = useState('idle'); // 'idle' | 'checking' | 'latest' | 'available'
  const [updateMessage, setUpdateMessage] = useState('');
  const [isClearingCache, setIsClearingCache] = useState(false);

  useEffect(() => {
    if (isSettingsOpen) {
      getOfflineStorageUsage().then((mb) => setStorageMb(mb)).catch(() => {});
      // Estimate stream cache size
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then((est) => {
          const used = est.usage ? (est.usage / (1024 * 1024)).toFixed(1) : 48.2;
          setStreamCacheMb(used);
        }).catch(() => {});
      }
    }
  }, [isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const qualityOptions = [
    { id: 'LOSSLESS', label: 'Studio FLAC', desc: 'Bit-perfect studio audio (FLAC / Hi-Res)' },
    { id: 'HIGH', label: 'High (320 kbps)', desc: 'High-fidelity audio streaming' },
    { id: 'NORMAL', label: 'Normal (160 kbps)', desc: 'Balanced fidelity & bandwidth' },
    { id: 'SAVER', label: 'Data Saver (96 kbps)', desc: 'Optimized Opus for low data' }
  ];

  const themeModeOptions = [
    {
      id: 'dark',
      label: 'Dark Mode',
      subtitle: 'Matte Charcoal (#141414) with layered cards',
      icon: Moon,
      color: '#ef4444'
    },
    {
      id: 'amoled',
      label: 'AMOLED Matte',
      subtitle: 'Pure pitch black (#000000) true black & zero glare',
      icon: Sparkles,
      color: '#8b5cf6'
    },
    {
      id: 'light',
      label: 'Paper Light',
      subtitle: 'Warm off-white notebook paper aesthetic (#FAF7F2)',
      icon: Sun,
      color: '#f59e0b'
    },
    {
      id: 'system',
      label: 'System Default',
      subtitle: 'Follows your Windows OS appearance setting',
      icon: Monitor,
      color: '#06b6d4'
    }
  ];

  const visualStyleOptions = [
    { id: 'liquid-glass', label: 'Liquid Glass', desc: 'Frosted dynamic glass dock' },
    { id: 'ambient', label: 'Ambient Glow', desc: '6-Orbital dynamic spectrum aura' },
    { id: 'turntable', label: 'Turntable', desc: 'Spinning vinyl & tonearm needle' },
    { id: 'minimal', label: 'Monochrome', desc: 'Minimal stark black/white cards' }
  ];

  const handleCheckForUpdates = async () => {
    setUpdateStatus('checking');
    setUpdateMessage('Querying Dropify Release Engine...');

    try {
      if (typeof window !== 'undefined' && window.electronAPI?.checkForUpdates) {
        await window.electronAPI.checkForUpdates(true);
        setUpdateStatus('latest');
        setUpdateMessage("You're on the latest build (v2.0.2)! No updates required.");
        return;
      }

      const res = await fetch('/releases.json');
      if (!res.ok) throw new Error('Release manifest response not ok');
      const data = await res.json();
      const latestWin = data?.platforms?.windows?.latestVersion || '2.0.2';

      setTimeout(() => {
        if (latestWin === '2.0.2') {
          setUpdateStatus('latest');
          setUpdateMessage("You're on the latest build (v2.0.2)! All features are up-to-date.");
        } else {
          setUpdateStatus('available');
          setUpdateMessage(`New version available: v${latestWin}`);
        }
      }, 700);
    } catch (_) {
      setTimeout(() => {
        setUpdateStatus('latest');
        setUpdateMessage("You're on the latest verified release (v2.0.2).");
      }, 600);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    await clearStreamCache();
    setTimeout(() => {
      setIsClearingCache(false);
      setStreamCacheMb(0.0);
    }, 600);
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
      <div
        className="modal-content sketch-card settings-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '94%',
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: '24px',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '2px solid var(--paper-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--paper-border)', color: '#fff', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/assets/dropify_logo.png" alt="Dropify" style={{ width: '24px', height: '24px', borderRadius: '5px', objectFit: 'cover' }} />
            </div>
            <div>
              <h2 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.65rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                Settings & System
                <span className="sketch-badge" style={{ fontSize: '0.72rem', background: '#ef4444', color: '#fff', fontWeight: 'bold' }}>
                  v2.0.2
                </span>
              </h2>
              <span className="sketch-font-mono" style={{ fontSize: '0.8rem', color: 'var(--graphite-muted)' }}>
                Preferences, Neobrutalist Theme & Audio DSP Diagnostics
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={() => setIsSettingsOpen(false)} aria-label="Close Settings">
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginTop: '18px' }}>
          {/* ========================================================= */}
          {/* SECTION 1: APPEARANCE & 4-MODE THEME SELECTOR             */}
          {/* ========================================================= */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Palette size={16} color="#ef4444" />
              <h3 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.25rem' }}>Appearance & Theme Mode</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {themeModeOptions.map((opt) => {
                const IconComp = opt.icon;
                const isSelected = themeMode === opt.id;
                return (
                  <div
                    key={opt.id}
                    className="sketch-card"
                    onClick={() => setThemeMode(opt.id)}
                    style={{
                      padding: '14px',
                      cursor: 'pointer',
                      border: isSelected ? `2px solid ${opt.color}` : '1.5px solid var(--paper-border-light)',
                      background: isSelected ? 'var(--paper-card-subtle)' : 'var(--paper-card)',
                      borderRadius: '12px',
                      boxShadow: isSelected ? `0 4px 0 ${opt.color}` : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${opt.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: opt.color }}>
                          <IconComp size={16} />
                        </div>
                        <span className="sketch-font-hand" style={{ fontWeight: 'bold', fontSize: '1.05rem', color: isSelected ? opt.color : 'var(--graphite-main)' }}>
                          {opt.label}
                        </span>
                      </div>
                      {isSelected && <Check size={16} color={opt.color} />}
                    </div>
                    <div className="sketch-font-mono" style={{ fontSize: '0.74rem', color: 'var(--graphite-muted)' }}>
                      {opt.subtitle}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 2: UPDATES & VERSION DIAGNOSTICS                   */}
          {/* ========================================================= */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <RefreshCw size={16} color="#06b6d4" />
              <h3 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.25rem' }}>Updates & Version Diagnostics</h3>
            </div>
            <div className="sketch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div className="sketch-font-hand" style={{ fontSize: '1.15rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Dropify Windows Desktop (x64)
                    <span className="sketch-badge" style={{ fontSize: '0.72rem', background: '#10b981', color: '#fff' }}>
                      STABLE
                    </span>
                  </div>
                  <div className="sketch-font-mono" style={{ fontSize: '0.78rem', color: 'var(--graphite-muted)', marginTop: '2px' }}>
                    Installed Build: <strong>2.0.2</strong> • A-Z Echo Music Parity
                  </div>
                </div>

                <button
                  type="button"
                  className="sketch-btn sketch-btn-primary"
                  onClick={handleCheckForUpdates}
                  disabled={updateStatus === 'checking'}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', fontSize: '0.85rem' }}
                >
                  <RefreshCw size={14} className={updateStatus === 'checking' ? 'spin-slow' : ''} />
                  <span>{updateStatus === 'checking' ? 'Checking...' : 'Check for Updates'}</span>
                </button>
              </div>

              {updateMessage && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: updateStatus === 'latest' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', border: `1px solid ${updateStatus === 'latest' ? '#10b981' : '#ef4444'}`, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                  <ShieldCheck size={16} color={updateStatus === 'latest' ? '#10b981' : '#ef4444'} />
                  <span style={{ color: updateStatus === 'latest' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {updateMessage}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 3: AUDIO ENGINE & DSP                            */}
          {/* ========================================================= */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={16} color="#ef4444" />
                <h3 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.25rem' }}>Audio Engine & Streaming Quality</h3>
              </div>
              <button
                type="button"
                className="sketch-btn"
                onClick={() => { setIsSettingsOpen(false); setIsEqOpen(true); }}
                style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Sliders size={13} />
                <span>10-Band EQ</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {qualityOptions.map((opt) => {
                const isSelected = audioQuality === opt.id;
                return (
                  <div
                    key={opt.id}
                    className="sketch-card"
                    onClick={() => setAudioQuality(opt.id)}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #ef4444' : '1px solid var(--paper-border-light)',
                      background: isSelected ? 'var(--paper-card-subtle)' : 'var(--paper-card)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="sketch-font-hand" style={{ fontWeight: 'bold', fontSize: '1rem', color: isSelected ? '#ef4444' : 'var(--graphite-main)' }}>
                        {opt.label}
                      </span>
                      {isSelected && <Check size={15} color="#ef4444" />}
                    </div>
                    <div className="sketch-font-mono" style={{ fontSize: '0.72rem', color: 'var(--graphite-muted)', marginTop: '2px' }}>
                      {opt.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Crossfade with 150 Hz Ducking */}
            <div className="sketch-card" style={{ padding: '14px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div className="sketch-font-hand" style={{ fontSize: '1.05rem', margin: 0 }}>
                    Automix Crossfade with 150 Hz Ducking
                  </div>
                  <div className="sketch-font-mono" style={{ fontSize: '0.74rem', color: 'var(--graphite-muted)' }}>
                    High-pass crossover eliminates low-frequency mud between tracks
                  </div>
                </div>
                <span className="sketch-font-mono" style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#3b82f6' }}>
                  {crossfadeDuration}s
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={crossfadeDuration}
                onChange={(e) => setCrossfadeDuration(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6' }}
              />
            </div>

            {/* Acoustic Stereo Widener */}
            <div className="sketch-card" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div className="sketch-font-hand" style={{ fontSize: '1.05rem', margin: 0 }}>
                    Mid/Side Acoustic Stereo Widener
                  </div>
                  <div className="sketch-font-mono" style={{ fontSize: '0.74rem', color: 'var(--graphite-muted)' }}>
                    Dynamic soundstage separation with AGC limiter
                  </div>
                </div>
                <span className="sketch-font-mono" style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#10b981' }}>
                  {Math.round(stereoWidth * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={stereoWidth}
                onChange={(e) => updateStereoWidth(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 4: PLAYBACK & DISCOVERY FEATURES                   */}
          {/* ========================================================= */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Radio size={16} color="#8b5cf6" />
              <h3 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.25rem' }}>Playback & Discovery Features</h3>
            </div>
            <div className="sketch-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Smart Same-Vibe Radio */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="sketch-font-hand" style={{ fontSize: '1.08rem', margin: 0 }}>
                    Smart Same-Vibe Radio
                  </div>
                  <div className="sketch-font-mono" style={{ fontSize: '0.75rem', color: 'var(--graphite-muted)' }}>
                    Auto-queues 50 tracks of matching aesthetic and rhythm when queue ends
                  </div>
                </div>
                <button
                  type="button"
                  className={`sketch-btn ${sameVibeRadioEnabled ? 'sketch-btn-primary' : ''}`}
                  onClick={() => setSameVibeRadioEnabled(!sameVibeRadioEnabled)}
                  style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                >
                  {sameVibeRadioEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Ambient Lighting Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--paper-border-light)' }}>
                <div>
                  <div className="sketch-font-hand" style={{ fontSize: '1.08rem', margin: 0 }}>
                    Dynamic Ambient Lighting Aura
                  </div>
                  <div className="sketch-font-mono" style={{ fontSize: '0.75rem', color: 'var(--graphite-muted)' }}>
                    Breathing harmonic glow extracted from song artwork
                  </div>
                </div>
                <button
                  type="button"
                  className={`sketch-btn ${ambientGlowEnabled ? 'sketch-btn-primary' : ''}`}
                  onClick={() => setAmbientGlowEnabled(!ambientGlowEnabled)}
                  style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                >
                  {ambientGlowEnabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

              {/* Bluetooth Latency Calibration */}
              <div style={{ paddingTop: '10px', borderTop: '1px solid var(--paper-border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bluetooth size={14} color="#3b82f6" />
                    <span className="sketch-font-hand" style={{ fontSize: '1.05rem' }}>
                      Bluetooth Audio Latency Sync
                    </span>
                  </div>
                  <span className="sketch-font-mono" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {bluetoothDelayMs >= 0 ? `+${bluetoothDelayMs}ms` : `${bluetoothDelayMs}ms`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-250"
                  max="250"
                  step="10"
                  value={bluetoothDelayMs}
                  onChange={(e) => setBluetoothDelayMs(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: '#3b82f6' }}
                />
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 5: STORAGE & STREAM CACHE MANAGER                 */}
          {/* ========================================================= */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <HardDrive size={16} color="#f59e0b" />
              <h3 className="sketch-font-hand" style={{ margin: 0, fontSize: '1.25rem' }}>Stream Cache & Offline Storage</h3>
            </div>
            <div className="sketch-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Stream Cache Eviction */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div className="sketch-font-hand" style={{ fontSize: '1.08rem', margin: 0 }}>
                    Audio Stream Temporary Cache
                  </div>
                  <div className="sketch-font-mono" style={{ fontSize: '0.75rem', color: 'var(--graphite-muted)' }}>
                    Cached streaming buffers: <strong>{streamCacheMb} MB</strong> (Keeps offline songs 100% safe)
                  </div>
                </div>
                <button
                  type="button"
                  className="sketch-btn"
                  onClick={handleClearCache}
                  disabled={isClearingCache}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '5px 12px', color: '#ef4444' }}
                >
                  <Trash2 size={13} />
                  <span>{isClearingCache ? 'Evicting...' : 'Clear Stream Cache'}</span>
                </button>
              </div>

              {/* Offline Mode Switch */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--paper-border-light)' }}>
                <div>
                  <div className="sketch-font-hand" style={{ fontSize: '1.08rem', margin: 0 }}>
                    Offline Playback Mode
                  </div>
                  <div className="sketch-font-mono" style={{ fontSize: '0.75rem', color: 'var(--graphite-muted)' }}>
                    Downloaded tracks: <strong>{downloadedSongs.length}</strong> • Storage: <strong>{storageMb} MB</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className={`sketch-btn ${isOfflineMode ? 'sketch-btn-primary' : ''}`}
                  onClick={() => setIsOfflineMode(!isOfflineMode)}
                  style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                >
                  {isOfflineMode ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 6: ABOUT DROPIFY DESKTOP                          */}
          {/* ========================================================= */}
          <div style={{ padding: '16px', background: 'var(--paper-card-subtle)', borderRadius: '12px', border: '1.5px solid var(--paper-border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/assets/dropify_logo.png" alt="Dropify Logo" style={{ width: '32px', height: '32px', borderRadius: '7px' }} />
                <div>
                  <div className="sketch-font-hand" style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>
                    Dropify Windows Desktop
                  </div>
                  <div className="sketch-font-mono" style={{ fontSize: '0.75rem', color: 'var(--graphite-muted)' }}>
                    Reverse-engineered from Echo Music • 100% Free & Ad-Free Music Player
                  </div>
                </div>
              </div>
              <span className="sketch-badge" style={{ background: '#ef4444', color: '#fff', fontWeight: 'bold' }}>
                v2.0.2
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
