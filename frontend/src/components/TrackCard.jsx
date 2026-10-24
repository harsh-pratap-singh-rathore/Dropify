import React, { useState } from 'react';
import { Play, Pause, Heart, Radio } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function TrackCard({ song, onPlay, queueContext = [] }) {
  const { currentSong, isPlaying, togglePlayPause, toggleLike, likedSongIds } = usePlayer();
  const [isLoaded, setIsLoaded] = useState(false);
  const isCurrent = currentSong && currentSong.id === song.id;
  const isLiked = likedSongIds.has(song.id);

  const handleClickPlay = (e) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlayPause();
    } else if (onPlay) {
      onPlay(song, queueContext);
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    toggleLike(song);
  };

  // Fast lightweight thumbnail with high-res fallback
  const primaryThumb = song.thumbnail || (song.id ? `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg` : '');

  return (
    <div
      className={`track-card glass-card ${isCurrent ? 'active-track' : ''}`}
      onClick={handleClickPlay}
    >
      <div className="card-thumb-container">
        {!isLoaded && <div className="card-thumb-skeleton shimmer" />}
        <img
          src={primaryThumb}
          alt={song.title}
          className={`card-thumb ${isLoaded ? 'loaded' : 'loading'}`}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            if (song.id && !e.target.dataset.triedHigh) {
              e.target.dataset.triedHigh = 'true';
              e.target.src = `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`;
            }
          }}
        />

        {/* Live Audio Indicator for active playing song */}
        {isCurrent && isPlaying && (
          <div className="card-playing-indicator">
            <span className="bar bar-1"></span>
            <span className="bar bar-2"></span>
            <span className="bar bar-3"></span>
          </div>
        )}

        <div className={`card-play-overlay ${isCurrent ? 'visible' : ''}`}>
          <button className="play-glyph-btn" aria-label="Play Track">
            {isCurrent && isPlaying ? <Pause size={20} /> : <Play size={20} fill="#fff" />}
          </button>
        </div>
      </div>

      <div className="card-meta">
        <div className="card-title" title={song.title}>
          {song.title}
        </div>
        <div className="card-artist" title={song.artist}>
          {song.artist}
        </div>
      </div>

      <div className="card-actions">
        {song.durationFormatted && (
          <span className="card-duration">{song.durationFormatted}</span>
        )}
        <button
          className={`card-like-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
          title={isLiked ? 'Unlike' : 'Like song'}
        >
          <Heart size={16} fill={isLiked ? '#ed5564' : 'none'} color={isLiked ? '#ed5564' : 'rgba(255,255,255,0.6)'} />
        </button>
      </div>
    </div>
  );
}
