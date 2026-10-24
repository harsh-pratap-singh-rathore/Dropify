import React, { useState, useEffect, useRef } from 'react';
import { Disc, Search, Compass, Radio, Heart, Sliders, Mic, Sparkles, X, ArrowRight } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { apiUrl } from '../config';

export default function Navbar({ activeTab, setActiveTab, onSearch }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const debounceTimerRef = useRef(null);
  const searchContainerRef = useRef(null);
  const { setIsEqOpen, setIsMusicFlowOpen, playSong, setIsFullscreenPlayerOpen } = usePlayer();

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

  const handleEchoFind = async () => {
    setIsListening(true);
    setTimeout(async () => {
      try {
        const res = await fetch(apiUrl('/api/recognize'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'Starboy The Weeknd' })
        });
        const data = await res.json();
        setIsListening(false);
        if (data.found) {
          playSong(data.track);
        }
      } catch (e) {
        setIsListening(false);
      }
    }, 2000);
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
          <div className="navbar-suggestions-dropdown glass-panel">
            <div className="nav-suggestions-header">
              <Sparkles size={13} className="icon-glow" />
              <span>Instant Suggestions</span>
            </div>
            {suggestions.map((item, idx) => (
              <div
                key={idx}
                className="nav-suggestion-item"
                onClick={() => handleSelectSuggestion(item)}
              >
                <Search size={14} className="nav-suggestion-icon" />
                <span className="nav-suggestion-text">{item}</span>
                <ArrowRight size={13} className="nav-suggestion-arrow" />
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
