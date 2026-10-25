import React, { useState, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, Play, Pause, Heart, Radio, Sparkles } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { apiUrl } from '../config';

export default function MusicFlowModal() {
  const { isMusicFlowOpen, setIsMusicFlowOpen, currentSong, isPlaying, togglePlayPause, playSong, toggleLike, likedSongIds, activeLyricIndex, lyricsData } = usePlayer();
  const [feed, setFeed] = useState([]);
  const [flowIndex, setFlowIndex] = useState(0);

  // Load initial discovery feed
  useEffect(() => {
    if (!isMusicFlowOpen) return;

    fetch(apiUrl('/api/taste/mix?count=25'))
      .then(res => res.json())
      .then(data => {
        if (data.tracks && data.tracks.length > 0) {
          setFeed(data.tracks);
          setFlowIndex(0);
          playSong(data.tracks[0], data.tracks, 0);
        }
      })
      .catch(() => {});
  }, [isMusicFlowOpen]);

  if (!isMusicFlowOpen) return null;

  const currentFlowTrack = feed[flowIndex] || currentSong;
  const isLiked = currentFlowTrack ? likedSongIds.has(currentFlowTrack.id) : false;

  const handleNext = () => {
    if (flowIndex + 1 < feed.length) {
      const nextIdx = flowIndex + 1;
      setFlowIndex(nextIdx);
      playSong(feed[nextIdx], feed, nextIdx);
    }
  };

  const handlePrev = () => {
    if (flowIndex > 0) {
      const prevIdx = flowIndex - 1;
      setFlowIndex(prevIdx);
      playSong(feed[prevIdx], feed, prevIdx);
    }
  };

  const currentLine = lyricsData.lines?.[activeLyricIndex]?.text || '';
  const nextLine = lyricsData.lines?.[activeLyricIndex + 1]?.text || '';

  return (
    <div className="fullscreen-overlay" style={{ zIndex: 3500 }}>
      {/* Top Header */}
      <div className="fullscreen-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--highlighter-yellow)', padding: '4px 14px', border: '1.5px solid var(--paper-border)', borderRadius: 'var(--sketch-radius-pill)' }}>
          <Radio size={16} />
          <span className="sketch-font-hand" style={{ fontSize: '1rem', fontWeight: 700 }}>Music Flow • Notebook Journal</span>
        </div>
        <button className="btn-icon" onClick={() => setIsMusicFlowOpen(false)}>
          <X size={20} />
        </button>
      </div>

      {/* Central Flow Stage */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '24px' }}>
        {/* Synchronized Lyrics First Overlay */}
        <div style={{ maxWidth: '600px', textAlign: 'center', minHeight: '60px' }}>
          {currentLine ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="highlighter-mark sketch-font-hand" style={{ fontSize: '1.8rem', fontWeight: 700 }}>{currentLine}</div>
              {nextLine && <div className="sketch-font-hand" style={{ fontSize: '1.25rem', color: 'var(--graphite-muted)' }}>{nextLine}</div>}
            </div>
          ) : (
            <div className="sketch-font-hand" style={{ fontSize: '1.25rem', color: 'var(--graphite-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Sparkles size={16} />
              <span>Enjoy the acoustic momentum</span>
            </div>
          )}
        </div>

        {/* Center Artwork as Polaroid */}
        <div className="polaroid-frame" style={{ width: '280px', cursor: 'pointer' }} onClick={togglePlayPause}>
          <div className="washi-tape-top" />
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', overflow: 'hidden', borderRadius: 'var(--sketch-radius-sm)', border: '1.5px solid var(--paper-border)' }}>
            <img
              src={currentFlowTrack?.thumbnail || ''}
              alt={currentFlowTrack?.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,247,242,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !isPlaying ? 1 : 0, transition: 'opacity 0.2s ease' }}>
              <div className="play-glyph-btn" style={{ width: '56px', height: '56px' }}>
                {isPlaying ? <Pause size={28} /> : <Play size={28} fill="#18181B" style={{ marginLeft: '3px' }} />}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <h2 className="sketch-font-title" style={{ fontSize: '1.35rem', marginBottom: '2px' }}>{currentFlowTrack?.title}</h2>
            <p className="sketch-font-hand" style={{ fontSize: '1.05rem', color: 'var(--graphite-muted)' }}>{currentFlowTrack?.artist}</p>
          </div>
        </div>

        {/* Actions & Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button className="btn-icon" onClick={handlePrev} disabled={flowIndex === 0} title="Previous Flow">
            <ChevronUp size={22} />
          </button>
          <button
            className={`card-like-btn ${isLiked ? 'liked' : ''}`}
            onClick={() => currentFlowTrack && toggleLike(currentFlowTrack)}
            title={isLiked ? 'Unlike' : 'Like'}
            style={{ padding: '8px' }}
          >
            <Heart size={26} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : 'var(--graphite-main)'} />
          </button>
          <button className="btn-icon" onClick={handleNext} disabled={flowIndex >= feed.length - 1} title="Next Flow">
            <ChevronDown size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
