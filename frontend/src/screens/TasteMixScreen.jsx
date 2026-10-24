import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Play, Clock, ShieldCheck, Zap } from 'lucide-react';
import TrackCard from '../components/TrackCard';
import { usePlayer } from '../context/PlayerContext';
import { apiUrl } from '../config';

export default function TasteMixScreen() {
  const [tasteData, setTasteData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { playSong } = usePlayer();

  const fetchTasteMix = () => {
    setIsLoading(true);
    fetch(apiUrl('/api/taste/mix?count=24'))
      .then((res) => res.json())
      .then((data) => {
        setTasteData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Taste mix fetch error:', err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchTasteMix();
  }, []);

  const handlePlayAll = () => {
    if (tasteData && tasteData.tracks && tasteData.tracks.length > 0) {
      playSong(tasteData.tracks[0], tasteData.tracks);
    }
  };

  return (
    <div className="taste-screen">
      {/* Echo Brain Status Dashboard */}
      <div className="taste-hero glass-panel">
        <div className="taste-hero-meta">
          <div className="taste-chip glass-pill">
            <Sparkles size={16} className="icon-glow" />
            <span>Echo Brain • Circadian Taste Profile ({tasteData?.timeOfDay || 'Active'})</span>
          </div>
          <h1 className="taste-title">{tasteData?.title || 'Personalized Taste Mix'}</h1>
          <p className="taste-desc">{tasteData?.description}</p>

          <div className="taste-metrics-row">
            <div className="metric-box glass-card">
              <Clock size={16} />
              <span>Logarithmic Play Weight: <strong>2.0x</strong></span>
            </div>
            <div className="metric-box glass-card">
              <Zap size={16} />
              <span>Skip Penalty: <strong>-3.0</strong></span>
            </div>
            <div className="metric-box glass-card">
              <ShieldCheck size={16} />
              <span>Liked Bonus: <strong>+5.0</strong></span>
            </div>
          </div>

          <div className="taste-action-buttons">
            <button className="btn-primary" onClick={handlePlayAll} disabled={isLoading}>
              <Play size={18} fill="#fff" />
              <span>Play Entire Mix</span>
            </button>
            <button className="btn-icon" onClick={fetchTasteMix} title="Regenerate Smart Mix" disabled={isLoading}>
              <RefreshCw size={18} className={isLoading ? 'spin-slow' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Generated Tracklist */}
      {isLoading ? (
        <div className="search-loading">
          <div className="pulse-text">Recalibrating taste vectors and related seeds...</div>
        </div>
      ) : tasteData?.tracks?.length > 0 ? (
        <div className="taste-results-grid">
          {tasteData.tracks.map((track) => (
            <TrackCard
              key={track.id}
              song={track}
              onPlay={(t) => playSong(t, tasteData.tracks)}
              queueContext={tasteData.tracks}
            />
          ))}
        </div>
      ) : (
        <div className="search-empty-state glass-card">
          <Sparkles size={44} className="empty-icon" />
          <h3>No Listening History Yet</h3>
          <p>Play or like a few songs to initialize your on-device taste matrix.</p>
        </div>
      )}
    </div>
  );
}
