import React, { useState, useEffect } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Navbar from './components/Navbar';
import PlayerBar from './components/PlayerBar';
import FullscreenPlayer from './components/FullscreenPlayer';
import EqualizerModal from './components/EqualizerModal';
import MusicFlowModal from './components/MusicFlowModal';
import ShortcutsModal from './components/ShortcutsModal';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import LibraryScreen from './screens/LibraryScreen';
import TasteMixScreen from './screens/TasteMixScreen';
import './App.css';

import { Compass, Search, Radio, Sparkles, Heart } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const {
    currentSong,
    togglePlayPause,
    currentTime,
    duration,
    seekTo,
    volume,
    handleVolumeChange,
    playNext,
    playPrevious,
    toggleLike,
    isFullscreenPlayerOpen,
    setIsFullscreenPlayerOpen,
    isEqOpen,
    setIsEqOpen,
    isMusicFlowOpen,
    setIsMusicFlowOpen,
    isShortcutsOpen,
    setIsShortcutsOpen
  } = usePlayer();

  const handleSearchTrigger = (query) => {
    setIsFullscreenPlayerOpen(false);
    setSearchQuery(query);
    setActiveTab('search');
  };

  const handleTabSwitch = (tab) => {
    setIsFullscreenPlayerOpen(false);
    setActiveTab(tab);
  };

  // Audiophile Keyboard Controls: Space (Play/Pause), Escape (Exit Fullscreen/Modals), Arrows (Seek/Vol)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Do not trigger shortcuts while typing inside inputs or textareas
      const target = e.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      switch (e.key) {
        case ' ': // Space: Toggle Play/Pause
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlayPause();
          break;

        case 'Escape': // Escape: Exit Fullscreen Player or Close Modals
          e.preventDefault();
          if (isFullscreenPlayerOpen) {
            setIsFullscreenPlayerOpen(false);
          } else if (isEqOpen) {
            setIsEqOpen(false);
          } else if (isMusicFlowOpen) {
            setIsMusicFlowOpen(false);
          } else if (isShortcutsOpen) {
            setIsShortcutsOpen(false);
          }
          break;

        case '?': // ?: Toggle Shortcuts Guide
          e.preventDefault();
          setIsShortcutsOpen((prev) => !prev);
          break;

        case 'f': // F: Toggle Fullscreen Player
        case 'F':
          e.preventDefault();
          if (currentSong) {
            setIsFullscreenPlayerOpen((prev) => !prev);
          }
          break;

        case 'ArrowLeft': // Seek backward 5s (or Shift+Arrow: Previous)
          e.preventDefault();
          if (e.shiftKey) {
            playPrevious();
          } else if (duration > 0) {
            seekTo(Math.max(0, ((currentTime - 5) / duration) * 100));
          }
          break;

        case 'ArrowRight': // Seek forward 5s (or Shift+Arrow: Next)
          e.preventDefault();
          if (e.shiftKey) {
            playNext(true);
          } else if (duration > 0) {
            seekTo(Math.min(100, ((currentTime + 5) / duration) * 100));
          }
          break;

        case 'ArrowUp': // Volume Up 5%
          e.preventDefault();
          handleVolumeChange(Math.min(1, +(volume + 0.05).toFixed(2)));
          break;

        case 'ArrowDown': // Volume Down 5%
          e.preventDefault();
          handleVolumeChange(Math.max(0, +(volume - 0.05).toFixed(2)));
          break;

        case 'm': // M: Toggle Mute
        case 'M':
          e.preventDefault();
          handleVolumeChange(volume === 0 ? 0.8 : 0);
          break;

        case 'l': // L: Like Current Track
        case 'L':
          if (currentSong) {
            e.preventDefault();
            toggleLike(currentSong);
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentSong,
    duration,
    currentTime,
    volume,
    isFullscreenPlayerOpen,
    isEqOpen,
    isMusicFlowOpen,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    handleVolumeChange,
    setIsFullscreenPlayerOpen,
    setIsEqOpen,
    setIsMusicFlowOpen,
    toggleLike
  ]);

  return (
    <div className="app-layout">
      {/* Notebook Binder Margin & Page Edge */}
      <div className="sketch-notebook-margin" aria-hidden="true" />

      {/* Dynamic Graphite Vignette Wash Layer */}
      {currentSong?.thumbnail && (
        <div
          className="ambient-glow"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(24, 24, 27, 0.05) 0%, rgba(250, 247, 242, 0.92) 80%), url(${currentSong.thumbnailHigh || currentSong.thumbnail})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.18,
            filter: 'grayscale(100%) contrast(120%)'
          }}
        />
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabSwitch}
        onSearch={handleSearchTrigger}
      />

      {/* Main Screen Views */}
      <main className="content-container">
        {activeTab === 'home' && <HomeScreen onNavigateTaste={() => handleTabSwitch('taste')} />}
        {activeTab === 'search' && <SearchScreen initialQuery={searchQuery} />}
        {activeTab === 'library' && <LibraryScreen />}
        {activeTab === 'taste' && <TasteMixScreen />}
      </main>

      {/* Bottom Floating Player Bar */}
      <PlayerBar />

      {/* Mobile Bottom Navigation Bar (Spotify Mobile Experience) */}
      <nav className="mobile-bottom-nav glass-panel">
        <button
          className={`mobile-nav-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('home')}
        >
          <Compass size={20} />
          <span>Home</span>
        </button>

        <button
          className={`mobile-nav-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('search')}
        >
          <Search size={20} />
          <span>Search</span>
        </button>

        <button
          className="mobile-nav-btn flow-nav-btn"
          onClick={() => {
            setIsFullscreenPlayerOpen(false);
            setIsMusicFlowOpen(true);
          }}
          title="Music Flow"
        >
          <Radio size={20} />
          <span>Flow</span>
        </button>

        <button
          className={`mobile-nav-btn ${activeTab === 'taste' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('taste')}
        >
          <Sparkles size={20} />
          <span>Taste</span>
        </button>

        <button
          className={`mobile-nav-btn ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('library')}
        >
          <Heart size={20} />
          <span>Library</span>
        </button>
      </nav>

      {/* Fullscreen Player Experience */}
      <FullscreenPlayer />

      {/* Parametric Equalizer & DSP Modal */}
      <EqualizerModal />

      {/* Music Flow "For You" Vertical Pager */}
      <MusicFlowModal />

      {/* Audiophile Keyboard Shortcuts Modal */}
      <ShortcutsModal />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('Dropify recovered from render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '60px 24px',
          textAlign: 'center',
          color: '#fff',
          background: '#06080d',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Dropify Audio Engine</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '420px' }}>
            A visual rendering notice was caught. Your player state is preserved.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="btn-primary"
            style={{ padding: '10px 24px' }}
          >
            Refresh Audio Player
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <PlayerProvider>
        <MainApp />
      </PlayerProvider>
    </ErrorBoundary>
  );
}
