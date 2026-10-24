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
      {/* Dynamic Frosted Ambient Glow behind island */}
      <div className={`player-ambient-glow ${isPlaying ? 'glow-active' : ''}`} aria-hidden="true" />

      <div className="player-bar glass-panel liquid-island">
        {/* Specular glossy highlight reflection */}
        <div className="island-specular-sheen" aria-hidden="true" />

        {/* Track Thumbnail, Metadata & Mini Animated Equalizer */}
        <div className="player-left" onClick={() => setIsFullscreenPlayerOpen(true)} title="Click to open Fullscreen Player">
          <div className="player-thumb-wrapper">
            <img
              src={currentSong.thumbnail || `https://i.ytimg.com/vi/${currentSong.id}/hqdefault.jpg`}
              alt={currentSong.title}
              className="player-thumb"
            />
            {isPlaying && (
              <div className="thumb-live-indicator" title="Audio playing">
                <span className="live-dot" />
              </div>
            )}
          </div>

          <div className="player-song-info">
            <div className="player-title-row">
              <span className="player-title" title={currentSong.title}>
                {currentSong.title}
              </span>
              {/* Mini Animated Equalizer Visualizer */}
              {isPlaying && (
                <div className="mini-eq-bars" title="DSP Audio Stream">
                  <span className="eq-bar bar-1"></span>
                  <span className="eq-bar bar-2"></span>
                  <span className="eq-bar bar-3"></span>
                  <span className="eq-bar bar-4"></span>
                </div>
              )}
            </div>
            <div className="player-meta-sub">
              <span className="player-artist" title={currentSong.artist}>
                {currentSong.artist}
              </span>
              <span className="player-spec-chip">160k Opus</span>
            </div>
          </div>

          <button
            className={`player-like-btn stretchy-btn ${isLiked ? 'liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(currentSong);
            }}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={18} fill={isLiked ? '#ed5564' : 'none'} color={isLiked ? '#ed5564' : 'currentColor'} />
          </button>
        </div>

        {/* Center Controls & Stretchy Timeline */}
        <div className="player-center">
          <div className="player-controls">
            <button className="ctrl-btn stretchy-btn" onClick={playPrevious} title="Previous (Shift+Left)">
              <SkipBack size={19} />
            </button>

            <button
              className="ctrl-btn play-main stretchy-play-btn"
              onClick={togglePlayPause}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              <div className="play-pulse-ring" />
              {isPlaying ? <Pause size={20} /> : <Play size={20} fill="#fff" style={{ marginLeft: '2px' }} />}
            </button>

            <button className="ctrl-btn stretchy-btn" onClick={() => playNext(true)} title="Next (Shift+Right / Crossfade)">
              <SkipForward size={19} />
            </button>
          </div>

          <div className="player-timeline">
            <span className="time-text time-text-neon">{formatSeconds(currentTime)}</span>
            <div className="stretchy-seek-container">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress || 0}
                onChange={handleSeekChange}
                className="seek-slider stretchy-slider"
              />
              <div className="seek-glow-fill" style={{ width: `${progress || 0}%` }} />
            </div>
            <span className="time-text time-text-neon">{formatSeconds(duration)}</span>
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
