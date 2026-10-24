const express = require('express');
const cors = require('cors');
const innertube = require('./services/innertubeService');
const lyricsService = require('./services/lyricsService');
const tasteEngine = require('./services/tasteEngine');
const storage = require('./services/storageService');

const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.1.0-innertube-search', timestamp: Date.now() });
});

// 1. Home Feed
app.get('/api/home', async (req, res) => {
  try {
    const feed = typeof innertube?.getHomeFeed === 'function' ? await innertube.getHomeFeed() : {};
    res.json(feed || {});
  } catch (error) {
    console.error('Failed to fetch home feed:', error.message);
    res.json({});
  }
});

// 2. Search & Live Suggestions
app.get('/api/suggest', async (req, res) => {
  const query = req.query.q;
  if (!query || query.trim().length === 0) {
    return res.json([]);
  }
  try {
    const response = await axios.get('https://suggestqueries.google.com/complete/search', {
      params: {
        client: 'firefox',
        ds: 'yt',
        q: query.trim()
      },
      timeout: 3000
    });
    const suggestions = (response.data && Array.isArray(response.data[1])) ? response.data[1] : [];
    res.json(suggestions);
  } catch (error) {
    res.json([]);
  }
});

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Missing search query ?q=' });
  }
  try {
    const results = await innertube.searchMusic(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

// 3. Song Details & Related
app.get('/api/song/:id', async (req, res) => {
  try {
    const details = await innertube.getSongDetails(req.params.id);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get song details', message: error.message });
  }
});

// 4. Audio Stream with HTTP Range support
app.get('/api/stream/:id', (req, res) => {
  innertube.streamAudio(req.params.id, req, res);
});

// 5. Multi-Source Synchronized Lyrics
app.get('/api/lyrics/:id', async (req, res) => {
  try {
    const { title, artist, duration } = req.query;
    let trackTitle = title;
    let trackArtist = artist;
    let trackDuration = duration ? parseFloat(duration) : null;

    if (!trackTitle) {
      const details = await innertube.getSongDetails(req.params.id);
      trackTitle = details.title;
      trackArtist = details.artist;
      trackDuration = details.duration;
    }

    const lyrics = await lyricsService.getLyrics(trackTitle, trackArtist, trackDuration);
    res.json(lyrics);
  } catch (error) {
    res.status(500).json({ error: 'Lyrics fetch failed', message: error.message });
  }
});

// 6. Echo Brain / Taste Engine
app.post('/api/taste/record', (req, res) => {
  const { trackId, title, artist, listenedMs, skipped } = req.body;
  if (!trackId || !title) {
    return res.status(400).json({ error: 'Missing trackId or title' });
  }
  const stat = tasteEngine.recordPlayback(trackId, title, artist, listenedMs, skipped);
  res.json({ success: true, stat });
});

app.get('/api/taste/mix', async (req, res) => {
  try {
    const count = parseInt(req.query.count, 10) || 20;
    const mix = await tasteEngine.generateTasteMix(count);
    res.json(mix);
  } catch (error) {
    res.status(500).json({ error: 'Taste mix generation failed', message: error.message });
  }
});

// 7. Library (Liked Songs & Playlists)
app.get('/api/library', (req, res) => {
  res.json(storage.getLibrary());
});

app.post('/api/library/like', (req, res) => {
  const { song } = req.body;
  if (!song || !song.id) {
    return res.status(400).json({ error: 'Invalid song' });
  }
  const lib = storage.getLibrary();
  const index = lib.likedSongs.findIndex(s => s.id === song.id);
  let isLiked = false;
  if (index >= 0) {
    lib.likedSongs.splice(index, 1);
    isLiked = false;
  } else {
    lib.likedSongs.unshift({ ...song, likedAt: Date.now() });
    isLiked = true;
  }
  storage.saveLibrary(lib);
  res.json({ isLiked, likedSongs: lib.likedSongs });
});

app.post('/api/library/playlist', (req, res) => {
  const { name, song } = req.body;
  if (!name) return res.status(400).json({ error: 'Playlist name required' });

  const lib = storage.getLibrary();
  let playlist = lib.playlists.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (!playlist) {
    playlist = { id: `pl_${Date.now()}`, name, songs: [], createdAt: Date.now() };
    lib.playlists.push(playlist);
  }
  if (song && !playlist.songs.some(s => s.id === song.id)) {
    playlist.songs.push(song);
  }
  storage.saveLibrary(lib);
  res.json({ success: true, playlists: lib.playlists });
});

// 8. User Preferences & DSP Profile
app.get('/api/preferences', (req, res) => {
  res.json(storage.getPreferences());
});

app.post('/api/preferences', (req, res) => {
  const current = storage.getPreferences();
  const updated = { ...current, ...req.body };
  storage.savePreferences(updated);
  res.json(updated);
});

// 9. Echo Find / Recognition Search
app.post('/api/recognize', async (req, res) => {
  const { query } = req.body;
  try {
    const results = await innertube.searchMusic(query || 'popular audio track');
    if (results.length > 0) {
      res.json({ found: true, track: results[0] });
    } else {
      res.json({ found: false });
    }
  } catch (err) {
    res.status(500).json({ error: 'Recognition failed', message: err.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Dropify Backend Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
