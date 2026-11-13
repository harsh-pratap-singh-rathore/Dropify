import React from 'react';
import { Disc, FileText, Compass, Check, Video, User, Sparkles, Radio } from 'lucide-react';
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
            Every screen combines the nostalgic tactile joy of analog audio equipment with modern digital streaming precision and pure 2D Neobrutalism.
          </p>
        </div>

        <div className="experience-layout">
          {/* Row 1: The Turntable Player & 1:1 In-Card Video */}
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
                  <Video size={14} />
                  <span>1:1 In-Card Video</span>
                </span>
                <span className="experience-pill pill-cyan">
                  <span>320k Opus Stream</span>
                </span>
              </div>

              <h3 className="experience-title">Physical vinyl turntable & 1:1 in-card music video.</h3>
              <p className="experience-desc">
                Dropify turns digital streaming into a tactile ritual. Watch the grooved vinyl disc spin on your screen with authentic center sticker artwork, tactile scrub timeline, or seamlessly flip to 1:1 square video with reactive dynamic ambient glow breathing behind.
              </p>

              <ul className="experience-bullet-list">
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Concentric grooved vinyl record with live rotational physics and stylus animation</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>1:1 Square Video Toggle: switch between album turntable and synced video anytime</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Atmospheric dynamic ambient lighting reflecting album palette in real-time</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Row 2: Remapped Home & 2x3 Bento Stations (Reversed layout) */}
          <div className="experience-row reverse">
            <div className="experience-visual">
              <div className="experience-phone-chassis">
                <div className="smartphone-camera-pill">
                  <span className="camera-lens-dot"></span>
                </div>
                <img src={screenshotHome} alt="Dropify Remapped Home Screen" loading="lazy" />
              </div>
            </div>

            <div className="experience-content">
              <div className="experience-pills">
                <span className="experience-pill pill-cyan">
                  <Compass size={14} />
                  <span>Remapped Home</span>
                </span>
                <span className="experience-pill pill-yellow">
                  <span>2x3 Bento Stations</span>
                </span>
                <span className="experience-pill pill-pink">
                  <span>Radar Vinyl Card</span>
                </span>
              </div>

              <h3 className="experience-title">Remapped Bento stations attuned to your daily rhythm.</h3>
              <p className="experience-desc">
                Dropify v2.0.3.1 completely re-architects the Home screen with high-density Bento quick-play stations: jump into Liked Songs, Circadian Daily Mix, Instant 10-Track Shuffle, and sound notebooks in a single tap from launch.
              </p>

              <ul className="experience-bullet-list">
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>2x3 Bento Station Grid: Liked Vault, Circadian Mix, Instant Shuffle, and Notebooks</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Radar Spotlight Vinyl Billboard: Daily featured track showcased on physical record</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Billboard Top 5 Chart Shelf with ranked 01–05 typography and one-tap queueing</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Row 3: Dedicated Artist Hub & Song-to-Artist Recommendation */}
          <div className="experience-row">
            <div className="experience-visual">
              <div className="experience-phone-chassis">
                <div className="smartphone-camera-pill">
                  <span className="camera-lens-dot"></span>
                </div>
                <img src={screenshotHome} alt="Dropify Artist Profiles & Discographies" loading="lazy" />
              </div>
            </div>

            <div className="experience-content">
              <div className="experience-pills">
                <span className="experience-pill pill-pink">
                  <User size={14} />
                  <span>Artist Discographies</span>
                </span>
                <span className="experience-pill pill-cyan">
                  <Sparkles size={14} />
                  <span>Smart Artist Pills</span>
                </span>
              </div>

              <h3 className="experience-title">Pure artist discographies & smart recommendations.</h3>
              <p className="experience-desc">
                Searching for your favorite songs automatically suggests the primary artist as an interactive pill. Tap to open their dedicated 2D artist profile with verified badge, subscriber count, and pure artist catalog free of label re-uploads.
              </p>

              <ul className="experience-bullet-list">
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Song-to-Artist Smart Pill: Search "Tu Hai Kahan" → get instant "AUR" recommendation pill</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Pure Artist Isolation: Discard record label distributor spam for authentic catalogs</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Interactive Artist Tags everywhere: tap artist name in player to open discography</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Row 4: Notebook Synced Lyrics & Same-Vibe Radio (Reversed layout) */}
          <div className="experience-row reverse">
            <div className="experience-visual">
              <div className="experience-phone-chassis">
                <div className="smartphone-camera-pill">
                  <span className="camera-lens-dot"></span>
                </div>
                <img src={screenshotLyrics} alt="Dropify Synced Lyrics & Same-Vibe Radio" loading="lazy" />
              </div>
            </div>

            <div className="experience-content">
              <div className="experience-pills">
                <span className="experience-pill pill-yellow">
                  <FileText size={14} />
                  <span>Notebook Stationery</span>
                </span>
                <span className="experience-pill pill-pink">
                  <Radio size={14} />
                  <span>Same-Vibe Radio</span>
                </span>
              </div>

              <h3 className="experience-title">Notebook-ruled lyrics & intelligent same-vibe radio.</h3>
              <p className="experience-desc">
                Sing along with zero lag on paper-ruled stationery lines with yellow highlighter active sync. When your song finishes, Dropify’s Same-Vibe Radio discovers related songs and artists without looping duplicate re-uploads of the exact same song.
              </p>

              <ul className="experience-bullet-list">
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Precision timestamp tracking that auto-scrolls smoothly with the vocal cadence</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Same-Vibe Radio: Continuous algorithmic queueing matching the vibe of current track</span>
                </li>
                <li className="bullet-item">
                  <span className="bullet-icon"><Check size={14} /></span>
                  <span>Anti-Reupload Filter: strictly prevents repetitive duplicate uploads from different channels</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
