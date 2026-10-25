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
      <div className="hero-banner sketch-card" style={{ marginBottom: '32px' }}>
        <div className="washi-tape-top" />
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={16} />
            <span>Echo Brain • Circadian Taste Profile ({tasteData?.timeOfDay || 'Active'})</span>
          </div>
          <h1 className="hero-title sketch-font-title">{tasteData?.title || 'Personalized Taste Mix'}</h1>
          <p className="hero-desc sketch-font-hand">{tasteData?.description}</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', margin: '8px 0' }}>
            <div className="sketch-card" style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              <Clock size={15} />
              <span>Play Weight: <strong>2.0x</strong></span>
            </div>
            <div className="sketch-card" style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              <Zap size={15} />
              <span>Skip Penalty: <strong>-3.0</strong></span>
            </div>
            <div className="sketch-card" style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              <ShieldCheck size={15} />
              <span>Liked Bonus: <strong>+5.0</strong></span>
            </div>
          </div>

          <div className="hero-actions">
            <button className="sketch-btn sketch-btn-primary" onClick={handlePlayAll} disabled={isLoading}>
              <Play size={18} fill="#18181B" />
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
        <div className="search-loading" style={{ textAlign: 'center', padding: '60px 20px', fontFamily: 'var(--font-hand)', fontSize: '1.3rem' }}>
          <div className="animate-sketch-wobble" style={{ display: 'inline-block', padding: '8px 24px', background: 'var(--highlighter-yellow)', border: '2px solid var(--paper-border)', borderRadius: 'var(--sketch-radius-pill)' }}>
            Recalibrating taste vectors and sketching seeds...
          </div>
        </div>
      ) : tasteData?.tracks?.length > 0 ? (
        <div className="shelf-grid">
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
        <div className="library-empty-state sketch-card">
          <Sparkles size={44} style={{ color: 'var(--graphite-main)' }} />
          <h3 className="sketch-font-title">No Listening History Yet</h3>
          <p className="sketch-font-hand">Play or like a few songs to initialize your sketch taste matrix.</p>
        </div>
      )}
    </div>
  );
}
