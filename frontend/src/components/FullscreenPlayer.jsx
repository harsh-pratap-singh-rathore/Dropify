import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sliders,
  AlignLeft,
  Disc,
  Sparkles,
  Search,
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
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    lyricsData,
    setLyricsData,
    activeLyricIndex,
    isLoadingLyrics,
    setIsLoadingLyrics,
    lyricsOffset,
    setLyricsOffset,
    isFullscreenPlayerOpen,
    setIsFullscreenPlayerOpen,
    setIsEqOpen,
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

  // Real-time Visualizer Canvas Loop with Charcoal Oscillogram
  useEffect(() => {
    if (!isFullscreenPlayerOpen || activeTab !== 'visualizer') return;

    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 64;
    const dataArray = new Uint8Array(bufferLength);
    const peakArray = new Float32Array(bufferLength);
    let frameCount = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      frameCount++;

      try {
        if (audioManager && typeof audioManager.getFrequencyData === 'function') {
          audioManager.getFrequencyData(dataArray);
        }
      } catch (err) {
        // Graceful fallback during audio context initialization
      }

      let totalEnergy = 0;
      for (let i = 0; i < bufferLength; i++) {
        totalEnergy += dataArray[i];
      }
      const isSimulated = !isPlaying || totalEnergy < 20;

      const W = canvas.width;
      const H = canvas.height;

      // 1. Charcoal Paper Base Fill
      ctx.fillStyle = '#FAF7F2';
      ctx.fillRect(0, 0, W, H);

      // 2. Faint Graph Paper Grid Lines
      ctx.strokeStyle = 'rgba(24, 24, 27, 0.07)';
      ctx.lineWidth = 1;
      for (let gy = 0; gy < H; gy += 24) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }
      for (let gx = 0; gx < W; gx += 24) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }

      // 3. Central Baseline Axis
      ctx.strokeStyle = 'rgba(24, 24, 27, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, H - 10);
      ctx.lineTo(W, H - 10);
      ctx.stroke();
      ctx.setLineDash([]);

      const barWidth = Math.max(4, W / bufferLength);
      const usableBars = Math.min(bufferLength, Math.floor(W / barWidth));

      for (let i = 0; i < usableBars; i++) {
        let barHeight;
        if (isSimulated) {
          // Ambient organic harmonic wave
          const curTime = (audioManager && typeof audioManager.getCurrentTime === 'function') ? audioManager.getCurrentTime() : 0;
          const t = (curTime * 3.5) + (frameCount * 0.035);
          const s1 = Math.sin(t + i * 0.22);
          const s2 = Math.cos(t * 0.65 + i * 0.12);
          const wave = (s1 * 0.45 + s2 * 0.35 + 0.8) / 1.6;
          const decay = Math.sin((i / usableBars) * Math.PI);
          barHeight = isPlaying
            ? Math.max(12, wave * (H * 0.75) * (0.4 + decay * 0.6))
            : 8 + Math.sin(frameCount * 0.05 + i * 0.3) * 5;
        } else {
          const raw = dataArray[i] / 255;
          barHeight = Math.max(6, raw * (H * 0.82));
        }

        // Peak decay physics
        if (barHeight > peakArray[i]) {
          peakArray[i] = barHeight;
        } else {
          peakArray[i] = Math.max(0, peakArray[i] - 1.8);
        }

        const rx = i * barWidth + 2;
        const ry = (H - 12) - barHeight;
        const rw = Math.max(2, barWidth - 4);
        const rh = Math.max(4, barHeight);

        // 3D Charcoal & Pop Spectrum Gradient
        const barGrad = ctx.createLinearGradient(0, ry, 0, ry + rh);
        barGrad.addColorStop(0, '#FF3366');   // Neon Crimson Top
        barGrad.addColorStop(0.4, '#FFD600'); // Highlighter Yellow
        barGrad.addColorStop(0.85, '#00D2FF'); // Cyan Aqua
        barGrad.addColorStop(1, '#27272A');    // Charcoal Graphite Base

        ctx.fillStyle = barGrad;
        ctx.fillRect(rx, ry, rw, rh);

        // Hand-drawn sketch outline
        ctx.strokeStyle = '#18181B';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(rx, ry, rw, rh);

        // Charcoal Peak Cap
        const peakY = (H - 12) - peakArray[i] - 3;
        if (peakY < ry) {
          ctx.fillStyle = '#18181B';
          ctx.fillRect(rx, Math.max(4, peakY), rw, 2.5);
        }
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isFullscreenPlayerOpen, activeTab, audioManager, isPlaying]);

  if (!isFullscreenPlayerOpen || !currentSong) return null;

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
      <div className={`fullscreen-body ${activeTab === 'lyrics' ? 'lyrics-mode-active' : 'visualizer-mode-active'}`}>
        {/* Mobile Left Boxy Artwork Card (Visible on mobile during lyrics mode) */}
        {activeTab === 'lyrics' && (
          <div className="fullscreen-mobile-artwork-col mobile-only">
            <div className="sketch-card mobile-boxy-card">
              <div className="washi-tape-top" />
              <div className="mobile-boxy-thumb-wrap">
                <img src={albumArt} alt={currentSong.title} className="mobile-boxy-thumb" />
              </div>
              <div className="mobile-boxy-meta">
                <h3 className="sketch-font-title mobile-boxy-title" title={currentSong.title}>
                  {currentSong.title}
                </h3>
                <p className="sketch-font-hand mobile-boxy-artist" title={currentSong.artist}>
                  {currentSong.artist}
                </p>
                <div className="mobile-boxy-badges">
                  <span className="gain-badge-compact">320k</span>
                  <span className="gain-badge-compact">DSP</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Left: Vintage Hand-Drawn Vinyl Turntable & Polaroid Metadata */}
        <div className={`fullscreen-turntable-col ${activeTab === 'lyrics' ? 'mobile-hidden' : ''}`}>
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
        <div className={`fullscreen-content-col ${activeTab === 'lyrics' ? 'lyrics-expanded' : ''}`}>
          {activeTab === 'lyrics' ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
              {/* Lyrics Provider & Timing Offset Controls */}
              <div className="lyrics-sync-bar">
                <div className="lyrics-sync-meta sketch-font-mono">
                  <Sparkles size={13} />
                  <span>{lyricsData.synced ? 'SYNC' : 'PLAIN'} • {lyricsData.provider || 'Lyrics Engine'}</span>
                </div>

                {lyricsData.synced && (
                  <div className="lyrics-nudge-group">
                    <button
                      className="sketch-btn nudge-btn"
                      onClick={() => setLyricsOffset((prev) => +(prev - 0.5).toFixed(1))}
                      title="Nudge back 0.5s"
                      aria-label="Nudge lyrics back 0.5s"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="nudge-val sketch-font-mono">
                      {lyricsOffset >= 0 ? `+${lyricsOffset}s` : `${lyricsOffset}s`}
                    </span>
                    <button
                      className="sketch-btn nudge-btn"
                      onClick={() => setLyricsOffset((prev) => +(prev + 0.5).toFixed(1))}
                      title="Nudge forward 0.5s"
                      aria-label="Nudge lyrics forward 0.5s"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      className="sketch-btn nudge-line-btn"
                      onClick={() => setLyricsOffset((prev) => +(prev - 2.5).toFixed(1))}
                      title="Shift back 1 line (-2.5s)"
                    >
                      -1L
                    </button>
                    <button
                      className="sketch-btn nudge-line-btn"
                      onClick={() => setLyricsOffset((prev) => +(prev + 2.5).toFixed(1))}
                      title="Shift forward 1 line (+2.5s)"
                    >
                      +1L
                    </button>
                  </div>
                )}

                <button
                  className="sketch-btn lyrics-search-trigger-btn"
                  onClick={() => setShowManualSearch(!showManualSearch)}
                  aria-label="Search Lyrics"
                >
                  <Search size={14} />
                  <span>Search</span>
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
                      const cleanHint = lyricsData?.cleanTitle || currentSong.title.replace(/[([|].*?[)\]]/g, '').trim();
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
