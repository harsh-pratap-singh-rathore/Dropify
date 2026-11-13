import React, { useState, useEffect } from 'react';
import { Heart, ListMusic, Plus, Play, Clock, Download, Trash2, WifiOff } from 'lucide-react';
import TrackCard from '../components/TrackCard';
import { usePlayer } from '../context/PlayerContext';
import { apiUrl } from '../config';

export default function LibraryScreen() {
  const [library, setLibrary] = useState({ likedSongs: [], playlists: [] });
  const [activeTab, setActiveTab] = useState('liked'); // 'liked', 'recent', 'playlists', or 'downloads'
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const {
    playSong,
    recentlyPlayed,
    downloadedSongs,
    removeDownloadedSong,
    isOfflineMode,
    setIsOfflineMode
  } = usePlayer();

  const fetchLibrary = () => {
    fetch(apiUrl('/api/library'))
      .then((res) => res.json())
      .then((data) => setLibrary(data))
      .catch((err) => console.error('Library fetch error:', err));
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleCreatePlaylist = (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    fetch(apiUrl('/api/library/playlist'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPlaylistName.trim() })
    })
      .then((res) => res.json())
      .then(() => {
        setNewPlaylistName('');
        setShowCreateModal(false);
        fetchLibrary();
      })
      .catch((err) => console.error('Playlist creation error:', err));
  };

  return (
    <div className="library-screen">
      <div className="library-header sketch-card">
        <div className="library-tabs">
          <button
            className={`sketch-btn ${activeTab === 'liked' ? 'sketch-btn-primary' : ''}`}
            onClick={() => setActiveTab('liked')}
          >
            <Heart size={16} fill={activeTab === 'liked' ? '#ef4444' : 'none'} color={activeTab === 'liked' ? '#ef4444' : 'var(--graphite-main)'} />
            <span>Liked ({library.likedSongs?.length || 0})</span>
          </button>

          <button
            className={`sketch-btn ${activeTab === 'recent' ? 'sketch-btn-primary' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            <Clock size={16} />
            <span>Recent ({recentlyPlayed?.length || 0})</span>
          </button>

          <button
            className={`sketch-btn ${activeTab === 'playlists' ? 'sketch-btn-primary' : ''}`}
            onClick={() => setActiveTab('playlists')}
          >
            <ListMusic size={16} />
            <span>Sketchbooks ({library.playlists?.length || 0})</span>
          </button>

          <button
            className={`sketch-btn ${activeTab === 'downloads' ? 'sketch-btn-primary' : ''}`}
            onClick={() => setActiveTab('downloads')}
          >
            <Download size={16} />
            <span>Downloads ({downloadedSongs?.length || 0})</span>
          </button>
        </div>

        {activeTab === 'playlists' && (
          <button className="sketch-btn sketch-btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            <span>New Sketchbook</span>
          </button>
        )}
      </div>

      {activeTab === 'liked' && (
        library.likedSongs?.length > 0 ? (
          <div className="shelf-grid">
            {library.likedSongs.map((track) => (
              <TrackCard
                key={track.id}
                song={track}
                onPlay={(t) => playSong(t, library.likedSongs)}
                queueContext={library.likedSongs}
              />
            ))}
          </div>
        ) : (
          <div className="library-empty-state sketch-card">
            <Heart size={44} style={{ color: '#ef4444' }} />
            <h3 className="sketch-font-title">Your Liked Notebook</h3>
            <p className="sketch-font-hand">Songs you like while listening will be jotted down here for quick replay.</p>
          </div>
        )
      )}

      {activeTab === 'recent' && (
        recentlyPlayed && recentlyPlayed.length > 0 ? (
          <div className="shelf-grid">
            {recentlyPlayed.map((track) => (
              <TrackCard
                key={track.id}
                song={track}
                onPlay={(t) => playSong(t, recentlyPlayed)}
                queueContext={recentlyPlayed}
              />
            ))}
          </div>
        ) : (
          <div className="library-empty-state sketch-card">
            <Clock size={44} style={{ color: 'var(--pop-cyan)' }} />
            <h3 className="sketch-font-title">No Recent Tracks Yet</h3>
            <p className="sketch-font-hand">Tracks you play will be automatically remembered here so you can jump right back in.</p>
          </div>
        )
      )}

      {activeTab === 'playlists' && (
        library.playlists?.length > 0 ? (
          <div className="shelf-grid">
            {library.playlists.map((pl) => (
              <div key={pl.id} className="polaroid-frame" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="washi-tape-top" />
                <div style={{ width: '100%', height: '140px', background: 'var(--paper-card-subtle)', border: '1.5px solid var(--paper-border)', borderRadius: 'var(--sketch-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ListMusic size={42} style={{ color: 'var(--graphite-main)' }} />
                </div>
                <div className="playlist-info">
                  <h3 className="sketch-font-title" style={{ fontSize: '1.25rem' }}>{pl.name}</h3>
                  <span className="sketch-font-mono" style={{ fontSize: '0.85rem', color: 'var(--graphite-muted)' }}>{pl.songs?.length || 0} tracks</span>
                </div>
                {pl.songs?.length > 0 && (
                  <button
                    className="sketch-btn"
                    onClick={() => playSong(pl.songs[0], pl.songs)}
                    title="Play Playlist"
                    style={{ marginTop: 'auto' }}
                  >
                    <Play size={16} fill="#18181B" />
                    <span>Play Book</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="library-empty-state sketch-card">
            <ListMusic size={44} style={{ color: 'var(--graphite-secondary)' }} />
            <h3 className="sketch-font-title">Create Your First Sketchbook</h3>
            <p className="sketch-font-hand">Organize your favorite audio doodles into custom sketchbooks.</p>
          </div>
        )
      )}

      {activeTab === 'downloads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Offline Mode banner and storage stats */}
          <div className="sketch-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: isOfflineMode ? '#ef4444' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                {isOfflineMode ? <WifiOff size={22} /> : <Download size={22} />}
              </div>
              <div>
                <h4 className="sketch-font-title" style={{ margin: 0, fontSize: '1.1rem' }}>
                  Offline Playback Mode
                </h4>
                <p className="sketch-font-hand" style={{ margin: 0, fontSize: '0.92rem', color: 'var(--graphite-muted)' }}>
                  {isOfflineMode
                    ? 'Only downloaded tracks will play. Internet streaming disabled.'
                    : 'Stream normally, or play downloaded tracks offline without internet.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <span className="sketch-font-mono" style={{ fontSize: '0.85rem', color: 'var(--graphite-muted)' }}>
                  Total Offline Storage
                </span>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--pop-cyan)' }}>
                  {(downloadedSongs.reduce((acc, s) => acc + (s.size || 0), 0) / (1024 * 1024)).toFixed(1)} MB
                </div>
              </div>

              <button
                type="button"
                className={`sketch-btn ${isOfflineMode ? 'sketch-btn-primary' : ''}`}
                onClick={() => setIsOfflineMode(!isOfflineMode)}
                style={isOfflineMode ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : undefined}
              >
                {isOfflineMode ? 'Mode: Active' : 'Enable Offline Mode'}
              </button>
            </div>
          </div>

          {downloadedSongs?.length > 0 ? (
            <div className="shelf-grid">
              {downloadedSongs.map((track) => (
                <div key={track.id} style={{ position: 'relative' }}>
                  <TrackCard
                    song={track}
                    onPlay={(t) => playSong(t, downloadedSongs)}
                    queueContext={downloadedSongs}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove "${track.title}" from offline downloads?`)) {
                        removeDownloadedSong(track.id);
                      }
                    }}
                    title="Delete downloaded song"
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 5
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="library-empty-state sketch-card">
              <Download size={44} style={{ color: 'var(--pop-yellow)' }} />
              <h3 className="sketch-font-title">No Offline Downloads Yet</h3>
              <p className="sketch-font-hand">
                Click the download icon on any song or in the player bar to save tracks for offline listening anywhere, anytime.
              </p>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="sketch-font-title" style={{ fontSize: '1.6rem' }}>Create New Sketchbook</h3>
            <form onSubmit={handleCreatePlaylist} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="text"
                placeholder="Sketchbook name (e.g. Midnight Acoustic)..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
                style={{ padding: '12px 18px', background: 'var(--paper-card-subtle)', border: '2px solid var(--paper-border)', borderRadius: 'var(--sketch-radius-pill)', outline: 'none', fontFamily: 'var(--font-hand)', fontSize: '1.2rem', color: 'var(--graphite-main)' }}
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="sketch-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="sketch-btn sketch-btn-primary">
                  Create Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
