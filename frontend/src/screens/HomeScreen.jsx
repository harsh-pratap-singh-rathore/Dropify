import React, { useState, useEffect } from 'react';
import { Sparkles, Play, Flame, Disc3, Zap, Clock } from 'lucide-react';
import TrackCard from '../components/TrackCard';
import { usePlayer } from '../context/PlayerContext';

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

export default function HomeScreen({ onNavigateTaste }) {
  const [sections, setSections] = useState(CLIENT_FALLBACK_SECTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const { playSong, currentSong, isPlaying } = usePlayer();

  useEffect(() => {
    fetch('/api/home')
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then((data) => {
        if (data && typeof data === 'object' && !data.error && Object.keys(data).length > 0) {
          setSections(data);
        }
      })
      .catch((err) => {
        console.warn('Home feed API notice, using local cache:', err.message);
      });
  }, []);

  const handlePlayTrack = (track, list) => {
    playSong(track, list);
  };

  const quickPicks = (Array.isArray(sections['Spotify Quick Picks']) && sections['Spotify Quick Picks']) ||
                     (Array.isArray(sections['Trending Tracks']) && sections['Trending Tracks'].slice(0, 6)) || [];

  return (
    <div className="home-screen">
      {/* Echo Brain Hero Banner */}
      <div className="hero-banner glass-panel">
        <div className="hero-content">
          <div className="hero-badge glass-pill">
            <Sparkles size={16} className="icon-glow" />
            <span>Echo Brain • Circadian Audio Intelligence</span>
          </div>
          <h1 className="hero-title">Experience Pure Sound with Dropify</h1>
          <p className="hero-desc">
            Ad-free YouTube Music catalog streaming with Web Audio 10-band parametric EQ,
            Mid/Side stereo wideness, and millisecond synchronized lyrics.
          </p>

          <div className="hero-actions">
            <button className="btn-primary" onClick={onNavigateTaste}>
              <Play size={18} fill="#fff" />
              <span>Launch Smart Taste Mix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Spotify-style Quick Picks Section */}
      {quickPicks.length > 0 && (
        <div className="quick-picks-section">
          <div className="shelf-header">
            <div className="shelf-title-row">
              <Zap size={20} className="icon-glow" />
              <h2 className="shelf-title">Quick Picks</h2>
              <span className="shelf-badge glass-pill">Spotify Speed</span>
            </div>
          </div>
          <div className="quick-picks-grid">
            {quickPicks.slice(0, 6).map((track) => {
              const isCurrent = currentSong && currentSong.id === track.id;
              return (
                <div
                  key={track.id}
                  className={`quick-pick-card glass-panel ${isCurrent ? 'active' : ''}`}
                  onClick={() => handlePlayTrack(track, quickPicks)}
                >
                  <img
                    src={track.thumbnail || `https://i.ytimg.com/vi/${track.id}/mqdefault.jpg`}
                    alt={track.title}
                    className="quick-pick-thumb"
                    loading="lazy"
                  />
                  <div className="quick-pick-info">
                    <span className="quick-pick-title" title={track.title}>
                      {track.title}
                    </span>
                    <span className="quick-pick-artist">{track.artist}</span>
                  </div>
                  <button className="quick-pick-play-btn" aria-label="Play">
                    <Play size={16} fill="#fff" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
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
            <div key={sectionTitle} className="home-shelf">
              <div className="shelf-header">
                <div className="shelf-title-row">
                  <Flame size={20} className="icon-glow" />
                  <h2 className="shelf-title">{sectionTitle}</h2>
                  <span className="shelf-count">{tracks.length} tracks</span>
                </div>
              </div>

              <div className="shelf-row">
                {tracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    song={track}
                    onPlay={(t) => handlePlayTrack(t, tracks)}
                    queueContext={tracks}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
