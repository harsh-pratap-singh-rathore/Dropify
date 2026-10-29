import React from 'react';
import { Sliders, Bell, Disc, Bookmark, Monitor, Radio } from 'lucide-react';

export default function FeatureGrid() {
  const features = [
    {
      title: "2D Tactile Neobrutalism",
      badge: "Android & Windows",
      badgeClass: "badge-both",
      icon: <Disc size={24} />,
      desc: "Distinctive paper-and-ink visual identity. Bold black outlines, warm ivory canvas, physical drop-shadows, and zero generic AI gradients or glassy slop.",
      specs: ["Warm Canvas", "Tactile Press", "Clean Contrast"]
    },
    {
      title: "System Notification Like/Unlike",
      badge: "Android Specific",
      badgeClass: "badge-android",
      icon: <Bell size={24} />,
      desc: "Control your music and favorite tracks without unlocking your phone. Integrated Media3 notification with direct Like toggle across Samsung, Pixel, Xiaomi & OnePlus.",
      specs: ["Media3 / ExoPlayer", "Lockscreen Art", "One-Tap Like"]
    },
    {
      title: "10-Band Graphic DSP Equalizer",
      badge: "Android & Windows",
      badgeClass: "badge-both",
      icon: <Sliders size={24} />,
      desc: "Shape your sound with surgical precision across 10 audio bands (32Hz to 16kHz). Custom gains, bass boost, and AutoEq headphone profile compensation.",
      specs: ["10 Frequencies", "AutoEq Presets", "Real-Time Filter"]
    },
    {
      title: "Custom Music Notebooks",
      badge: "Android & Windows",
      badgeClass: "badge-both",
      icon: <Bookmark size={24} />,
      desc: "Curate your personal listening journals. Organize tracks into custom 'Notebooks', maintain a dedicated Liked Songs vault, and enjoy instant Shuffle All.",
      specs: ["Notebook Manager", "Liked Songs Vault", "Persistent Offline Store"]
    },
    {
      title: "Taskbar Thumbar & Tray Mini-Player",
      badge: "Windows Specific",
      badgeClass: "badge-windows",
      icon: <Monitor size={24} />,
      desc: "Seamless Windows integration. Hover over your taskbar icon to skip or pause tracks via native Thumbar buttons, minimize to system tray, and use global media keys.",
      specs: ["Taskbar Controls", "System Tray", "Global Media Keys"]
    },
    {
      title: "Discord Rich Presence",
      badge: "Windows Specific",
      badgeClass: "badge-windows",
      icon: <Radio size={24} />,
      desc: "Showcase your taste on Discord. Dropify automatically broadcasts current track, artist, album art, and live listening elapsed time to your Discord status.",
      specs: ["Rich Presence RPC", "Live Elapsed Time", "Album Artwork"]
    }
  ];

  return (
    <section id="features" className="landing-section" style={{ backgroundColor: 'var(--color-canvas-alt)', borderTop: 'var(--border-thick)', borderBottom: 'var(--border-thick)' }}>
      <div className="landing-container">
        <div className="section-header">
          <div className="section-tag cyan">Engineered Capabilities</div>
          <h2 className="section-title">Verified features. Zero marketing fluff.</h2>
          <p className="section-subtitle">
            Every capability listed here is implemented and running in the actual Dropify Android Kotlin and Windows Electron production codebases.
          </p>
        </div>

        <div className="features-grid">
          {features.map((f, idx) => (
            <div key={idx} className="neo-card feature-card">
              <div className="washi-tape"></div>
              <div className="feature-top">
                <div className="feature-icon-circle">
                  {f.icon}
                </div>
                <span className={`feature-badge ${f.badgeClass}`}>{f.badge}</span>
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
              <div className="feature-specs">
                {f.specs.map((s, sIdx) => (
                  <span key={sIdx} style={{ background: '#F0ECE4', padding: '2px 8px', borderRadius: 4, border: '1px solid #000' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
