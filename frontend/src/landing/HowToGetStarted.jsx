import React from 'react';

export default function HowToGetStarted() {
  const steps = [
    {
      num: "01",
      title: "Choose Platform",
      desc: "Select Android (universal APK) or Windows PC (Installer or Portable) based on your listening device."
    },
    {
      num: "02",
      title: "Grab the Build",
      desc: "Download the signed v1.0.1 package directly from our high-speed Vercel CDN or GitHub mirror."
    },
    {
      num: "03",
      title: "Quick Install",
      desc: "Tap the APK on Android (enable 'install unknown apps') or run the .exe setup on Windows."
    },
    {
      num: "04",
      title: "Pure Listening",
      desc: "Spin the turntable, view synchronized lyrics, adjust your EQ, and enjoy 100% ad-free music."
    }
  ];

  return (
    <section className="landing-section" style={{ backgroundColor: 'var(--color-canvas-alt)', borderTop: 'var(--border-thick)', borderBottom: 'var(--border-thick)' }}>
      <div className="landing-container">
        <div className="section-header">
          <div className="section-tag pink">Fast Setup</div>
          <h2 className="section-title">Up and running in 30 seconds.</h2>
          <p className="section-subtitle">
            No registration, no email verification, and no card details required.
          </p>
        </div>

        <div className="steps-grid">
          {steps.map((s, idx) => (
            <div key={idx} className="neo-card step-card">
              <div className="washi-tape"></div>
              <div className="step-number-badge">{s.num}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
