import React from 'react';
import { Sparkles, Ban, Music } from 'lucide-react';

export default function BrandPromise() {
  const promises = [
    {
      number: "01",
      icon: <Sparkles size={28} />,
      headline: "100% Free",
      description: "No subscription tiers, no payment walls, and no premium upsells. Every feature—from the 10-band equalizer to high-definition streaming—is accessible to everyone from day one."
    },
    {
      number: "02",
      icon: <Ban size={28} />,
      headline: "100% Ad-Free",
      description: "Music should never be cut off by 30-second audio advertisements or deceptive video popups. Dropify strips away promotional clutter so you hear pure sound from start to finish."
    },
    {
      number: "03",
      icon: <Music size={28} />,
      headline: "Made for Music",
      description: "Engineered specifically for music appreciation. Enjoy a rotating vinyl turntable, synchronized notebook-ruled lyrics, custom collections, and audiophile sound shaping."
    }
  ];

  return (
    <section className="landing-section" style={{ backgroundColor: 'var(--color-canvas-alt)', borderTop: 'var(--border-thick)', borderBottom: 'var(--border-thick)' }}>
      <div className="landing-container">
        <div className="section-header">
          <div className="section-tag pink">Our Core Philosophy</div>
          <h2 className="section-title">Built for listeners, not advertisers.</h2>
          <p className="section-subtitle">
            Most modern music apps have turned into billboards with music playing in the background. Dropify returns to what matters: the audio, the art, and your peace of mind.
          </p>
        </div>

        <div className="promise-grid">
          {promises.map((p, idx) => (
            <div key={idx} className="neo-card promise-card">
              <div className="washi-tape"></div>
              <div className="promise-icon-box">
                {p.icon}
              </div>
              <span className="promise-number">PILLAR // {p.number}</span>
              <h3 className="promise-headline">{p.headline}</h3>
              <p className="promise-text">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
