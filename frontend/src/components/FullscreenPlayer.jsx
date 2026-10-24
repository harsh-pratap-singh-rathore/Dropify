import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Sliders,
  AlignLeft,
  Volume2,
  VolumeX,
  Disc,
  Sparkles,
  Search,
  RefreshCw,
  Plus,
  Minus
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

function formatSeconds(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function FullscreenPlayer() {
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
    lyricsData,
    setLyricsData,
    activeLyricIndex,
    setActiveLyricIndex,
    isLoadingLyrics,
    setIsLoadingLyrics,
    isFullscreenPlayerOpen,
    setIsFullscreenPlayerOpen,
    setIsEqOpen,
    toggleLike,
    likedSongIds,
    audioManager
  } = usePlayer();

  const [activeTab, setActiveTab] = useState('lyrics'); // 'lyrics' or 'visualizer'
  const [manualQuery, setManualQuery] = useState('');
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [timingOffset, setTimingOffset] = useState(0); // in seconds
  const canvasRef = useRef(null);
  const lyricsContainerRef = useRef(null);

  // Automatically reset manual search and timing offset whenever track changes
  useEffect(() => {
    if (currentSong?.id) {
      setManualQuery('');
      setShowManualSearch(false);
      setTimingOffset(0);
    }
  }, [currentSong?.id]);

  // Auto-scroll active lyric line into view smoothly
  useEffect(() => {
    if (activeLyricIndex >= 0 && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.querySelector(`.lyric-line-${activeLyricIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLyricIndex]);

  // Adjust active lyric with timing offset
  useEffect(() => {
    if (lyricsData?.lines && lyricsData.lines.length > 0) {
      const adjustedTime = currentTime + timingOffset;
      let index = -1;
      for (let i = 0; i < lyricsData.lines.length; i++) {
        if (adjustedTime >= lyricsData.lines[i].time) {
          index = i;
        } else {
          break;
        }
      }
      setActiveLyricIndex(index);
    }
  }, [currentTime, timingOffset, lyricsData]);

  // Manual Lyrics Search Handler
  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualQuery.trim() || !currentSong) return;

    setIsLoadingLyrics(true);
    fetch(`/api/lyrics/${currentSong.id}?title=${encodeURIComponent(manualQuery.trim())}&artist=&duration=${currentSong.duration || ''}`)
      .then((res) => res.json())
      .then((data) => {
        setLyricsData(data);
        setIsLoadingLyrics(false);
        setShowManualSearch(false);
      })
      .catch(() => {
        setIsLoadingLyrics(false);
      });
  };

  // Real-time Visualizer Canvas Loop with Audiophile Mirror Spectrum
  useEffect(() => {
    if (!isFullscreenPlayerOpen || activeTab !== 'visualizer') return;

    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animId = requestAnimationFrame(render);
      audioManager.getFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 1.6;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.82;
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#ed5564');
        gradient.addColorStop(0.5, '#ff758c');
        gradient.addColorStop(1, '#8b5cf6');

        ctx.fillStyle = gradient;
        const rx = x;
        const ry = canvas.height - barHeight;
        const rw = Math.max(2, barWidth - 3);
        const rh = barHeight;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(rx, ry, rw, rh, [4, 4, 0, 0]);
        } else {
          ctx.rect(rx, ry, rw, rh);
        }
        ctx.fill();

        x += barWidth;
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isFullscreenPlayerOpen, activeTab, audioManager]);

  if (!isFullscreenPlayerOpen || !currentSong) return null;

  const isLiked = likedSongIds.has(currentSong.id);
  const albumArt = currentSong.thumbnailHigh || currentSong.thumbnail || (currentSong.id ? `https://i.ytimg.com/vi/${currentSong.id}/hqdefault.jpg` : '');

  return (
    <div className="fullscreen-overlay">
      {/* Animated Liquid Frosted Aura Orbs */}
      <div className="fullscreen-liquid-aura" aria-hidden="true">
        <div className="aura-blob blob-1"></div>
        <div className="aura-blob blob-2"></div>
        <div className="aura-blob blob-3"></div>
      </div>

      {/* Blurred Ambient Glowing Backdrop */}
      <div
        className="fullscreen-bg"
        style={{
          backgroundImage: `url(${albumArt})`
        }}
      />
      <div className="fullscreen-frosted-scrim" />

      {/* Header with Liquid Glass Blur */}
      <div className="fullscreen-header glass-panel header-island">
        <button className="btn-icon stretchy-btn" onClick={() => setIsFullscreenPlayerOpen(false)} aria-label="Close Player">
          <ChevronDown size={24} />
        </button>

        <div className="fullscreen-tab-pills">
          <button
            className={`glass-pill stretchy-pill ${activeTab === 'lyrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('lyrics')}
          >
            <AlignLeft size={16} />
            <span>Lyrics</span>
          </button>
          <button
            className={`glass-pill stretchy-pill ${activeTab === 'visualizer' ? 'active' : ''}`}
            onClick={() => setActiveTab('visualizer')}
          >
            <Disc size={16} />
            <span>Visualizer</span>
          </button>
        </div>

        <button className="btn-icon stretchy-btn" onClick={() => setIsEqOpen(true)} title="DSP Equalizer">
          <Sliders size={20} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="fullscreen-body">
        {/* Left: 3D Stretchy Album Art with Spinning Vinyl & Glass Metadata */}
        <div className="fullscreen-left">
          <div className="artwork-stage">
            {/* Spinning Vinyl Record peeking out */}
            <div className={`vinyl-disc ${isPlaying ? 'spinning' : 'paused'}`}>
              <div className="vinyl-grooves"></div>
              <div className="vinyl-center-label" style={{ backgroundImage: `url(${albumArt})` }}></div>
            </div>

            {/* Stretchy Glassmorphic Jacket with Specular Glare */}
            <div className="artwork-box glass-panel stretchy-box">
              <img
                src={albumArt}
                alt={currentSong.title}
                className="fullscreen-cover"
              />
              <div className="jacket-specular-glare"></div>
            </div>
          </div>

          <div className="fullscreen-track-details glass-card track-meta-glass">
            <div className="track-title-large" title={currentSong.title}>{currentSong.title}</div>
            <div className="track-artist-large">{currentSong.artist}</div>

            {/* Audiophile Pipeline Specs Badge */}
            <div className="audiophile-specs-row">
              <span className="spec-badge">
                <Sparkles size={11} className="icon-glow" /> 160kbps Opus
              </span>
              <span className="spec-badge">10-Band EQ</span>
              <span className="spec-badge">3D Stereo</span>
            </div>
          </div>

          <div className="fullscreen-actions-row">
            <button
              className={`btn-icon-large stretchy-btn ${isLiked ? 'liked' : ''}`}
              onClick={() => toggleLike(currentSong)}
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart size={22} fill={isLiked ? '#ed5564' : 'none'} color={isLiked ? '#ed5564' : '#fff'} />
            </button>
          </div>
        </div>

        {/* Right: Synchronized Lyrics OR Visualizer */}
        <div className="fullscreen-right">
          {activeTab === 'lyrics' ? (
            <div className="lyrics-view-container glass-card lyrics-frosted-card" ref={lyricsContainerRef}>
              {/* Lyrics Provider & Timing Offset Controls */}
              <div className="lyrics-controls-bar">
                {lyricsData.provider ? (
                  <div className="lyrics-provider-tag frosted-pill">
                    <Sparkles size={13} className="icon-glow" />
                    <span>{lyricsData.synced ? 'Synced' : 'Plain'} • {lyricsData.provider}</span>
                  </div>
                ) : (
                  <div className="lyrics-provider-tag frosted-pill">
                    <span>Searching lyric sources...</span>
                  </div>
                )}

                {/* Timing Offset Adjuster */}
                {lyricsData.synced && (
                  <div className="timing-offset-pill glass-pill stretchy-pill">
                    <span className="offset-label">Sync:</span>
                    <button
                      className="offset-btn"
                      onClick={() => setTimingOffset((prev) => +(prev - 0.5).toFixed(1))}
                      title="Delay 0.5s"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="offset-val">{timingOffset >= 0 ? `+${timingOffset}s` : `${timingOffset}s`}</span>
                    <button
                      className="offset-btn"
                      onClick={() => setTimingOffset((prev) => +(prev + 0.5).toFixed(1))}
                      title="Advance 0.5s"
                    >
                      <Plus size={12} />
                    </button>
                    {timingOffset !== 0 && (
                      <button
                        className="offset-reset"
                        onClick={() => setTimingOffset(0)}
                        title="Reset to 0s"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                )}

                <button
                  className="manual-search-toggle-btn glass-pill stretchy-pill"
                  onClick={() => setShowManualSearch(!showManualSearch)}
                  title="Search alternative lyrics"
                >
                  <Search size={13} />
                  <span>Search</span>
                </button>
              </div>

              {/* Manual Search Bar */}
              {showManualSearch && (
                <form onSubmit={handleManualSearch} className="manual-lyrics-form glass-panel">
                  <Search size={16} className="icon-glow" />
                  <input
                    type="text"
                    placeholder="Enter track or artist to re-match lyrics..."
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    className="manual-lyrics-input"
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                    Match
                  </button>
                </form>
              )}

              {isLoadingLyrics ? (
                <div className="lyrics-placeholder">
                  <div className="spinner-glow"></div>
                  <div className="pulse-text">Resolving synchronized syllables across global databases...</div>
                </div>
              ) : lyricsData.lines && lyricsData.lines.length > 0 ? (
                <div className="lyrics-lines-list">
                  {lyricsData.lines.map((line, idx) => {
                    const isActive = idx === activeLyricIndex;
                    const isPassed = idx < activeLyricIndex;
                    return (
                      <div
                        key={idx}
                        className={`lyric-line lyric-line-${idx} ${isActive ? 'active' : ''} ${
                          isPassed ? 'passed' : ''
                        }`}
                        onClick={() => line.time !== undefined && seekTo((line.time / duration) * 100)}
                        title="Click to jump to this lyric"
                      >
                        <span className="lyric-text">{line.text}</span>
                        {isActive && <span className="lyric-glow-halo" aria-hidden="true"></span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="lyrics-placeholder">
                  <p>{lyricsData.plain || 'No synchronized lyrics available for this track.'}</p>
                  <button
                    className="btn-primary"
                    style={{ marginTop: '16px' }}
                    onClick={() => {
                      const cleanHint = lyricsData?.cleanTitle || currentSong.title.replace(/[\(\[|].*?[\)\]]/g, '').trim();
                      setManualQuery(cleanHint);
                      setShowManualSearch(true);
                    }}
                  >
                    <Search size={16} />
                    <span>Search Lyrics Database</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="visualizer-container glass-panel">
              <div className="visualizer-header">
                <Sparkles size={16} className="icon-glow" />
                <span>Web Audio 64-Band FFT Spectrum</span>
              </div>
              <canvas ref={canvasRef} width={500} height={300} className="visualizer-canvas" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls: Floating Liquid Glass Island */}
      <div className="fullscreen-bottom glass-panel bottom-controls-island">
        <div className="fullscreen-timeline">
          <span className="time-text time-text-neon">{formatSeconds(currentTime)}</span>
          <div className="stretchy-seek-wrapper">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress || 0}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="seek-slider-large stretchy-slider"
            />
            <div className="seek-glow-trail" style={{ width: `${progress || 0}%` }}></div>
          </div>
          <span className="time-text time-text-neon">{formatSeconds(duration)}</span>
        </div>

        <div className="fullscreen-controls-row">
          <button className="ctrl-btn-lg stretchy-btn" onClick={playPrevious} aria-label="Previous">
            <SkipBack size={26} />
          </button>
          <button className="play-btn-circle stretchy-play" onClick={togglePlayPause} aria-label="Play/Pause">
            <div className="play-ripple-aura"></div>
            {isPlaying ? <Pause size={30} /> : <Play size={30} fill="#fff" />}
          </button>
          <button className="ctrl-btn-lg stretchy-btn" onClick={() => playNext(true)} aria-label="Next">
            <SkipForward size={26} />
          </button>
        </div>
      </div>
    </div>
  );
}
