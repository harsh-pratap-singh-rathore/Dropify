const express = require('express');
const cors = require('cors');
const innertube = require('./services/innertubeService');
const lyricsService = require('./services/lyricsService');
const tasteEngine = require('./services/tasteEngine');
const storage = require('./services/storageService');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5001;

// Configure trusted proxy (Render/Vercel single edge reverse-proxy topology)
app.set('trust proxy', 1);

// 1. Security & Request Configuration
app.use(cors());
app.use(express.json({ limit: '250kb' }));

// Custom Security Headers Middleware (Hardened CSP + HSTS)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: blob: https://dropify.vercel.app https://i.ytimg.com https://*.ytimg.com https://*.googlevideo.com https://images.unsplash.com; " +
    "media-src 'self' data: blob: https://dropify-backend-wy9v.onrender.com https://dropify.vercel.app https://*.googlevideo.com https://*.youtube.com; " +
    "connect-src 'self' https://dropify-backend-wy9v.onrender.com https://dropify.vercel.app https://suggestqueries.google.com https://lrclib.net https://unison.boidu.dev https://lyrics.kugou.com https://api.lyrics.ovh https://www.youtube.com; " +
    "frame-src https://www.youtube.com; " +
    "object-src 'none';"
  );
  next();
});

// Lightweight In-Memory Sliding-Window IP Rate Limiter with Capacity Protection
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests/minute/IP
const MAX_RATE_LIMIT_ENTRIES = 10000; // Upper bound to prevent memory exhaustion

function rateLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let record = rateLimitMap.get(ip);

  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      const oldestKey = rateLimitMap.keys().next().value;
      if (oldestKey) rateLimitMap.delete(oldestKey);
    }
    record = { count: 1, startTime: now };
    rateLimitMap.set(ip, record);
  } else {
    record.count++;
    if (record.count > MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please wait a minute before making more requests.'
      });
    }
  }
  next();
}

// Garbage collection to prevent memory leaks in rateLimitMap
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

app.use(rateLimiter);

// Helper regex to validate YouTube video IDs
const YT_ID_REGEX = /^[a-zA-Z0-9_-]{5,32}$/;

// 2. Health Check (Consolidated single endpoint)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'dropify-backend',
    version: '2.2.0-hardened-innertube',
    uptime: Math.round(process.uptime()),
    timestamp: Date.now()
  });
});

// 3. Dynamic Home Feed with Circadian Moods & Seed Rotation
app.get('/api/home', async (req, res) => {
  try {
    const { mood, refresh } = req.query;
    const forceRefresh = refresh === 'true' || refresh === '1';
    const feed = typeof innertube?.getHomeFeed === 'function'
      ? await innertube.getHomeFeed({ mood, forceRefresh })
      : {};
    res.json(feed || {});
  } catch (error) {
    console.error('Failed to fetch home feed:', error.message);
    res.json({});
  }
});

// 4. Search & Autocomplete Suggestions
app.get('/api/suggest', async (req, res) => {
  const rawQuery = String(req.query.q || '').slice(0, 200).trim();
  if (!rawQuery) {
    return res.json([]);
  }
  try {
    const response = await axios.get('https://suggestqueries.google.com/complete/search', {
      params: {
        client: 'firefox',
        ds: 'yt',
        q: rawQuery
      },
      timeout: 3000
    });
    const suggestions = (response.data && Array.isArray(response.data[1])) ? response.data[1].slice(0, 10) : [];
    res.json(suggestions);
  } catch (error) {
    res.json([]);
  }
});

app.get('/api/search', async (req, res) => {
  const query = String(req.query.q || '').replace(/[\x00-\x1F\x7F]/g, '').slice(0, 250).trim();
  if (!query) {
    return res.status(400).json({ error: 'Missing search query ?q=' });
  }
  try {
    const results = await innertube.searchMusic(query);
    res.json(results);
  } catch (error) {
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({ error: 'Search failed', message: isProd ? 'Search could not be completed' : error.message });
  }
});

