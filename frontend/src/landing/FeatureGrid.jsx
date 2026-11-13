import React from 'react';
import { Sliders, Bell, Disc, Bookmark, Monitor, Radio, LayoutGrid, User, Sparkles, Video, Palette, Database } from 'lucide-react';

export default function FeatureGrid() {
  const features = [
    {
      title: "Remapped 2x3 Bento Station Grid",
      badge: "Android & Windows",
      badgeClass: "badge-both",
      icon: <LayoutGrid size={24} />,
      desc: "Fast-resume home hub. Jump into Liked Songs, Circadian Daily Mix, Instant 10-Track Shuffle, Sound Notebooks, and latest listening sessions in a single tap.",
      specs: ["2x3 Bento Grid", "Instant Shuffle", "Liked Vault"]
    },
    {
      title: "Radar Spotlight Vinyl Billboard",
      badge: "Android & Windows",
      badgeClass: "badge-both",
      icon: <Disc size={24} />,
      desc: "Daily featured track presented on a physical 2D record card with concentric vinyl groove rings, real-time rotating stylus, interactive genre badges, and playlist actions.",
      specs: ["33⅓ RPM Physics", "Grooved Rings", "Genre Pills"]
    },
    {
      title: "Dedicated Artist Discographies",
      badge: "Android & Windows",
      badgeClass: "badge-both",
      icon: <User size={24} />,
      desc: "Search any artist (AUR, Arijit Singh, Coldplay, Diljit Dosanjh) to open an authentic 2D profile with verified badge, subscriber count, and pure artist catalog.",
      specs: ["Pure Isolation", "Play All & Shuffle", "Artist Radio"]
    },
    {
      title: "Smart Song-to-Artist Recommendation",
      badge: "Android & Windows",
      badgeClass: "badge-both",
      icon: <Sparkles size={24} />,
      desc: "Search for any song ('tu hai kahan') and Dropify instantly suggests the primary artist ('AUR') as an interactive pill above search results. Tap to jump straight to their hub.",
      specs: ["Smart Pills", "Disambiguation", "One-Tap Catalog"]
    },
    {
      title: "Same-Vibe Radio & Anti-Reupload Filter",
      badge: "Android & Windows",
      badgeClass: "badge-both",
      icon: <Radio size={24} />,
      desc: "Continuous radio algorithm inspired by Echo Music that seeds similar tracks and artists while strictly filtering out duplicate re-uploads of the exact same song.",
      specs: ["Vibe Matching", "Anti-Reupload", "Infinite Stream"]
    },
    {
      title: "1:1 In-Card Video & Ambient Aura",
      badge: "Android & Windows",
      badgeClass: "badge-both",
      icon: <Video size={24} />,
      desc: "Toggle seamlessly between rotating vinyl turntable artwork and 1:1 square music video, with vibrant atmospheric dynamic ambient lighting breathing behind.",
      specs: ["1:1 Aspect Ratio", "Ambient Lighting", "Zero Lag Switch"]
    },
    {
      title: "4-Mode Tactile Theme Engine",
      badge: "Android & Windows",
      badgeClass: "badge-both",
      icon: <Palette size={24} />,
      desc: "Switch between Dark, AMOLED Matte (#000000), Light Paper, and System Theme seamlessly with persistent preference storage and tactile 2D contrast.",
      specs: ["AMOLED Matte", "Light Paper", "System Sync"]
    },
    {
      title: "Stream Cache Manager & Offline Storage",
      badge: "Android & Windows",
      badgeClass: "badge-both",
      icon: <Database size={24} />,
      desc: "Inspect real-time cached streaming size in MB and clear temporary audio stream files with a single tap. User-downloaded offline tracks remain 100% safe.",
      specs: ["Real-time Size", "One-Tap Evict", "Offline Protected"]
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
      title: "System Notification Like/Unlike",
      badge: "Android Specific",
      badgeClass: "badge-android",
      icon: <Bell size={24} />,
      desc: "Control your music and favorite tracks without unlocking your phone. Integrated Media3 notification with direct Like toggle across Samsung, Pixel, Xiaomi & OnePlus.",
      specs: ["Media3 / ExoPlayer", "Lockscreen Art", "One-Tap Like"]
    }
  ];

  return (
    <section id="features" className="landing-section section-canvas-alt">
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
                  <span key={sIdx} className="feature-spec-tag">
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
