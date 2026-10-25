import React, { useState, useEffect } from 'react';
import { Heart, ListMusic, Plus, Play, Clock } from 'lucide-react';
import TrackCard from '../components/TrackCard';
import { usePlayer } from '../context/PlayerContext';
import { apiUrl } from '../config';

export default function LibraryScreen() {
  const [library, setLibrary] = useState({ likedSongs: [], playlists: [] });
  const [activeTab, setActiveTab] = useState('liked'); // 'liked', 'recent', or 'playlists'
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { playSong, recentlyPlayed } = usePlayer();

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
