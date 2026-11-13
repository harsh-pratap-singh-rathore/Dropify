import React, { useState, useEffect, useRef } from 'react';
import {
  Disc,
  Search,
  Compass,
  Radio,
  Heart,
  Sliders,
  Mic,
  Sparkles,
  X,
  ArrowRight,
  Command,
  Download,
  Settings,
  ListMusic,
  WifiOff,
  Minus,
  Square,
  Copy
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { apiUrl } from '../config';

export default function Navbar({ activeTab, setActiveTab, onSearch, onBackToLanding }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const debounceTimerRef = useRef(null);
  const searchContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const {
    setIsEqOpen,
    setIsMusicFlowOpen,
    playSong,
    setIsFullscreenPlayerOpen,
    setIsShortcutsOpen,
    setIsSettingsOpen,
    setIsQueueOpen,
    queue,
    isOfflineMode
  } = usePlayer();

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, []);

  // Live autocomplete suggestions in Navbar
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetch(apiUrl(`/api/suggest?q=${encodeURIComponent(query.trim())}`))
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setSuggestions(data.slice(0, 6));
          }
        })
        .catch(() => setSuggestions([]));
    }, 150);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      setIsFullscreenPlayerOpen(false);
      setActiveTab('search');
      onSearch(query.trim());
    }
  };

  const handleSelectSuggestion = (suggestText) => {
    setQuery(suggestText);
    setShowSuggestions(false);
    setIsFullscreenPlayerOpen(false);
    setActiveTab('search');
    onSearch(suggestText);
  };

  const handleEchoFind = () => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      const fallbackQuery = 'Trending Music';
      setQuery(fallbackQuery);
      setShowSuggestions(false);
      setIsFullscreenPlayerOpen(false);
      setActiveTab('search');
      onSearch(fallbackQuery);
      return;
    }

    try {
      if (isListening) {
        setIsListening(false);
        return;
      }
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      setIsListening(true);

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          setQuery(transcript.trim());
          if (event.results?.[0]?.isFinal) {
            setIsListening(false);
            setShowSuggestions(false);
            setIsFullscreenPlayerOpen(false);
            setActiveTab('search');
            onSearch(transcript.trim());
          }
        }
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition notice:', err.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.warn('Speech start error:', e.message);
      setIsListening(false);
    }
  };

  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;
    window.electronAPI.isMaximized?.().then(setIsMaximized).catch(() => {});
    const unsubscribe = window.electronAPI.onWindowStateChange?.((state) => {
      setIsMaximized(state.isMaximized);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isElectron]);

  return (
    <nav
      className={`navbar-container glass-panel ${isElectron ? 'electron-navbar-drag' : ''}`}
      style={isElectron ? { WebkitAppRegion: 'drag', paddingRight: '150px' } : undefined}
    >
      {/* Brand */}
      <div
        className="navbar-brand"
        onClick={() => setActiveTab('home')}
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <div className="brand-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/assets/dropify_logo.png"
            alt="Dropify"
            style={{ width: '28px', height: '28px', borderRadius: '7px', objectFit: 'cover', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
          />
        </div>
        <span className="brand-name">DROPIFY</span>
        <span className="brand-tag">DSP</span>
        <span
          className="version-pill"
          style={{
            fontSize: '0.68rem',
            padding: '2px 7px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'var(--graphite-muted)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            letterSpacing: '0.04em'
          }}
        >
          v2.0.2
        </span>
        {isOfflineMode && (
          <span
            className="gain-badge"
            style={{
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.72rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontWeight: 700
            }}
            title="Offline Playback Mode Enabled"
          >
            <WifiOff size={11} />
            <span>Offline</span>
          </span>
        )}
        {onBackToLanding && !isElectron && (
          <button
            type="button"
            className="btn-text"
            onClick={(e) => { e.stopPropagation(); onBackToLanding(); }}
            title="Return to Dropify official product landing page"
            style={{
              marginLeft: '12px',
              fontSize: '0.78rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '9999px',
              border: '1.5px solid #000',
              background: '#FFE500',
              color: '#000',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ← Website
          </button>
        )}
      </div>

      {/* Search Input Bar with Live Autocomplete */}
      <div
        className="navbar-search-wrapper"
        ref={searchContainerRef}
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <form onSubmit={handleSearchSubmit} className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search songs, artists, albums..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
          />
          {query && (
            <button
              type="button"
              className="navbar-clear-btn"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
              }}
            >
              <X size={15} />
            </button>
          )}
        </form>

        {/* Floating Live Autocomplete Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="navbar-suggestions-dropdown suggestions-dropdown">
            <div className="nav-suggestions-header" style={{ padding: '6px 10px', fontSize: '0.82rem', color: 'var(--graphite-muted)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} />
              <span>PENCIL AUTOCOMPLETE</span>
            </div>
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                className="suggestion-item"
                onClick={() => handleSelectSuggestion(item)}
              >
                <Search size={14} />
                <span>{item}</span>
                <ArrowRight size={13} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="nav-links" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <Compass size={18} />
          <span>Home</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Search size={18} />
          <span>Search</span>
        </button>

        <button
          className="nav-btn flow-badge"
          onClick={() => setIsMusicFlowOpen(true)}
          title="Music Flow (Vertical Discovery)"
        >
          <Radio size={18} />
          <span>Flow</span>
          <span className="pulse-dot"></span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'taste' ? 'active' : ''}`}
          onClick={() => setActiveTab('taste')}
          title="Echo Brain Taste Mix"
        >
          <Sparkles size={18} />
          <span>Taste Mix</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          <Heart size={18} />
          <span>Library</span>
        </button>
      </div>

      {/* Actions: Echo Find & DSP */}
      <div className="nav-actions" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          className={`btn-icon ${isListening ? 'listening' : ''}`}
          onClick={handleEchoFind}
          title={isListening ? 'Listening to acoustics...' : 'Echo Find: Song Recognition'}
        >
          <Mic size={18} />
        </button>

        <button
          className="btn-icon nav-shortcuts-btn"
          onClick={() => setIsShortcutsOpen(true)}
          title="Audiophile Keyboard Shortcuts (?)"
        >
          <Command size={18} />
        </button>

        {isElectron && (
          <button
            className="btn-icon"
            onClick={async () => {
              if (window.electronAPI?.checkForUpdates) {
                await window.electronAPI.checkForUpdates(true);
              }
            }}
            title="Check for Updates"
          >
            <Download size={18} />
          </button>
        )}

        <button
          className="btn-icon"
          onClick={() => setIsQueueOpen(true)}
          title="Up Next Queue"
          style={{ position: 'relative' }}
        >
          <ListMusic size={18} />
          {queue?.length > 0 && (
            <span className="queue-badge-counter">{queue.length}</span>
          )}
        </button>

        <button
          className="btn-icon"
          onClick={() => setIsEqOpen(true)}
          title="Audiophile DSP & 10-Band EQ"
        >
          <Sliders size={18} />
        </button>

        <button
          className="btn-icon"
          onClick={() => setIsSettingsOpen(true)}
          title="Engine Settings (Quality, DSP, Offline, Aesthetics)"
        >
          <Settings size={18} />
        </button>

        {isElectron && (
          <div
            className="window-controls-group"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: '8px',
              paddingLeft: '10px',
              borderLeft: '2px dashed var(--paper-border-dashed)',
              WebkitAppRegion: 'no-drag'
            }}
          >
            <button
              type="button"
              className="btn-icon window-ctrl-btn"
              onClick={() => window.electronAPI?.minimize()}
              title="Minimize"
              style={{ width: '34px', height: '34px' }}
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              className="btn-icon window-ctrl-btn"
              onClick={() => window.electronAPI?.maximize()}
              title={isMaximized ? 'Restore Down' : 'Maximize'}
              style={{ width: '34px', height: '34px' }}
            >
              {isMaximized ? <Copy size={13} /> : <Square size={13} />}
            </button>
            <button
              type="button"
              className="btn-icon window-ctrl-btn close-btn"
              onClick={() => window.electronAPI?.close()}
              title="Close"
              style={{ width: '34px', height: '34px' }}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
