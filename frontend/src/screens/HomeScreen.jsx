import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, Flame, Disc3, Zap, Clock, ChevronLeft, ChevronRight, RotateCw, Compass } from 'lucide-react';
import TrackCard from '../components/TrackCard';
import { usePlayer } from '../context/PlayerContext';
import { apiUrl } from '../config';

const CLIENT_FALLBACK_SECTIONS = {
  'Spotify Quick Picks': [
    {
      id: 'BddP6PYo2gs',
      title: 'Kesariya - Brahmāstra',
      artist: 'Arijit Singh, Pritam',
      duration: 268,
      durationFormatted: '4:28',
      thumbnail: 'https://i.ytimg.com/vi/BddP6PYo2gs/mqdefault.jpg',
      thumbnailHigh: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg'
    },
    {
      id: 'V7LwfY5U5WI',
      title: 'Chaleya - Jawan',
      artist: 'Arijit Singh, Anirudh Ravichander',
      duration: 200,
      durationFormatted: '3:20',
      thumbnail: 'https://i.ytimg.com/vi/V7LwfY5U5WI/mqdefault.jpg',
      thumbnailHigh: 'https://i.ytimg.com/vi/V7LwfY5U5WI/hqdefault.jpg'
    },
    {
      id: '34Na4j8AVgA',
      title: 'Starboy',
      artist: 'The Weeknd ft. Daft Punk',
      duration: 230,
      durationFormatted: '3:50',
      thumbnail: 'https://i.ytimg.com/vi/34Na4j8AVgA/mqdefault.jpg',
      thumbnailHigh: 'https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg'
    },
    {
      id: 'JGwWNGJdvx8',
      title: 'Shape of You',
      artist: 'Ed Sheeran',
      duration: 233,
      durationFormatted: '3:53',
      thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/mqdefault.jpg',
      thumbnailHigh: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg'
    },
    {
      id: 'cl0a3i2wFcc',
      title: 'G.O.A.T.',
      artist: 'Diljit Dosanjh',
      duration: 224,
      durationFormatted: '3:44',
      thumbnail: 'https://i.ytimg.com/vi/cl0a3i2wFcc/mqdefault.jpg',
      thumbnailHigh: 'https://i.ytimg.com/vi/cl0a3i2wFcc/hqdefault.jpg'
    },
    {
      id: 'TUVcZfQe-Kw',
      title: 'Levitating',
      artist: 'Dua Lipa',
      duration: 203,
      durationFormatted: '3:23',
      thumbnail: 'https://i.ytimg.com/vi/TUVcZfQe-Kw/mqdefault.jpg',
      thumbnailHigh: 'https://i.ytimg.com/vi/TUVcZfQe-Kw/hqdefault.jpg'
    }
  ],
  'Trending Tracks': [
    {
      id: 'BddP6PYo2gs',
      title: 'Kesariya - Brahmāstra',
      artist: 'Arijit Singh, Pritam',
      duration: 268,
      durationFormatted: '4:28',
      thumbnail: 'https://i.ytimg.com/vi/BddP6PYo2gs/mqdefault.jpg',
      thumbnailHigh: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg'
    },
    {
      id: 'V7LwfY5U5WI',
      title: 'Chaleya - Jawan',
      artist: 'Arijit Singh, Anirudh Ravichander',
      duration: 200,
      durationFormatted: '3:20',
      thumbnail: 'https://i.ytimg.com/vi/V7LwfY5U5WI/mqdefault.jpg',
      thumbnailHigh: 'https://i.ytimg.com/vi/V7LwfY5U5WI/hqdefault.jpg'
    },
    {
      id: '7-x3uDFvHf4',
      title: 'Apna Bana Le - Bhediya',
      artist: 'Arijit Singh, Sachin-Jigar',
      duration: 261,
      durationFormatted: '4:21',
      thumbnail: 'https://i.ytimg.com/vi/7-x3uDFvHf4/mqdefault.jpg',
      thumbnailHigh: 'https://i.ytimg.com/vi/7-x3uDFvHf4/hqdefault.jpg'
    },
    {
      id: '34Na4j8AVgA',
      title: 'Starboy',
      artist: 'The Weeknd ft. Daft Punk',
      duration: 230,
      durationFormatted: '3:50',
      thumbnail: 'https://i.ytimg.com/vi/34Na4j8AVgA/mqdefault.jpg',
      thumbnailHigh: 'https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg'
    },
    {
      id: 'JGwWNGJdvx8',
      title: 'Shape of You',
      artist: 'Ed Sheeran',
      duration: 233,
      durationFormatted: '3:53',
      thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/mqdefault.jpg',
      thumbnailHigh: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg'
    },
    {
      id: '7wtfhZwyrcc',
      title: 'Believer',
      artist: 'Imagine Dragons',
      duration: 204,
      durationFormatted: '3:24',
      thumbnail: 'https://i.ytimg.com/vi/7wtfhZwyrcc/mqdefault.jpg',
      thumbnailHigh: 'https://i.ytimg.com/vi/7wtfhZwyrcc/hqdefault.jpg'
    }
  ]
};

