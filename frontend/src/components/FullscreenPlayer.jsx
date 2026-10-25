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
import { apiUrl } from '../config';

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
    lyricsOffset,
    setLyricsOffset,
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
  const canvasRef = useRef(null);
  const lyricsContainerRef = useRef(null);

  // Automatically reset manual search query whenever track changes
  useEffect(() => {
    if (currentSong?.id) {
      setManualQuery('');
      setShowManualSearch(false);
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

  // Manual Lyrics Search Handler
  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualQuery.trim() || !currentSong) return;

    setIsLoadingLyrics(true);
    fetch(apiUrl(`/api/lyrics/${currentSong.id}?title=${encodeURIComponent(manualQuery.trim())}&artist=&duration=${currentSong.duration || ''}`))
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
    let frameCount = 0;
    const render = () => {
      animId = requestAnimationFrame(render);
      frameCount++;
      audioManager.getFrequencyData(dataArray);

      let totalEnergy = 0;
      for (let i = 0; i < bufferLength; i++) {
        totalEnergy += dataArray[i];
      }
      const isLowEnergy = totalEnergy < 25 && isPlaying;

      // 2D Charcoal Pencil & Graph Paper Visualizer
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Faint graph paper grid lines
      ctx.strokeStyle = 'rgba(24, 24, 27, 0.08)';
      ctx.lineWidth = 1;
      for (let gy = 0; gy < canvas.height; gy += 20) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(canvas.width, gy);
        ctx.stroke();
      }
      for (let gx = 0; gx < canvas.width; gx += 20) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, canvas.height);
        ctx.stroke();
      }

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        let barHeight;
        if (isLowEnergy) {
          // Dynamic harmonic sine wave simulation
          const t = (currentTime * 4.2) + (frameCount * 0.04);
          const s1 = Math.sin(t + i * 0.22);
          const s2 = Math.cos(t * 0.7 + i * 0.14);
          const norm = (s1 * 0.45 + s2 * 0.35 + 0.8) / 1.6;
          barHeight = Math.max(10, norm * canvas.height * 0.85);
        } else {
          barHeight = (dataArray[i] / 255) * canvas.height * 0.85;
        }

        const rx = x;
        const ry = canvas.height - barHeight;
        const rw = Math.max(3, barWidth - 3);
        const rh = Math.max(4, barHeight);

        // 3D Neon Pop Gradient Bar
        const barGrad = ctx.createLinearGradient(0, ry, 0, ry + rh);
        barGrad.addColorStop(0, '#FF3366'); // Crimson
        barGrad.addColorStop(0.5, '#FFD600'); // Sunshine Amber
        barGrad.addColorStop(1, '#00D2FF'); // Cyan Aqua
        ctx.fillStyle = barGrad;
        ctx.fillRect(rx, ry, rw, rh);

        // 3D Beveled rim
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(rx, ry, rw, Math.min(3, rh));

        // Dark charcoal pencil outline
        ctx.strokeStyle = '#18181B';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(rx, ry, rw, rh);

        x += barWidth;
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isFullscreenPlayerOpen, activeTab, audioManager, isPlaying, currentTime]);

  if (!isFullscreenPlayerOpen || !currentSong) return null;

  const isLiked = likedSongIds.has(currentSong.id);
  const albumArt = currentSong.thumbnailHigh || currentSong.thumbnail || (currentSong.id ? `https://i.ytimg.com/vi/${currentSong.id}/hqdefault.jpg` : '');

  return (
    <div className="fullscreen-overlay">
      {/* Header with Sketchbook Binder Tabs */}
      <div className="fullscreen-header">
        <button className="btn-icon" onClick={() => setIsFullscreenPlayerOpen(false)} aria-label="Close Journal">
          <ChevronDown size={22} />
        </button>

        <div className="fullscreen-tab-pills">
          <button
            className={`glass-pill ${activeTab === 'lyrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('lyrics')}
          >
            <AlignLeft size={16} />
            <span>Songwriter Lyrics</span>
          </button>
          <button
            className={`glass-pill ${activeTab === 'visualizer' ? 'active' : ''}`}
            onClick={() => setActiveTab('visualizer')}
          >
            <Disc size={16} />
            <span>Charcoal Visualizer</span>
          </button>
        </div>

        <button className="btn-icon" onClick={() => setIsEqOpen(true)} title="Pencil DSP Equalizer">
          <Sliders size={20} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="fullscreen-body">
        {/* Left: Vintage Hand-Drawn Vinyl Turntable & Polaroid Metadata */}
        <div className="fullscreen-turntable-col">
          <div className="turntable-wrapper">
            <div className={`vinyl-disc ${isPlaying ? 'spinning' : ''}`}>
              <div className="vinyl-label">
                <img src={albumArt} alt={currentSong.title} className="vinyl-thumb" />
              </div>
            </div>
            <div className="vinyl-spindle" />

            {/* Hand-Drawn Tonearm Needle */}
            <div className={`sketch-tonearm ${isPlaying ? 'playing' : ''}`}>
              <div className="tonearm-pivot" />
              <div className="tonearm-rod" />
              <div className="tonearm-head" />
            </div>
          </div>

          <div className="sketch-card" style={{ width: '100%', maxWidth: '380px', padding: '16px', textAlign: 'center', position: 'relative' }}>
            <div className="washi-tape-top" />
            <h2 className="sketch-font-title" style={{ fontSize: '1.45rem', marginBottom: '4px' }}>
              {currentSong.title}
            </h2>
            <div className="sketch-font-hand" style={{ fontSize: '1.15rem', color: 'var(--graphite-muted)', marginBottom: '8px' }}>
              {currentSong.artist}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <span className="gain-badge">320k Opus</span>
              <span className="gain-badge">10-Band EQ</span>
              <span className="gain-badge">Stationery Sync</span>
            </div>
          </div>
        </div>

        {/* Right: Songwriter Journal Lined Paper Lyrics OR Charcoal Visualizer */}
        <div className="fullscreen-content-col">
          {activeTab === 'lyrics' ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Lyrics Provider & Timing Offset Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '2px dashed var(--paper-border-dashed)' }}>
                <div className="sketch-font-mono" style={{ fontSize: '0.82rem', color: 'var(--graphite-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={13} />
                  <span>{lyricsData.synced ? 'KARAOKE SYNC' : 'PLAIN NOTEBOOK'} • {lyricsData.provider || 'Lyrics Engine'}</span>
                </div>

                {lyricsData.synced && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <span className="sketch-font-mono" style={{ fontSize: '0.8rem' }}>Sync:</span>
                    <button
                      className="sketch-btn"
                      style={{ padding: '2px 7px', fontSize: '0.78rem' }}
                      onClick={() => setLyricsOffset((prev) => +(prev - 2.5).toFixed(1))}
                      title="Shift back 1 line (-2.5s)"
                    >
                      -1 Line
                    </button>
                    <button
                      className="sketch-btn"
                      style={{ padding: '2px 7px', fontSize: '0.8rem' }}
                      onClick={() => setLyricsOffset((prev) => +(prev - 0.5).toFixed(1))}
                      title="Nudge back 0.5s"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="sketch-font-mono" style={{ fontSize: '0.82rem', fontWeight: 700, minWidth: '40px', textAlign: 'center' }}>
                      {lyricsOffset >= 0 ? `+${lyricsOffset}s` : `${lyricsOffset}s`}
                    </span>
                    <button
                      className="sketch-btn"
                      style={{ padding: '2px 7px', fontSize: '0.8rem' }}
                      onClick={() => setLyricsOffset((prev) => +(prev + 0.5).toFixed(1))}
                      title="Nudge forward 0.5s"
                    >
                      <Plus size={11} />
                    </button>
                    <button
                      className="sketch-btn"
                      style={{ padding: '2px 7px', fontSize: '0.78rem' }}
                      onClick={() => setLyricsOffset((prev) => +(prev + 2.5).toFixed(1))}
                      title="Shift forward 1 line (+2.5s)"
                    >
                      +1 Line
                    </button>
                  </div>
                )}

                <button
                  className="sketch-btn"
                  style={{ padding: '4px 12px', fontSize: '0.9rem' }}
                  onClick={() => setShowManualSearch(!showManualSearch)}
                >
                  <Search size={13} />
                  <span>Search Lyrics</span>
                </button>
              </div>

              {/* Manual Search Form */}
              {showManualSearch && (
                <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '8px', padding: '12px 0' }}>
                  <input
                    type="text"
                    placeholder="Search lyric syllables for this track..."
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    style={{ flex: 1, padding: '6px 14px', background: 'var(--paper-card-subtle)', border: '1.5px solid var(--paper-border)', borderRadius: 'var(--sketch-radius-pill)', outline: 'none', fontFamily: 'var(--font-hand)', fontSize: '1.05rem' }}
                  />
                  <button type="submit" className="sketch-btn sketch-btn-primary" style={{ padding: '4px 14px' }}>
                    Match
                  </button>
                </form>
              )}

              {isLoadingLyrics ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: 'var(--font-hand)', fontSize: '1.3rem' }}>
                  <div className="animate-sketch-wobble" style={{ display: 'inline-block', padding: '8px 24px', background: 'var(--highlighter-yellow)', border: '2px solid var(--paper-border)', borderRadius: 'var(--sketch-radius-pill)' }}>
                    Penciling synchronized syllables into notebook...
                  </div>
                </div>
              ) : lyricsData.lines && lyricsData.lines.length > 0 ? (
                <div className="lyrics-scroll-container" ref={lyricsContainerRef}>
                  {lyricsData.lines.map((line, idx) => {
                    const isActive = idx === activeLyricIndex;
                    return (
                      <div
                        key={idx}
                        className={`lyric-line lyric-line-${idx} ${isActive ? 'active' : ''}`}
                        onClick={() => line.time !== undefined && duration > 0 && seekTo((Math.max(0, line.time - lyricsOffset) / duration) * 100)}
                        title="Click to jump to this line"
                      >
                        {line.text}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <p className="sketch-font-hand" style={{ fontSize: '1.3rem', color: 'var(--graphite-muted)' }}>
                    {lyricsData.plain || 'No synchronized lyrics available for this audio sketch.'}
                  </p>
                  <button
                    className="sketch-btn sketch-btn-primary"
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
            <div className="visualizer-canvas-container">
              <div style={{ alignSelf: 'flex-start', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                <Sparkles size={14} />
                <span>64-BAND CHARCOAL AUDIO OSCILLOGRAM</span>
              </div>
              <canvas ref={canvasRef} width={620} height={280} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls Deck */}
      <div className="fullscreen-bottom-deck">
        <div className="seek-bar-container" style={{ maxWidth: '800px' }}>
          <span className="time-text sketch-font-mono">{formatSeconds(currentTime)}</span>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress || 0}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="seek-slider"
          />
          <span className="time-text sketch-font-mono">{formatSeconds(duration)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <button className="btn-control" onClick={playPrevious} aria-label="Previous">
            <SkipBack size={26} />
          </button>
          <button className="btn-control-play" style={{ width: '56px', height: '56px' }} onClick={togglePlayPause} aria-label="Play/Pause">
            {isPlaying ? <Pause size={28} color="#ffffff" /> : <Play size={28} fill="#ffffff" color="#ffffff" style={{ marginLeft: '3px' }} />}
          </button>
          <button className="btn-control" onClick={() => playNext(true)} aria-label="Next">
            <SkipForward size={26} />
          </button>
        </div>
      </div>
    </div>
  );
}
