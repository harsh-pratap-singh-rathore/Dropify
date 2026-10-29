import React, { useState } from 'react';
import { Smartphone, Monitor, Check, Download, Disc } from 'lucide-react';
import screenshotTurntable from '../assets/brand/screenshot_turntable.jpg';

export default function PlatformShowcase() {
  const [activePlatform, setActivePlatform] = useState('android'); // 'android' | 'windows'

  const eqBands = [
    { freq: '32Hz', gain: '+2dB', height: '65%' },
    { freq: '64Hz', gain: '+3dB', height: '78%' },
    { freq: '125Hz', gain: '+1.5dB', height: '58%' },
    { freq: '250Hz', gain: '0dB', height: '45%' },
    { freq: '500Hz', gain: '-1dB', height: '38%' },
    { freq: '1kHz', gain: '+0.5dB', height: '52%' },
    { freq: '2kHz', gain: '+1.5dB', height: '62%' },
    { freq: '4kHz', gain: '+2.5dB', height: '74%' },
    { freq: '8kHz', gain: '+3dB', height: '82%' },
    { freq: '16kHz', gain: '+2dB', height: '68%' }
  ];

  return (
    <section id="platforms" className="landing-section">
      <div className="landing-container">
        <div className="section-header">
          <div className="section-tag pink">Two Dedicated Native Experiences</div>
          <h2 className="section-title">Built specifically for your device.</h2>
          <p className="section-subtitle">
            Whether on your Android smartphone or your Windows workstation, Dropify delivers a dedicated listening experience tuned to the OS.
          </p>
        </div>

        {/* Platform Toggle Tabs */}
        <div className="platform-tabs-nav">
          <button
            className={`platform-tab-button ${activePlatform === 'android' ? 'active' : ''}`}
            onClick={() => setActivePlatform('android')}
          >
            <Smartphone size={20} />
            <span>Android (APK)</span>
          </button>
          <button
            className={`platform-tab-button ${activePlatform === 'windows' ? 'active' : ''}`}
            onClick={() => setActivePlatform('windows')}
          >
            <Monitor size={20} />
            <span>Windows PC (Desktop)</span>
          </button>
        </div>

        {/* Tab Content 1: Android */}
        {activePlatform === 'android' && (
          <div className="platform-card-wrapper">
            <div className="platform-grid">
              <div className="platform-info-col">
                <div className="platform-badge-row">
                  <span className="platform-meta-tag" style={{ background: 'var(--color-green-light)', color: '#065F46' }}>
                    ANDROID 8.0+ (API 26+)
                  </span>
                  <span className="platform-meta-tag" style={{ background: '#FFF' }}>
                    ARM64 & ARMv7
                  </span>
                </div>

                <h3 className="platform-title">Native Android. Lightweight & battery-conscious.</h3>
                <p className="platform-desc">
                  Built natively with Jetpack Compose and AndroidX Media3 / ExoPlayer. Runs quietly in the background without draining your battery or lagging your device.
                </p>

                <ul className="platform-checklist">
                  <li className="platform-check-item">
                    <span className="check-pill"><Check size={14} /></span>
                    <span>Persistent Foreground Media Service with Lockscreen Controls</span>
                  </li>
                  <li className="platform-check-item">
                    <span className="check-pill"><Check size={14} /></span>
                    <span>Direct Like/Unlike button in system notification drawer</span>
                  </li>
                  <li className="platform-check-item">
                    <span className="check-pill"><Check size={14} /></span>
                    <span>Turntable vinyl animation and paper-ruled synced lyrics</span>
                  </li>
                  <li className="platform-check-item">
                    <span className="check-pill"><Check size={14} /></span>
                    <span>Edge-to-edge system bar insets and smart hierarchical back navigation</span>
                  </li>
                </ul>

                <a href="#downloads" className="neo-btn neo-btn-primary">
                  <Download size={18} />
                  <span>Download Android APK (v1.0.2)</span>
                </a>
              </div>

              <div className="platform-visual-col">
                <div className="experience-phone-chassis platform-phone-chassis">
                  <div className="smartphone-camera-pill">
                    <span className="camera-lens-dot"></span>
                  </div>
                  <img src={screenshotTurntable} alt="Dropify Android Screenshot" loading="lazy" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 2: Windows PC */}
        {activePlatform === 'windows' && (
          <div className="platform-card-wrapper">
            <div className="platform-grid">
              <div className="platform-info-col">
                <div className="platform-badge-row">
                  <span className="platform-meta-tag" style={{ background: 'var(--color-cyan-light)', color: '#0369A1' }}>
                    WINDOWS 10 & 11 (64-BIT)
                  </span>
                  <span className="platform-meta-tag" style={{ background: '#FFF' }}>
                    ELECTRON & NODE.JS
                  </span>
                </div>

                <h3 className="platform-title">Audiophile desktop player with Mica material.</h3>
                <p className="platform-desc">
                  A desktop music workstation designed for extended listening sessions while working, gaming, or coding. Integrated directly into Windows 11 with custom hardware media key hooks.
                </p>

                <ul className="platform-checklist">
                  <li className="platform-check-item">
                    <span className="check-pill"><Check size={14} /></span>
                    <span>Windows Taskbar Thumbar Buttons for instant play/pause/skip</span>
                  </li>
                  <li className="platform-check-item">
                    <span className="check-pill"><Check size={14} /></span>
                    <span>Discord Rich Presence with live track artwork and elapsed timeline</span>
                  </li>
                  <li className="platform-check-item">
                    <span className="check-pill"><Check size={14} /></span>
                    <span>Global Media Keys hook for hardware keyboard control</span>
                  </li>
                  <li className="platform-check-item">
                    <span className="check-pill"><Check size={14} /></span>
                    <span>Both Setup (.exe) installer and Portable zero-install versions</span>
                  </li>
                </ul>

                <a href="#downloads" className="neo-btn neo-btn-primary">
                  <Download size={18} />
                  <span>Download for Windows PC (v1.0.0)</span>
                </a>
              </div>

              <div className="platform-visual-col">
                {/* Windows Desktop Mockup Window */}
                <div className="desktop-preview-frame">
                  <div className="desktop-window-header">
                    <div className="desktop-window-title">
                      <Disc size={14} color="#FF2D55" />
                      <span>Dropify Desktop — Audiophile Player</span>
                    </div>
                    <div className="desktop-window-controls">
                      <span className="window-dot min"></span>
                      <span className="window-dot max"></span>
                      <span className="window-dot close"></span>
                    </div>
                  </div>

                  <div className="desktop-window-body">
                    <div className="desktop-ui-header">
                      <div className="desktop-pill-title">
                        <span>10-Band DSP Graphic Equalizer</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#10B981', background: 'rgba(16,185,129,0.15)', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                        AUTO-EQ ACTIVE
                      </span>
                    </div>

                    {/* Equalizer Frequency Display */}
                    <div className="desktop-eq-bars" style={{ height: 110 }}>
                      {eqBands.map((b, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 }}>
                          <div className="eq-bar" style={{ height: b.height, width: '100%' }}></div>
                          <span style={{ fontSize: '0.62rem', color: '#888', fontFamily: 'var(--font-mono)' }}>{b.freq}</span>
                        </div>
                      ))}
                    </div>

                    <div className="desktop-media-bar">
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Tum Hi Aana (From "Marjaavaan")</div>
                        <div style={{ fontSize: '0.8rem', color: '#999' }}>Payal Dev & Jubin Nautiyal • 320k Opus</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.7rem', background: 'var(--color-pink)', color: '#FFF', padding: '3px 8px', borderRadius: 12, fontWeight: 800 }}>
                          DISCORD RPC
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