// 5. Song Details & Related
app.get('/api/song/:id', async (req, res) => {
  const songId = String(req.params.id || '').trim();
  if (!YT_ID_REGEX.test(songId)) {
    return res.status(400).json({ error: 'Invalid song ID format' });
  }
  try {
    const details = await innertube.getSongDetails(songId);
    res.json(details);
  } catch (error) {
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({ error: 'Failed to get song details', message: isProd ? 'Unable to retrieve track info' : error.message });
  }
});

// 6. Direct Audio Stream with 302 Redirect to Edge CDN
app.get('/api/stream/:id', async (req, res) => {
  const songId = String(req.params.id || '').trim();
  if (!YT_ID_REGEX.test(songId)) {
    return res.status(400).json({ error: 'Invalid song ID format' });
  }
  try {
    await innertube.streamAudio(songId, req, res);
  } catch (err) {
    console.error('Stream error:', err.message);
    if (!res.headersSent) {
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: 'Streaming error', message: isProd ? 'Audio stream unavailable' : err.message });
    }
  }
});

// Direct Audio Stream URL JSON Resolver for Mobile Native Playback
app.get('/api/stream-url/:id', async (req, res) => {
  const songId = String(req.params.id || '').trim();
  if (!YT_ID_REGEX.test(songId)) {
    return res.status(400).json({ error: 'Invalid song ID format' });
  }
  try {
    const format = await innertube.resolveAudioFormat(songId);
    if (!format || !format.url) {
      return res.status(404).json({ error: 'Stream format not resolved' });
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.json({
      success: true,
      url: format.url,
      itag: format.itag,
      mimeType: format.mimeType || 'audio/webm; codecs="opus"',
      bitrate: format.bitrate,
      duration: format.approxDurationMs ? Math.round(format.approxDurationMs / 1000) : null
    });
  } catch (err) {
    console.error('Stream URL error:', err.message);
    if (!res.headersSent) {
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: 'Stream URL resolution failed', message: isProd ? 'Stream format unavailable' : err.message });
    }
  }
});

// 7. Multi-Source Synchronized Lyrics
app.get('/api/lyrics/:id', async (req, res) => {
  const songId = String(req.params.id || '').trim();
  try {
    const { title, artist, duration } = req.query;
    let trackTitle = title ? String(title).slice(0, 300).trim() : '';
    let trackArtist = artist ? String(artist).slice(0, 200).trim() : '';
    let trackDuration = duration ? parseFloat(duration) : null;

    if (!trackTitle && YT_ID_REGEX.test(songId)) {
      try {
        const details = await innertube.getSongDetails(songId);
        trackTitle = details.title;
        trackArtist = details.artist;
        trackDuration = details.duration;
      } catch (_) {}
    }

    if (!trackTitle) {
      return res.json({
        found: false,
        synced: false,
        lines: [],
        plain: 'Please provide track title to search lyrics.'
      });
    }

    const lyrics = await lyricsService.getLyrics(trackTitle, trackArtist, trackDuration, songId);
    res.json(lyrics);
  } catch (error) {
    console.error('Lyrics error:', error.message);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({ error: 'Lyrics fetch failed', message: isProd ? 'Unable to retrieve lyrics' : error.message });
  }
});

// 8. Echo Brain / Taste Engine
app.post('/api/taste/record', (req, res) => {
  const { trackId, title, artist, listenedMs, skipped } = req.body;
  if (!trackId || !title) {
    return res.status(400).json({ error: 'Missing trackId or title' });
  }
  const cleanId = String(trackId).slice(0, 64);
  const cleanTitle = String(title).slice(0, 200);
  const cleanArtist = String(artist || '').slice(0, 200);
  const validListened = Math.max(0, Math.min(3600000, Number(listenedMs) || 0));
  const validSkipped = Boolean(skipped);

  const stat = tasteEngine.recordPlayback(cleanId, cleanTitle, cleanArtist, validListened, validSkipped);
  res.json({ success: true, stat });
});

app.get('/api/taste/mix', async (req, res) => {
  try {
    const count = Math.min(50, Math.max(5, parseInt(req.query.count, 10) || 20));
    const mix = await tasteEngine.generateTasteMix(count);
    res.json(mix);
  } catch (error) {
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({ error: 'Taste mix generation failed', message: isProd ? 'Could not generate smart mix' : error.message });
  }
});

// 9. Library (Liked Songs & Playlists)
app.get('/api/library', (req, res) => {
  res.json(storage.getLibrary());
});

