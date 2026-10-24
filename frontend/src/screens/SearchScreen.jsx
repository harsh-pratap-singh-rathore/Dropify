import React, { useState, useEffect, useRef } from 'react';
import { Search, Music, X, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import TrackCard from '../components/TrackCard';
import { usePlayer } from '../context/PlayerContext';
import { apiUrl } from '../config';

const CHIPS = [
  'Top Hits 2026',
  'Synthwave',
  'Phonk',
  'Lo-Fi Chill',
  'Hip Hop',
  'Electronic EDM',
  'Acoustic Indie',
  'Deep House',
  'Rock Classics'
];

export default function SearchScreen({ initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [activeChip, setActiveChip] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimerRef = useRef(null);
  const containerRef = useRef(null);
  const { playSong } = usePlayer();

  const executeSearch = (searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) return;
    setIsLoading(true);
    setShowSuggestions(false);
    fetch(apiUrl(`/api/search?q=${encodeURIComponent(searchTerm.trim())}`))
      .then((res) => res.json())
      .then((data) => {
        setResults(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Search error:', err);
        setIsLoading(false);
      });
  };

  // Live autocomplete suggestions fetcher
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
        .then((items) => {
          if (Array.isArray(items)) {
            setSuggestions(items.slice(0, 8));
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
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      executeSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleChipClick = (chip) => {
    setActiveChip(chip);
    setQuery(chip);
    executeSearch(chip);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleSuggestionClick = (suggestText) => {
    setQuery(suggestText);
    executeSearch(suggestText);
  };

  return (
    <div className="search-screen" ref={containerRef}>
      <div className="search-header-area">
        <form onSubmit={handleFormSubmit} className="search-main-input-wrapper glass-panel">
          <Search size={22} className="search-icon-lg" />
          <input
            type="text"
            placeholder="Search millions of songs, artists, or genres..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            className="search-main-input"
          />
          {query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
              }}
              title="Clear search"
            >
              <X size={18} />
            </button>
          )}
          <button type="submit" className="btn-primary search-submit-btn">
            Search
          </button>

          {/* Live Autocomplete Suggestions Overlay */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions-dropdown glass-panel">
              <div className="suggestions-header">
                <Sparkles size={14} className="icon-glow" />
                <span>Live Suggestions</span>
              </div>
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(item)}
                >
                  <Search size={15} className="suggestion-icon" />
                  <span className="suggestion-text">{item}</span>
                  <ArrowRight size={14} className="suggestion-arrow" />
                </div>
              ))}
            </div>
          )}
        </form>

        <div className="search-chips-row">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              className={`glass-pill ${activeChip === chip ? 'active' : ''}`}
              onClick={() => handleChipClick(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="search-loading">
          <div className="spinner-glow"></div>
          <div className="pulse-text">Searching YouTube catalog & audio formats...</div>
        </div>
      ) : results.length > 0 ? (
        <div className="search-results-section">
          <div className="section-title-row">
            <Music size={20} className="icon-glow" />
            <h2>Search Results ({results.length})</h2>
          </div>
          <div className="search-results-grid">
            {results.map((track) => (
              <TrackCard
                key={track.id}
                song={track}
                onPlay={(t) => playSong(t, results)}
                queueContext={results}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="search-empty-state glass-card">
          <TrendingUp size={48} className="empty-state-icon" />
          <h3>Discover Trending Soundtracks</h3>
          <p>Type an artist, track name, or choose from one of the curated genres above.</p>
        </div>
      )}
    </div>
  );
}
