import React, { useState, useEffect } from 'react';
import { Sparkles, Play, Flame, Disc3, Zap, Clock } from 'lucide-react';
import TrackCard from '../components/TrackCard';
import { usePlayer } from '../context/PlayerContext';

export default function HomeScreen({ onNavigateTaste }) {
  const [sections, setSections] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const { playSong, currentSong, isPlaying } = usePlayer();

  useEffect(() => {
    fetch('/api/home')
      .then((res) => res.json())
      .then((data) => {
        setSections(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Home feed fetch error:', err);
        setIsLoading(false);
      });
  }, []);

  const handlePlayTrack = (track, list) => {
    playSong(track, list);
  };

  const quickPicks = sections['Spotify Quick Picks'] || sections['Trending Tracks']?.slice(0, 6) || [];

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
          if (!tracks || tracks.length === 0 || sectionTitle === 'Spotify Quick Picks') return null;
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
