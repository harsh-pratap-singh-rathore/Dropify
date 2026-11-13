import React from 'react';
import { Download, Play } from 'lucide-react';

export default function FinalCta({ onLaunchWebPlayer }) {
  return (
    <section className="landing-section" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div className="landing-container">
        <div className="final-cta-card">
          <div className="final-cta-badge">GET STARTED TODAY</div>
          
          <h2 className="final-cta-title">
            Ready for a better <br />
            listening experience?
          </h2>
          
          <p className="final-cta-subtitle">
            “Your music. Your rules.” Join thousands of listeners enjoying Remapped Bento stations, rotating vinyl showcases, and dedicated artist discographies on Android and Windows PC.
          </p>

          <div className="final-cta-buttons">
            <a href="#downloads" className="neo-btn neo-btn-primary">
              <Download size={18} />
              <span>Get Dropify v2.0.3.1 Free</span>
            </a>

            {onLaunchWebPlayer && (
              <button
                onClick={onLaunchWebPlayer}
                className="neo-btn neo-btn-secondary"
              >
                <Play size={18} fill="currentColor" />
                <span>Launch Web Player</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
