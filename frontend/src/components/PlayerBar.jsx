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
  Dna,
  Gauge,
  Moon,
  ListMusic,
  Share2,
  Download,
  Settings,
  Check
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
    likedSongIds,
    queue,
    setIsQueueOpen,
    playbackSpeed,
    setIsSpeedModalOpen,
    sleepTimer,
    setIsSleepTimerModalOpen,
    fetchDna,
    openShareModal,
    audioQuality,
    setIsSettingsOpen,
    downloadSong,
    downloadedSongs,
    isDownloadingMap
  } = usePlayer();

  if (!currentSong) return null;

  const isLiked = likedSongIds.has(currentSong.id);
  const isDownloaded = downloadedSongs.some((s) => s.id === currentSong.id);
  const isDownloading = isDownloadingMap[currentSong.id];

  const handleSeekChange = (e) => {
    seekTo(parseFloat(e.target.value));
  };

  return (
    <div className="player-bar-wrapper">
      {/* Mobile Mini-Player Sheet (Active on Mobile Screens) */}
      <div className="mobile-mini-player" onClick={() => setIsFullscreenPlayerOpen(true)} role="button" aria-label="Open Fullscreen Player">
        <div className="mobile-mini-progress-bar" style={{ width: `${progress || 0}%` }} />
        <div className="mobile-mini-left">
          <img
            src={currentSong.thumbnail || `https://i.ytimg.com/vi/${currentSong.id}/mqdefault.jpg`}
            alt={currentSong.title}
            className="mobile-mini-thumb"
          />
          <div className="mobile-mini-info">
            <span className="mobile-mini-title sketch-font-hand">{currentSong.title}</span>
            <span className="mobile-mini-artist sketch-font-hand">{currentSong.artist}</span>
          </div>
        </div>

        <div className="mobile-mini-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`card-like-btn ${isLiked ? 'liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(currentSong);
            }}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={18} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : 'var(--graphite-main)'} />
          </button>

          <button
            className="btn-control-play mobile-play-btn"
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} color="#ffffff" /> : <Play size={18} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />}
          </button>

          <button className="btn-control mobile-skip-btn" onClick={() => playNext(true)} aria-label="Next Track">
            <SkipForward size={18} />
          </button>
        </div>
      </div>

      {/* Desktop Player Dock (Active on Tablets and PCs) */}
      <div className="player-bar liquid-island desktop-player-bar">
        {/* Track Thumbnail, Metadata & Mini Animated Equalizer */}
        <div className="player-left" onClick={() => setIsFullscreenPlayerOpen(true)} title="Click to open Fullscreen Player (F)">
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
              <button
                className="gain-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSettingsOpen(true);
                }}
                style={{ cursor: 'pointer', fontSize: '0.68rem', border: 'none', background: 'rgba(255, 255, 255, 0.08)' }}
                title="Audio Quality - Click to Change"
              >
                {audioQuality || '320k'}
              </button>
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

        {/* Center Controls & Timeline */}
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
              {isPlaying ? <Pause size={22} color="#ffffff" /> : <Play size={22} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />}
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

        {/* Right Controls: DNA, Speed, Timer, Queue, Lyrics, EQ, Volume, Settings, Expand */}
        <div className="player-right" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Song DNA */}
          <button
            className="btn-icon-subtle stretchy-btn"
            onClick={() => fetchDna(currentSong)}
            title="Song DNA & Meaning (Genius + Wikipedia)"
          >
            <Dna size={18} color="#ef4444" />
          </button>

          {/* Speed & Pitch */}
          <button
            className="btn-icon-subtle stretchy-btn"
            onClick={() => setIsSpeedModalOpen(true)}
            title={`Speed & Varispeed (${playbackSpeed}x)`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}
          >
            <Gauge size={16} />
            <span className="sketch-font-mono" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
              {playbackSpeed}x
            </span>
          </button>

          {/* Sleep Timer */}
          <button
            className="btn-icon-subtle stretchy-btn"
            onClick={() => setIsSleepTimerModalOpen(true)}
            title={sleepTimer.active ? `Timer Active: ${Math.ceil(sleepTimer.remainingSeconds / 60)}m` : 'Sleep Timer'}
            style={{ color: sleepTimer.active ? '#8b5cf6' : 'inherit' }}
          >
            <Moon size={17} />
          </button>

          {/* Queue Drawer */}
          <button
            className="btn-icon-subtle stretchy-btn"
            onClick={() => setIsQueueOpen(true)}
            title={`Playback Queue (${queue.length})`}
            style={{ position: 'relative' }}
          >
            <ListMusic size={18} />
            {queue.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '10px',
                  fontSize: '0.6rem',
                  padding: '1px 4px',
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {queue.length}
              </span>
            )}
          </button>

          {/* Download for Offline */}
          <button
            className="btn-icon-subtle stretchy-btn"
            onClick={() => downloadSong(currentSong)}
            title={isDownloaded ? 'Downloaded (Offline Ready)' : isDownloading ? 'Downloading...' : 'Download Track'}
            disabled={isDownloading}
            style={{ color: isDownloaded ? '#10b981' : isDownloading ? '#f59e0b' : 'inherit' }}
          >
            {isDownloaded ? <Check size={17} /> : <Download size={17} className={isDownloading ? 'animate-bounce' : ''} />}
          </button>

          {/* Universal Share */}
          <button
            className="btn-icon-subtle stretchy-btn"
            onClick={() => openShareModal(currentSong)}
            title="Universal Music Share (Song.link)"
          >
            <Share2 size={17} />
          </button>

          {/* Lyrics / Fullscreen */}
          <button
            className="btn-icon-subtle stretchy-btn"
            onClick={() => setIsFullscreenPlayerOpen(true)}
            title="Synchronized Lyrics & Visualizer (F)"
          >
            <AlignLeft size={18} />
          </button>

          {/* 10-Band EQ */}
          <button
            className="btn-icon-subtle stretchy-btn"
            onClick={() => setIsEqOpen(true)}
            title="10-Band Parametric Equalizer"
          >
            <Sliders size={18} />
          </button>

          {/* Volume Slider */}
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

          {/* Settings */}
          <button
            className="btn-icon-subtle stretchy-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings & Audio Engine (v2.0.2)"
          >
            <Settings size={18} />
          </button>

          {/* Expand Fullscreen */}
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