function ShelfSection({ sectionTitle, tracks, onPlayTrack }) {
  const rowRef = useRef(null);

  const scrollLeft = () => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: -380, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: 380, behavior: 'smooth' });
    }
  };

  const titleLower = sectionTitle.toLowerCase();
  let icon = <Flame size={20} className="icon-glow" style={{ color: 'var(--pop-crimson)' }} />;
  let badgeColor = 'var(--pop-crimson)';

  if (titleLower.includes('recent')) {
    icon = <Clock size={20} style={{ color: 'var(--pop-cyan)' }} />;
    badgeColor = 'var(--pop-cyan)';
  } else if (titleLower.includes('quick') || titleLower.includes('doodle')) {
    icon = <Zap size={20} style={{ color: 'var(--pop-amber)' }} />;
    badgeColor = 'var(--pop-amber)';
  } else if (titleLower.includes('new') || titleLower.includes('fresh')) {
    icon = <Sparkles size={20} style={{ color: 'var(--pop-cyan)' }} />;
    badgeColor = 'var(--pop-cyan)';
  } else if (titleLower.includes('chart') || titleLower.includes('top') || titleLower.includes('global')) {
    icon = <Disc3 size={20} style={{ color: 'var(--pop-violet)' }} />;
    badgeColor = 'var(--pop-violet)';
  }

  return (
    <div className="home-shelf">
      <div className="shelf-header">
        <div className="shelf-title-row">
          {icon}
          <h2 className="shelf-title sketch-font-title">{sectionTitle}</h2>
          <span className="shelf-count" style={{ borderColor: badgeColor }}>{tracks.length} tracks</span>
        </div>
        <div className="shelf-scroll-controls">
          <button className="shelf-nav-btn" onClick={scrollLeft} aria-label="Scroll left" title="Scroll left">
            <ChevronLeft size={18} />
          </button>
          <button className="shelf-nav-btn" onClick={scrollRight} aria-label="Scroll right" title="Scroll right">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="shelf-row" ref={rowRef}>
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            song={track}
            onPlay={(t) => onPlayTrack(t, tracks)}
            queueContext={tracks}
          />
        ))}
      </div>
    </div>
  );
}

function getCircadianInfo() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { greeting: 'Good Morning', moment: 'Morning Momentum ☕', mood: 'morning' };
  if (h >= 12 && h < 17) return { greeting: 'Good Afternoon', moment: 'Deep Focus Flow ⚡', mood: 'afternoon' };
  if (h >= 17 && h < 21) return { greeting: 'Good Evening', moment: 'Golden Hour Sunset 🌅', mood: 'evening' };
  return { greeting: 'Late Night Notes', moment: 'Midnight Lo-Fi Chill 🌙', mood: 'night' };
}

