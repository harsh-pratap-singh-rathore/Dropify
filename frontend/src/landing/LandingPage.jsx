import React, { useState, useEffect } from 'react';
import './LandingPage.css';
import useTheme from './useTheme';

import Navbar from './Navbar';
import HeroSection from './HeroSection';
import BrandPromise from './BrandPromise';
import ProductExperience from './ProductExperience';
import FeatureGrid from './FeatureGrid';
import PlatformShowcase from './PlatformShowcase';
import DownloadCenter from './DownloadCenter';
import HowToGetStarted from './HowToGetStarted';
import FaqSection from './FaqSection';
import FinalCta from './FinalCta';
import Footer from './Footer';
import ChecksumModal from './ChecksumModal';

export default function LandingPage({ onLaunchWebPlayer }) {
  const [checksumModalOpen, setChecksumModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Smooth scroll support for anchor hash links
  useEffect(() => {
    const handleHashClick = (e) => {
      const target = e.target.closest('a[href^="#"]');
      if (target) {
        const hash = target.getAttribute('href');
        if (hash && hash !== '#') {
          const el = document.querySelector(hash);
          if (el) {
            e.preventDefault();
            el.scrollIntoView({ behavior: 'smooth' });
            window.history.pushState(null, '', hash);
          }
        }
      }
    };

    document.addEventListener('click', handleHashClick);
    return () => document.removeEventListener('click', handleHashClick);
  }, []);

  return (
    <div className={`dropify-landing ${theme === 'dark' ? 'dark' : ''}`} data-theme={theme}>
      {/* Top Sticky Navigation */}
      <Navbar onLaunchWebPlayer={onLaunchWebPlayer} theme={theme} toggleTheme={toggleTheme} />

      {/* Section 2: Hero Section */}
      <HeroSection onLaunchWebPlayer={onLaunchWebPlayer} />

      {/* Section 3: Brand Promise (100% Free, 100% Ad-Free, Made for Music) */}
      <BrandPromise />

      {/* Section 4: Product Experience (Real App Screenshots: Turntable, Synced Lyrics, Circadian Home) */}
      <ProductExperience />

      {/* Section 5: Features Grid (Verified Android & Windows Capabilities) */}
      <FeatureGrid />

      {/* Section 6: Platform Showcase (Android APK vs Windows Desktop) */}
      <PlatformShowcase />

      {/* Section 7: Download Centre */}
      <DownloadCenter onOpenChecksumModal={() => setChecksumModalOpen(true)} />

      {/* Section 8: How to Get Started */}
      <HowToGetStarted />

      {/* Section 9: FAQ Accordion */}
      <FaqSection />

      {/* Section 10: Final Call To Action */}
      <FinalCta onLaunchWebPlayer={onLaunchWebPlayer} />

      {/* Section 11: Footer */}
      <Footer
        onOpenChecksumModal={() => setChecksumModalOpen(true)}
        onLaunchWebPlayer={onLaunchWebPlayer}
      />

      {/* Cryptographic SHA-256 Checksum Verification Modal */}
      <ChecksumModal
        isOpen={checksumModalOpen}
        onClose={() => setChecksumModalOpen(false)}
      />
    </div>
  );
}
