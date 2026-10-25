import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Sliders,
  AlignLeft,
  Heart,
  Shuffle
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

function formatSeconds(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function PlayerBar() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    handleVolumeChange,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    setIsFullscreenPlayerOpen,
    setIsEqOpen,
    toggleLike,
    likedSongIds
  } = usePlayer();

  if (!currentSong) return null;

  const isLiked = likedSongIds.has(currentSong.id);

  const handleSeekChange = (e) => {
    seekTo(parseFloat(e.target.value));
  };

  return (
    <div className="player-bar-wrapper">
      <div className="player-bar liquid-island">
        {/* Track Thumbnail, Metadata & Mini Animated Equalizer */}
        <div className="player-left" onClick={() => setIsFullscreenPlayerOpen(true)} title="Click to open Songwriter Journal">
          <div className="player-thumb-wrapper">
            <img
              src={currentSong.thumbnail || `https://i.ytimg.com/vi/${currentSong.id}/hqdefault.jpg`}
              alt={currentSong.title}
              className="player-thumb"
            />
          </div>

          <div className="player-song-info">
            <div className="player-title-row">
              <span className="player-title sketch-font-hand" title={currentSong.title}>
                {currentSong.title}
              </span>
              {/* Mini Animated Equalizer Visualizer */}
              {isPlaying && (
                <div className="card-playing-indicator" style={{ position: 'static', height: '14px', padding: '1px 4px' }} title="Pencil Audio Stream">
                  <span className="bar bar-1"></span>
                  <span className="bar bar-2"></span>
                  <span className="bar bar-3"></span>
                </div>
              )}
            </div>
            <div className="player-meta-sub" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="player-artist sketch-font-hand" title={currentSong.artist}>
                {currentSong.artist}
              </span>
              <span className="gain-badge" style={{ fontSize: '0.7rem' }}>320k Opus</span>
            </div>
          </div>

          <button
            className={`card-like-btn ${isLiked ? 'liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(currentSong);
            }}
            title={isLiked ? 'Unlike' : 'Like'}
            style={{ marginLeft: '6px' }}
          >
            <Heart size={18} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : 'var(--graphite-main)'} />
          </button>
        </div>

        {/* Center Controls & Pencil Timeline */}
        <div className="controls-center">
          <div className="playback-buttons">
            <button className="btn-control" onClick={playPrevious} title="Previous (Shift+Left)">
              <SkipBack size={20} />
            </button>

            <button
              className="btn-control-play"
              onClick={togglePlayPause}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} fill="#18181B" style={{ marginLeft: '2px' }} />}
            </button>

            <button className="btn-control" onClick={() => playNext(true)} title="Next (Shift+Right / Crossfade)">
              <SkipForward size={20} />
            </button>
          </div>

          <div className="seek-bar-container">
            <span className="time-text sketch-font-mono">{formatSeconds(currentTime)}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress || 0}
              onChange={handleSeekChange}
              className="seek-slider"
            />
            <span className="time-text sketch-font-mono">{formatSeconds(duration)}</span>
          </div>
        </div>

        {/* Right Controls: Lyrics, DSP EQ, Volume, Expand */}
        <div className="player-right">
          <button
            className="btn-icon-subtle stretchy-btn"
            onClick={() => setIsFullscreenPlayerOpen(true)}
            title="Synchronized Lyrics & Fullscreen"
          >
            <AlignLeft size={18} />
          </button>

          <button
            className="btn-icon-subtle stretchy-btn"
            onClick={() => setIsEqOpen(true)}
            title="10-Band Parametric Equalizer"
          >
            <Sliders size={18} />
          </button>

          <div className="volume-control">
            <button
              className="btn-icon-subtle stretchy-btn"
              onClick={() => handleVolumeChange(volume === 0 ? 0.8 : 0)}
              title={volume === 0 ? 'Unmute' : 'Mute (M)'}
            >
              {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div className="volume-slider-wrapper">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="volume-slider stretchy-slider"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
              <div className="volume-glow-fill" style={{ width: `${volume * 100}%` }} />
            </div>
          </div>

          <button
            className="btn-icon-subtle stretchy-btn expand-btn"
            onClick={() => setIsFullscreenPlayerOpen(true)}
            title="Expand Full-Screen Player (F)"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