export default function HomeScreen({ onNavigateTaste }) {
  const [sections, setSections] = useState(CLIENT_FALLBACK_SECTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMood, setActiveMood] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { playSong, currentSong, isPlaying, recentlyPlayed } = usePlayer();
  const circadian = getCircadianInfo();

  const fetchFeed = (mood = null, refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    const params = new URLSearchParams();
    if (mood && mood !== 'all') params.append('mood', mood);
    if (refresh) params.append('refresh', 'true');
    params.append('_t', Date.now().toString()); // Cache buster

    fetch(apiUrl(`/api/home?${params.toString()}`))
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then((data) => {
        if (data && typeof data === 'object' && !data.error && Object.keys(data).length > 0) {
          setSections(data);
        }
        setIsLoading(false);
        setIsRefreshing(false);
      })
      .catch((err) => {
        setIsLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleMoodSelect = (moodKey) => {
    setActiveMood(moodKey);
    fetchFeed(moodKey, true);
  };

  const handlePlayTrack = (track, list) => {
    playSong(track, list);
  };

  const quickPicks = (Array.isArray(sections['Spotify Quick Picks']) && sections['Spotify Quick Picks']) ||
                     (Array.isArray(sections['Trending Tracks']) && sections['Trending Tracks'].slice(0, 6)) || [];

  const MOOD_FILTERS = [
    { id: 'all', label: 'All Mixes' },
    { id: 'morning', label: 'Morning Coffee ☕' },
    { id: 'afternoon', label: 'Focus Flow ⚡' },
    { id: 'evening', label: 'Sunset Chill 🌅' },
    { id: 'night', label: 'Midnight Lo-Fi 🌙' }
  ];

  return (
    <div className="home-screen">
      {/* Hand-Drawn Notebook Hero Banner with Circadian Intelligence */}
      <div className="hero-banner sketch-card">
        <div className="washi-tape-top" />
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={16} />
            <span>Echo Brain • {circadian.moment}</span>
          </div>
          <h1 className="hero-title sketch-font-title">{circadian.greeting}! Ready for today's audio notebook?</h1>
          <p className="hero-desc sketch-font-hand">
            Stream millions of tracks tailored to your circadian mood with 10-band sketch DSP EQ,
            synchronized songwriter lyrics, and 3D tactile controls.
          </p>

          <div className="hero-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button className="sketch-btn sketch-btn-primary" onClick={onNavigateTaste}>
              <Play size={18} fill="#ffffff" color="#ffffff" />
              <span>Open Sketch Taste Mix</span>
            </button>

            <button
              className="sketch-btn"
              onClick={() => fetchFeed(activeMood, true)}
              disabled={isRefreshing}
              title="Generate a brand new set of suggestions from Echo Music catalog"
            >
              <RotateCw size={16} className={isRefreshing ? 'spin-icon' : ''} />
              <span>{isRefreshing ? 'Penciling New Mix...' : 'Re-roll Suggestions'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Circadian Mood Filter Chips */}
      <div className="mood-chips-container" style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '4px 2px' }}>
        {MOOD_FILTERS.map((m) => (
          <button
            key={m.id}
            className={`category-chip ${activeMood === m.id ? 'active' : ''}`}
            onClick={() => handleMoodSelect(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Spotify-style Quick Picks Section */}
      {quickPicks.length > 0 && (
        <div className="quick-picks-section">
          <div className="shelf-header">
            <div className="shelf-title-row">
              <Zap size={20} />
              <h2 className="shelf-title sketch-font-title">Quick Doodles</h2>
              <span className="shelf-count">Instant Spin</span>
            </div>
          </div>
          <div className="quick-picks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px', marginTop: '14px' }}>
            {quickPicks.slice(0, 6).map((track) => {
              const isCurrent = currentSong && currentSong.id === track.id;
              return (
                <div
                  key={track.id}
                  className={`quick-pick-card sketch-card ${isCurrent ? 'active' : ''}`}
                  onClick={() => handlePlayTrack(track, quickPicks)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: isCurrent ? 'var(--highlighter-yellow)' : 'var(--paper-card)',
                    borderRadius: 'var(--sketch-radius-sm)'
                  }}
                >
                  <img
                    src={track.thumbnail || `https://i.ytimg.com/vi/${track.id}/mqdefault.jpg`}
                    alt={track.title}
                    className="quick-pick-thumb"
                    loading="lazy"
                    style={{ width: '44px', height: '44px', borderRadius: '4px', border: '1.5px solid var(--paper-border)', objectFit: 'cover' }}
                  />
                  <div className="quick-pick-info" style={{ flex: 1, overflow: 'hidden' }}>
                    <div className="quick-pick-title sketch-font-hand" style={{ fontSize: '1.05rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {track.title}
                    </div>
                    <div className="quick-pick-artist sketch-font-hand" style={{ fontSize: '0.88rem', color: 'var(--graphite-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {track.artist}
                    </div>
                  </div>
                  <button className="play-glyph-btn" style={{ width: '32px', height: '32px', flexShrink: 0 }} aria-label="Play">
                    <Play size={14} fill="#ffffff" color="#ffffff" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently Played Shelf */}
      {recentlyPlayed && recentlyPlayed.length > 0 && (
        <ShelfSection
          sectionTitle="Recently Played"
          tracks={recentlyPlayed}
          onPlayTrack={handlePlayTrack}
        />
      )}

      {/* Shelves Grid */}
      {isLoading ? (
        <div className="loading-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton-shelf">
              <div className="skeleton-title shimmer"></div>
              <div className="shelf-row">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="track-card glass-card skeleton-card shimmer">
                    <div className="card-thumb-container shimmer"></div>
                    <div className="skeleton-line shimmer" style={{ width: '80%', height: '14px', borderRadius: '4px' }}></div>
                    <div className="skeleton-line shimmer" style={{ width: '50%', height: '12px', borderRadius: '4px' }}></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        Object.entries(sections).map(([sectionTitle, tracks]) => {
          if (!Array.isArray(tracks) || tracks.length === 0 || sectionTitle === 'Spotify Quick Picks') return null;
          return (
            <ShelfSection
              key={sectionTitle}
              sectionTitle={sectionTitle}
              tracks={tracks}
              onPlayTrack={handlePlayTrack}
            />
          );
        })
      )}
    </div>
  );
}
