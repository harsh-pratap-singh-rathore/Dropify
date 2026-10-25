import React, { useState, useEffect, useRef } from 'react';
import { Search, Music, X, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import TrackCard from '../components/TrackCard';
import { usePlayer } from '../context/PlayerContext';
import { apiUrl } from '../config';

const CHIPS = [
  'Top Hits 2026',
  'Acoustic Journal',
  'Charcoal Beats',
  'Lo-Fi Sketch',
  'Indie Notebook',
  'Deep Focus',
  'Synthwave',
  'Phonk',
  'Bollywood Acoustic'
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
        setResults(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Search error:', err);
        setResults([]);
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
          setSuggestions(Array.isArray(items) ? items.slice(0, 8) : []);
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
        <form onSubmit={handleFormSubmit} className="search-main-input-wrapper sketch-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', borderRadius: 'var(--sketch-radius-pill)' }}>
          <Search size={22} className="search-icon-lg" />
          <input
            type="text"
            placeholder="Search tracks, songwriters, or doodle a title..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            className="search-main-input"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-hand)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--graphite-main)' }}
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
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--graphite-muted)' }}
            >
              <X size={18} />
            </button>
          )}
          <button type="submit" className="sketch-btn sketch-btn-primary">
            Search
          </button>

          {/* Live Autocomplete Suggestions Overlay */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown" style={{ top: 'calc(100% + 12px)' }}>
              <div style={{ padding: '4px 10px 8px', fontSize: '0.8rem', color: 'var(--graphite-muted)', fontFamily: 'var(--font-mono)' }}>
                NOTEBOOK SUGGESTIONS:
              </div>
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(item)}
                >
                  <Search size={15} />
                  <span>{item}</span>
                  <ArrowRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </div>
              ))}
            </div>
          )}
        </form>

        <div className="category-chips-row" style={{ marginTop: '14px' }}>
          {CHIPS.map((chip) => (
            <button
              key={chip}
              className={`category-chip ${activeChip === chip ? 'active' : ''}`}
              onClick={() => handleChipClick(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="search-loading" style={{ textAlign: 'center', padding: '60px 20px', fontFamily: 'var(--font-hand)', fontSize: '1.3rem' }}>
          <div className="animate-sketch-wobble" style={{ display: 'inline-block', padding: '8px 24px', background: 'var(--highlighter-yellow)', border: '2px solid var(--paper-border)', borderRadius: 'var(--sketch-radius-pill)' }}>
            Sketching results from audio catalog...
          </div>
        </div>
      ) : results.length > 0 ? (
        <div className="search-results-section">
          <div className="section-title-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '2px dashed var(--paper-border-dashed)', paddingBottom: '8px' }}>
            <Music size={22} />
            <h2 className="sketch-font-title" style={{ fontSize: '1.6rem' }}>Search Results ({results.length})</h2>
          </div>
          <div className="shelf-grid">
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
        <div className="library-empty-state sketch-card">
          <TrendingUp size={48} style={{ color: 'var(--graphite-secondary)' }} />
          <h3 className="sketch-font-title">Doodle &amp; Discover Music</h3>
          <p className="sketch-font-hand">Type any track or singer name, or click one of the quick genre chips above to fill your sketchbook.</p>
        </div>
      )}
    </div>
  );
}
