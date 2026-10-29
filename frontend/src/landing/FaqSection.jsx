import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: "What is Dropify?",
      a: "Dropify is a crafted, ad-free music player available as a native Android app, a Windows desktop app, and an interactive web player. It combines high-definition streaming with a 2D tactile design system, rotating vinyl turntable, synchronized lyrics, and a 10-band graphic equalizer."
    },
    {
      q: "Is Dropify truly 100% free with no ads?",
      a: "Yes. Dropify is completely free and contains no audio advertisements, commercial video banners, or paid subscription tiers. You get the full listening experience without interruptions."
    },
    {
      q: "Where does the music come from?",
      a: "Dropify streams music via high-fidelity YouTube Music audio streams (using 320k Opus audio codecs) resolved dynamically through our backend streaming proxy. This gives you access to a catalog of millions of songs, covers, remixes, and soundscapes."
    },
    {
      q: "How do I install the Android APK?",
      a: "Download the dropify-v1.0.1.apk file directly onto your Android device. When you tap to open it, Android may ask permission to 'Install unknown apps' from your browser or file manager. Enable this one-time permission, confirm the install prompt, and Dropify will be installed on your home screen."
    },
    {
      q: "How do I install the Windows desktop application?",
      a: "Download Dropify-Setup-1.0.0.exe and run the installer. You can also choose Dropify-Portable-1.0.0.exe if you prefer a standalone executable that runs immediately without installation. If Windows SmartScreen displays an alert, simply click 'More info' and 'Run anyway'."
    },
    {
      q: "Can I still listen to music directly in my web browser?",
      a: "Yes! While our native Android and Windows applications offer the best performance, background playback, and system controls, you can also launch the Dropify Web Player directly in any modern desktop or mobile browser by clicking 'Web Player' in the navigation bar."
    },
    {
      q: "Does Dropify work without an internet connection?",
      a: "Dropify requires an internet connection to stream audio, fetch real-time synchronized lyrics, and resolve soundscapes. Your playlists ('Notebooks') and liked songs are saved persistently on your device so they load instantly when connected."
    },
    {
      q: "How do future updates work?",
      a: "When a new version is compiled, updated APKs and Windows installers are published to this official website and the GitHub repository. You can simply download and install the new version over your existing installation without losing your playlists or favorites."
    }
  ];

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section id="faq" className="landing-section">
      <div className="landing-container">
        <div className="section-header">
          <div className="section-tag cyan">Common Questions</div>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">
            Everything you need to know about Dropify, supported platforms, and installation.
          </p>
        </div>

        <div className="faq-list">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
                <button
                  className="faq-trigger"
                  onClick={() => toggleFaq(idx)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <span className="faq-chevron">
                    <ChevronDown size={18} />
                  </span>
                </button>
                {isOpen && (
                  <div className="faq-content">
                    <p style={{ margin: 0 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
