import React, { useState, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, Play, Pause, Heart, Radio, Sparkles } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function MusicFlowModal() {
  const { isMusicFlowOpen, setIsMusicFlowOpen, currentSong, isPlaying, togglePlayPause, playSong, toggleLike, likedSongIds, activeLyricIndex, lyricsData } = usePlayer();
  const [feed, setFeed] = useState([]);
  const [flowIndex, setFlowIndex] = useState(0);

  // Load initial discovery feed
  useEffect(() => {
    if (!isMusicFlowOpen) return;

    fetch('/api/taste/mix?count=25')
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
    <div className="flow-modal-overlay">
      {/* Full-bleed blurred background */}
      <div
        className="flow-bg-artwork"
        style={{
          backgroundImage: `url(${currentFlowTrack?.thumbnail || ''})`
        }}
      />
      <div className="flow-scrim" />

      {/* Top Header */}
      <div className="flow-header">
        <div className="flow-tag glass-pill">
          <Radio size={16} />
          <span>Music Flow — For You</span>
        </div>
        <button className="btn-icon" onClick={() => setIsMusicFlowOpen(false)}>
          <X size={20} />
        </button>
      </div>

      {/* Central Flow Stage */}
      <div className="flow-stage">
        {/* Synchronized Lyrics First Overlay */}
        <div className="flow-lyrics-overlay">
          {currentLine ? (
            <div className="flow-lyric-pair">
              <div className="current-lyric-line">{currentLine}</div>
              {nextLine && <div className="upcoming-lyric-line">{nextLine}</div>}
            </div>
          ) : (
            <div className="flow-instrumental-note">
              <Sparkles size={16} />
              <span>Enjoy the music momentum</span>
            </div>
          )}
        </div>

        {/* Center Artwork with Translucent Play Glyph */}
        <div className="flow-artwork-wrapper" onClick={togglePlayPause}>
          <img
            src={currentFlowTrack?.thumbnail || ''}
            alt={currentFlowTrack?.title}
            className="flow-cover-art"
          />
          <div className={`flow-play-glyph ${!isPlaying ? 'show' : ''}`}>
            {isPlaying ? <Pause size={36} /> : <Play size={36} fill="#fff" />}
          </div>
        </div>

        {/* Metadata & Actions */}
        <div className="flow-info-bar">
          <div className="flow-meta">
            <h2 className="flow-title">{currentFlowTrack?.title}</h2>
            <p className="flow-artist">{currentFlowTrack?.artist}</p>
          </div>

          <button
            className={`btn-icon ${isLiked ? 'liked' : ''}`}
            onClick={() => currentFlowTrack && toggleLike(currentFlowTrack)}
          >
            <Heart size={22} fill={isLiked ? '#ed5564' : 'none'} />
          </button>
        </div>
      </div>

      {/* Right-side Vertical Navigation Arrows */}
      <div className="flow-nav-controls">
        <button className="btn-icon flow-nav-btn" onClick={handlePrev} disabled={flowIndex === 0}>
          <ChevronUp size={24} />
        </button>
        <button className="btn-icon flow-nav-btn" onClick={handleNext} disabled={flowIndex >= feed.length - 1}>
          <ChevronDown size={24} />
        </button>
      </div>
    </div>
  );
}
