import React, { useState } from 'react';
import { Download, Sparkles, Disc, FileText, LayoutGrid, ArrowRight, ShieldCheck } from 'lucide-react';
import screenshotTurntable from '../assets/brand/screenshot_turntable.jpg';
import screenshotHome from '../assets/brand/screenshot_home.jpg';
import screenshotLyrics from '../assets/brand/screenshot_lyrics.jpg';

export default function HeroSection({ onLaunchWebPlayer }) {
  const [activeScreen, setActiveScreen] = useState('turntable'); // 'turntable' | 'home' | 'lyrics'

  const screens = {
    turntable: {
      image: screenshotTurntable,
      title: "Turntable Vinyl Engine",
      alt: "Dropify Turntable Vinyl Screen",
      badge1: "⚡ 320k Opus Stream",
      badge2: "🎛️ 10-Band DSP Equalizer"
    },
    home: {
      image: screenshotHome,
      title: "Circadian Discovery",
      alt: "Dropify Home & Soundscapes Screen",
      badge1: "☕ Morning Coffee & Lo-Fi",
      badge2: "⚡ Speed Dial 3x3 Grid"
    },
    lyrics: {
      image: screenshotLyrics,
      title: "Notebook Synced Lyrics",
      alt: "Dropify Real-time Synced Lyrics Screen",
      badge1: "📝 Paper-Ruled Stationery",
      badge2: "✨ Highlighter Active Sync"
    }
  };

  const current = screens[activeScreen];

  return (
    <section id="hero" className="landing-section hero-section">
      <div className="landing-container">
        <div className="hero-grid">
          {/* Left Column: Brand Copy & Actions */}
          <div className="hero-content">
            <div className="hero-pill-badge">
              <span className="hero-dot"></span>
              <span>SOUND UNIVERSE // VERSION 1.0.1 STABLE</span>
            </div>

            <h1 className="hero-heading">
              Your music. <br />
              <span className="hero-highlight">Your rules.</span>
            </h1>

            <div className="hero-quote-card">
              <p className="hero-quote-text">
                “Discover a better way to listen. A clean, modern music experience designed around the music—not the interruptions.”
              </p>
            </div>

            <p className="hero-description">
              Dropify is a crafted, tactile music player for Android and Windows PC. 100% free and completely ad-free—no 30-second commercial interruptions, no subscription paywalls, and no corporate clutter. Just pure high-fidelity soundscapes, real-time synced lyrics, and a spinning turntable.
            </p>

            <div className="hero-actions">
              <a href="#downloads" className="neo-btn neo-btn-primary">
                <Download size={18} />
                <span>Download Dropify (v1.0.1)</span>
              </a>

              {onLaunchWebPlayer && (
                <button
                  onClick={onLaunchWebPlayer}
                  className="neo-btn neo-btn-secondary"
                  title="Try Dropify directly in your web browser"
                >
                  <span>Launch Web Player</span>
                  <ArrowRight size={18} />
                </button>
              )}
            </div>

            {/* Trust Markers */}
            <div className="hero-trust-row">
              <div className="trust-item">
                <ShieldCheck size={18} />
                <span>100% Free Forever</span>
              </div>
              <div className="trust-item">
                <Sparkles size={18} />
                <span>Zero Ads & Popups</span>
              </div>
              <div className="trust-item">
                <Disc size={18} />
                <span>Android & Windows</span>
              </div>
            </div>
          </div>

          {/* Right Column: Flagship Smartphone Showcase */}
          <div className="hero-visual-wrapper">
            <div className="smartphone-stage">
              {/* Dynamic Floating Badges */}
              <div className="floating-badge badge-float-1">
                <span>{current.badge1}</span>
              </div>

              <div className="floating-badge badge-float-2">
                <span>{current.badge2}</span>
              </div>

              {/* Realistic Flagship Smartphone Frame */}
              <div className="smartphone-frame">
                {/* Dynamic Camera Island Pill */}
                <div className="smartphone-camera-pill">
                  <span className="camera-lens-dot"></span>
                </div>

                {/* Smartphone Display Screen */}
                <div className="smartphone-screen">
                  <img
                    key={activeScreen}
                    src={current.image}
                    alt={current.alt}
                    loading="eager"
                  />
                </div>
              </div>
            </div>

            {/* Screen Selector Tabs */}
            <div className="screen-selector-tabs">
              <button
                className={`screen-tab-btn ${activeScreen === 'turntable' ? 'active' : ''}`}
                onClick={() => setActiveScreen('turntable')}
              >
                <Disc size={15} />
                <span className="tab-label-full">Turntable Player</span>
                <span className="tab-label-short">Turntable</span>
              </button>
              <button
                className={`screen-tab-btn ${activeScreen === 'home' ? 'active' : ''}`}
                onClick={() => setActiveScreen('home')}
              >
                <LayoutGrid size={15} />
                <span className="tab-label-full">Home & Mixes</span>
                <span className="tab-label-short">Home</span>
              </button>
              <button
                className={`screen-tab-btn ${activeScreen === 'lyrics' ? 'active' : ''}`}
                onClick={() => setActiveScreen('lyrics')}
              >
                <FileText size={15} />
                <span className="tab-label-full">Synced Lyrics</span>
                <span className="tab-label-short">Lyrics</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
