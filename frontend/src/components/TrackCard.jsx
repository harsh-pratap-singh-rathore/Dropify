import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Heart,
  MoreVertical,
  ListPlus,
  Dna,
  Download,
  Share2,
  Check,
  Radio
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function TrackCard({ song, onPlay, queueContext = [] }) {
  const {
    currentSong,
    isPlaying,
    togglePlayPause,
    toggleLike,
    likedSongIds,
    addToQueue,
    playNextInQueue,
    fetchDna,
    openShareModal,
    downloadSong,
    downloadedSongs,
    isDownloadingMap
  } = usePlayer();

  const [isLoaded, setIsLoaded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const isCurrent = currentSong && currentSong.id === song.id;
  const isLiked = likedSongIds.has(song.id);
  const isDownloaded = downloadedSongs?.some((s) => s.id === song.id);
  const isDownloading = isDownloadingMap?.[song.id];

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

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

  const handleMenuAction = (actionFn) => (e) => {
    e.stopPropagation();
    setShowMenu(false);
    actionFn(song);
  };

  // Fast lightweight thumbnail with high-res fallback
  const primaryThumb = song.thumbnail || (song.id ? `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg` : '');

  return (
    <div
      className={`track-card polaroid-frame ${isCurrent ? 'active-track' : ''}`}
      onClick={handleClickPlay}
      style={{ position: 'relative' }}
    >
      <div className="washi-tape-top" />
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
            {isCurrent && isPlaying ? <Pause size={20} color="#ffffff" fill="#ffffff" /> : <Play size={20} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />}
          </button>
        </div>
      </div>

      <div className="card-meta">
        <div className="card-title sketch-font-hand" title={song.title}>
          {song.title}
        </div>
        <div className="card-artist sketch-font-hand" title={song.artist}>
          {song.artist}
        </div>
      </div>

      <div className="card-actions">
        {song.durationFormatted && (
          <span className="card-duration sketch-font-mono">{song.durationFormatted}</span>
        )}

        <button
          className={`card-like-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
          title={isLiked ? 'Unlike' : 'Like song'}
        >
          <Heart size={16} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : 'var(--graphite-main)'} />
        </button>

        <button
          className="btn-icon"
          style={{ width: '28px', height: '28px', padding: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((prev) => !prev);
          }}
          title="Track Options"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Floating Context Action Menu (Echo Music Track Menu) */}
      {showMenu && (
        <div
          ref={menuRef}
          className="track-card-popup-menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '48px',
            right: '8px',
            width: '185px',
            background: 'rgba(15, 17, 23, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '12px',
            padding: '6px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          <button
            type="button"
            className="menu-action-row"
            onClick={handleMenuAction(playNextInQueue)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px', textAlign: 'left' }}
          >
            <Play size={14} />
            <span>Play Next</span>
          </button>

          <button
            type="button"
            className="menu-action-row"
            onClick={handleMenuAction(addToQueue)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px', textAlign: 'left' }}
          >
            <ListPlus size={14} />
            <span>Add to Queue</span>
          </button>

          <button
            type="button"
            className="menu-action-row"
            onClick={handleMenuAction(fetchDna)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px', textAlign: 'left' }}
          >
            <Dna size={14} />
            <span>Song DNA</span>
          </button>

          <button
            type="button"
            className="menu-action-row"
            onClick={handleMenuAction(openShareModal)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px', textAlign: 'left' }}
          >
            <Share2 size={14} />
            <span>Share Link</span>
          </button>

          <button
            type="button"
            className="menu-action-row"
            onClick={handleMenuAction(downloadSong)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', width: '100%', background: 'transparent', border: 'none', color: isDownloaded ? '#22c55e' : '#fff', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px', textAlign: 'left' }}
          >
            {isDownloaded ? <Check size={14} color="#22c55e" /> : <Download size={14} />}
            <span>{isDownloaded ? 'Downloaded' : isDownloading ? 'Downloading...' : 'Download Offline'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
