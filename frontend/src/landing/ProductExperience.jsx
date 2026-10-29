import React from 'react';
import { Disc, FileText, Compass, Check } from 'lucide-react';
import screenshotTurntable from '../assets/brand/screenshot_turntable.jpg';
import screenshotLyrics from '../assets/brand/screenshot_lyrics.jpg';
import screenshotHome from '../assets/brand/screenshot_home.jpg';

export default function ProductExperience() {
  return (
    <section id="experience" className="landing-section">
      <div className="landing-container">
        <div className="section-header">
          <div className="section-tag pink">App Experience</div>
          <h2 className="section-title">Designed with intention. Built for sound.</h2>
          <p className="section-subtitle">
            Every screen combines the nostalgic tactile joy of analog audio equipment with modern digital streaming precision.
          </p>
        </div>

        <div className="experience-layout">
          {/* Row 1: The Turntable Player */}
          <div className="experience-row">
            <div className="experience-visual">
              <div className="experience-phone-chassis">
                <div className="smartphone-camera-pill">
                  <span className="camera-lens-dot"></span>
                </div>
                <img src={screenshotTurntable} alt="Dropify Turntable Vinyl Player" loading="lazy" />
              </div>
            </div>

            <div className="experience-content">
              <div className="experience-pills">
                <span className="experience-pill pill-pink">
                  <Disc size={14} />
                  <span>Turntable Mode</span>
                </span>
                <span className="experience-pill pill-yellow">
                  <span>320k Opus Stream</span>
                </span>
                <span className="experience-pill pill-cyan">
                  <span>10-Band DSP</span>
                </span>
              </div>

              <h3 className="experience-title">The tactile joy of a physical vinyl turntable.</h3>
              <p className="experience-desc">
                Dropify turns digital streaming into a tactile ritual. Watch the grooved vinyl disc spin on your screen with authentic center sticker artwork, tactile scrub timeline, and quick toggle between record view and synchronized lyrics.
              </p>

              <ul className="experience-bullet-list">
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Concentric grooved vinyl record with live rotational animation</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Real-time audio quality badges (320k Opus, 10-Band EQ, Stationery Sync)</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Tactile 3D-styled play/pause, repeat, shuffle, and instant one-tap like button</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Row 2: Notebook Synced Lyrics (Reversed layout) */}
          <div className="experience-row reverse">
            <div className="experience-visual">
              <div className="experience-phone-chassis">
                <div className="smartphone-camera-pill">
                  <span className="camera-lens-dot"></span>
                </div>
                <img src={screenshotLyrics} alt="Dropify Real-time Synced Lyrics" loading="lazy" />
              </div>
            </div>

            <div className="experience-content">
              <div className="experience-pills">
                <span className="experience-pill pill-yellow">
                  <FileText size={14} />
                  <span>Notebook Stationery</span>
                </span>
                <span className="experience-pill pill-pink">
                  <span>Highlighter Active Sync</span>
                </span>
              </div>

              <h3 className="experience-title">Notebook-ruled real-time synced lyrics.</h3>
              <p className="experience-desc">
                Sing along with zero lag. Lyrics appear laid out on clean paper ruled lines, with an iconic yellow highlighter badge dynamically framing the current vocal phrase as the song plays.
              </p>

              <ul className="experience-bullet-list">
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Precision timestamp tracking that auto-scrolls with the vocalist</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Metadata Cleaner engine that strips YouTube title noise for 99% lyric match accuracy</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Clean typography with high contrast for easy reading in daylight or dark</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Row 3: Home & Circadian Discovery */}
          <div className="experience-row">
            <div className="experience-visual">
              <div className="experience-phone-chassis">
                <div className="smartphone-camera-pill">
                  <span className="camera-lens-dot"></span>
                </div>
                <img src={screenshotHome} alt="Dropify Home Screen and Circadian Mixes" loading="lazy" />
              </div>
            </div>

            <div className="experience-content">
              <div className="experience-pills">
                <span className="experience-pill pill-cyan">
                  <Compass size={14} />
                  <span>Circadian Rhythm</span>
                </span>
                <span className="experience-pill pill-pink">
                  <span>Speed Dial 3x3</span>
                </span>
              </div>

              <h3 className="experience-title">Soundscapes attuned to the rhythm of your day.</h3>
              <p className="experience-desc">
                Dropify’s circadian music engine curates soundscapes that match your daily workflow—from uplifting Morning Coffee to deep Focus Flow and late-night lo-fi chillouts.
              </p>

              <ul className="experience-bullet-list">
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Time-aware mood filters (Morning Coffee, Focus Flow, Midnight Lo-Fi)</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Speed Dial quick access grid with one-tap "Shuffle All"</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Docked mini-player with edge-to-edge system navigation safe insets</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
