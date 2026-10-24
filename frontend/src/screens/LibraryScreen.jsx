import React, { useState, useEffect } from 'react';
import { Heart, ListMusic, Plus, Play } from 'lucide-react';
import TrackCard from '../components/TrackCard';
import { usePlayer } from '../context/PlayerContext';

export default function LibraryScreen() {
  const [library, setLibrary] = useState({ likedSongs: [], playlists: [] });
  const [activeTab, setActiveTab] = useState('liked'); // 'liked' or 'playlists'
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { playSong } = usePlayer();

  const fetchLibrary = () => {
    fetch('/api/library')
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

    fetch('/api/library/playlist', {
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
      <div className="library-header glass-panel">
        <div className="library-tabs">
          <button
            className={`glass-pill ${activeTab === 'liked' ? 'active' : ''}`}
            onClick={() => setActiveTab('liked')}
          >
            <Heart size={16} />
            <span>Liked Tracks ({library.likedSongs?.length || 0})</span>
          </button>

          <button
            className={`glass-pill ${activeTab === 'playlists' ? 'active' : ''}`}
            onClick={() => setActiveTab('playlists')}
          >
            <ListMusic size={16} />
            <span>Playlists ({library.playlists?.length || 0})</span>
          </button>
        </div>

        {activeTab === 'playlists' && (
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            <span>New Playlist</span>
          </button>
        )}
      </div>

      {activeTab === 'liked' ? (
        library.likedSongs?.length > 0 ? (
          <div className="library-grid">
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
          <div className="library-empty-state glass-card">
            <Heart size={44} className="empty-icon" />
            <h3>Your Liked Songs Collection</h3>
            <p>Songs you like while listening will appear here for fast access.</p>
          </div>
        )
      ) : library.playlists?.length > 0 ? (
        <div className="playlists-grid">
          {library.playlists.map((pl) => (
            <div key={pl.id} className="playlist-card glass-card">
              <div className="playlist-icon-box">
                <ListMusic size={32} />
              </div>
              <div className="playlist-info">
                <h3>{pl.name}</h3>
                <span>{pl.songs?.length || 0} tracks</span>
              </div>
              {pl.songs?.length > 0 && (
                <button
                  className="btn-icon"
                  onClick={() => playSong(pl.songs[0], pl.songs)}
                  title="Play Playlist"
                >
                  <Play size={18} fill="#fff" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="library-empty-state glass-card">
          <ListMusic size={44} className="empty-icon" />
          <h3>Create Your First Playlist</h3>
          <p>Organize your favorite tracks into personalized playlists.</p>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <h3>Create Playlist</h3>
            <form onSubmit={handleCreatePlaylist} className="create-playlist-form">
              <input
                type="text"
                placeholder="Playlist name..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
                className="modal-input"
              />
              <div className="modal-btn-row">
                <button
                  type="button"
                  className="glass-pill"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
