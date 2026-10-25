import React, { useState, useEffect, useRef } from 'react';
import { Disc, Search, Compass, Radio, Heart, Sliders, Mic, Sparkles, X, ArrowRight, Command } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { apiUrl } from '../config';

export default function Navbar({ activeTab, setActiveTab, onSearch }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const debounceTimerRef = useRef(null);
  const searchContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const { setIsEqOpen, setIsMusicFlowOpen, playSong, setIsFullscreenPlayerOpen, setIsShortcutsOpen } = usePlayer();

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

  return (
    <nav className="navbar-container glass-panel">
      {/* Brand */}
      <div className="navbar-brand" onClick={() => setActiveTab('home')}>
        <div className="brand-icon">
          <Disc size={22} className="spin-slow" />
        </div>
        <span className="brand-name">DROPIFY</span>
        <span className="brand-tag">DSP</span>
      </div>

      {/* Search Input Bar with Live Autocomplete */}
      <div className="navbar-search-wrapper" ref={searchContainerRef}>
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
      <div className="nav-links">
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
      <div className="nav-actions">
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

        <button
          className="btn-icon"
          onClick={() => setIsEqOpen(true)}
          title="Audiophile DSP & 10-Band EQ"
        >
          <Sliders size={18} />
        </button>
      </div>
    </nav>
  );
}
