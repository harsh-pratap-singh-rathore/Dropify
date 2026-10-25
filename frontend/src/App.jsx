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
import MobileBottomNav from './components/MobileBottomNav';
import './App.css';

function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const {
    currentSong,
    togglePlayPause,
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
    setIsShortcutsOpen,
    audioManager
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

        case 'ArrowLeft': { // Seek backward 5s (or Shift+Arrow: Previous)
          e.preventDefault();
          if (e.shiftKey) {
            playPrevious();
          } else {
            const cur = audioManager?.getCurrentTime() || 0;
            const dur = audioManager?.getDuration() || 0;
            if (dur > 0) {
              seekTo(Math.max(0, ((cur - 5) / dur) * 100));
            }
          }
          break;
        }

        case 'ArrowRight': { // Seek forward 5s (or Shift+Arrow: Next)
          e.preventDefault();
          if (e.shiftKey) {
            playNext(true);
          } else {
            const cur = audioManager?.getCurrentTime() || 0;
            const dur = audioManager?.getDuration() || 0;
            if (dur > 0) {
              seekTo(Math.min(100, ((cur + 5) / dur) * 100));
            }
          }
          break;
        }

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
    setIsShortcutsOpen,
    toggleLike,
    audioManager
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

      {/* Mobile Web App Bottom Navigation Bar (Spotify / Apple Music PWA Experience) */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={handleTabSwitch} />

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