app.post('/api/library/like', (req, res) => {
  const { song } = req.body;
  if (!song || !song.id || typeof song.id !== 'string') {
    return res.status(400).json({ error: 'Invalid song object' });
  }
  const sanitizedSong = {
    id: String(song.id).slice(0, 64),
    title: String(song.title || 'Untitled').slice(0, 200),
    artist: String(song.artist || 'Unknown Artist').slice(0, 200),
    thumbnail: song.thumbnail ? String(song.thumbnail).slice(0, 500) : '',
    thumbnailHigh: song.thumbnailHigh ? String(song.thumbnailHigh).slice(0, 500) : '',
    duration: typeof song.duration === 'number' ? song.duration : 0,
    durationFormatted: song.durationFormatted ? String(song.durationFormatted).slice(0, 16) : '0:00'
  };

  const lib = storage.getLibrary();
  const index = lib.likedSongs.findIndex(s => s.id === sanitizedSong.id);
  let isLiked = false;
  if (index >= 0) {
    lib.likedSongs.splice(index, 1);
    isLiked = false;
  } else {
    lib.likedSongs.unshift({ ...sanitizedSong, likedAt: Date.now() });
    isLiked = true;
  }
  storage.saveLibrary(lib);
  res.json({ isLiked, likedSongs: lib.likedSongs });
});

app.post('/api/library/playlist', (req, res) => {
  const rawName = String(req.body.name || '').replace(/[\x00-\x1F\x7F<>]/g, '').slice(0, 80).trim();
  if (!rawName) return res.status(400).json({ error: 'Valid playlist name required' });

  const lib = storage.getLibrary();
  let playlist = lib.playlists.find(p => p.name.toLowerCase() === rawName.toLowerCase());
  if (!playlist) {
    playlist = { id: `pl_${Date.now()}`, name: rawName, songs: [], createdAt: Date.now() };
    lib.playlists.push(playlist);
  }
  const song = req.body.song;
  if (song && song.id && !playlist.songs.some(s => s.id === song.id)) {
    playlist.songs.push({
      id: String(song.id).slice(0, 64),
      title: String(song.title || 'Untitled').slice(0, 200),
      artist: String(song.artist || 'Unknown Artist').slice(0, 200),
      thumbnail: song.thumbnail ? String(song.thumbnail).slice(0, 500) : '',
      duration: song.duration || 0,
      durationFormatted: song.durationFormatted || '0:00'
    });
  }
  storage.saveLibrary(lib);
  res.json({ success: true, playlists: lib.playlists });
});

// 10. User Preferences & DSP Profile
const ALLOWED_PREF_KEYS = [
  'audioQuality',
  'crossfadeDuration',
  'crossfadeEnabled',
  'automixEnabled',
  'stereoWidenerEnabled',
  'stereoWidth',
  'equalizerEnabled',
  'eqBands'
];

app.get('/api/preferences', (req, res) => {
  res.json(storage.getPreferences());
});

app.post('/api/preferences', (req, res) => {
  const current = storage.getPreferences();
  const safeUpdates = {};
  for (const key of ALLOWED_PREF_KEYS) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, key)) {
      safeUpdates[key] = req.body[key];
    }
  }
  const updated = { ...current, ...safeUpdates };
  storage.savePreferences(updated);
  res.json(updated);
});

// 11. Echo Find / Recognition Search
app.post('/api/recognize', async (req, res) => {
  const rawQuery = String(req.body.query || '').slice(0, 250).trim();
  try {
    const results = await innertube.searchMusic(rawQuery || 'popular hits');
    if (results.length > 0) {
      res.json({ found: true, track: results[0] });
    } else {
      res.json({ found: false });
    }
  } catch (err) {
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({ error: 'Recognition failed', message: isProd ? 'Recognition search failed' : err.message });
  }
});

// Global Centralized Error Handler (Prevents server crashes on unexpected errors)
app.use((err, req, res, next) => {
  console.error('Unhandled API exception:', err);
  if (!res.headersSent) {
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: 'Internal server error',
      message: isProd ? 'An unexpected error occurred. Please try again later.' : (err.message || 'Unknown error')
    });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Dropify Backend Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
