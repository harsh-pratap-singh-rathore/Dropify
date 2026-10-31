const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const innertube = require('./services/innertubeService');
const lyricsService = require('./services/lyricsService');
const tasteEngine = require('./services/tasteEngine');
const storage = require('./services/storageService');
const axios = require('axios');

const app = express();

// Configure trusted proxy (Render/Vercel single edge reverse-proxy topology)
app.set('trust proxy', 1);

// 1. Security & Request Configuration (Hardened CORS & Whitelist)
const ALLOWED_ORIGINS = new Set([
  'https://dropify.vercel.app',
  'https://dropify-web.vercel.app',
  'http://localhost:5173',
  'http://localhost:5001',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5001',
  'http://127.0.0.1:3000'
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      return callback(null, true);
    }
    // Allow Vercel preview deployments and Electron app origins
    if (origin.endsWith('.vercel.app') || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'x-requested-with']
}));

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
    "media-src 'self' data: blob: http://localhost:* http://127.0.0.1:* https://dropify-backend-wy9v.onrender.com https://dropify.vercel.app https://*.googlevideo.com https://*.youtube.com; " +
    "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://dropify-backend-wy9v.onrender.com https://dropify.vercel.app https://suggestqueries.google.com https://lrclib.net https://unison.boidu.dev https://lyrics.kugou.com https://api.lyrics.ovh https://www.youtube.com; " +
    "frame-src https://www.youtube.com; " +
    "object-src 'none';"
  );
  next();
});

// Lightweight In-Memory Sliding-Window IP Rate Limiter with Capacity Protection & Stream Exemption
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests/minute/IP
const MAX_RATE_LIMIT_ENTRIES = 10000; // Upper bound to prevent memory exhaustion

function rateLimiter(req, res, next) {
  // BE-09 & SEC-01: Exempt audio streaming chunks and health checks from rate limiting
  if (req.path.startsWith('/api/stream') || req.path === '/api/health') {
    return next();
  }

  // Extract real client IP accurately across Render / Cloudflare / Vercel proxy headers
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = (
    req.headers['x-render-original-client-ip'] ||
    req.headers['cf-connecting-ip'] ||
    (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : null) ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown'
  );

  const now = Date.now();
  let record = rateLimitMap.get(realIp);

  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      const oldestKey = rateLimitMap.keys().next().value;
      if (oldestKey) rateLimitMap.delete(oldestKey);
    }
    record = { count: 1, startTime: now };
    rateLimitMap.set(realIp, record);
  } else {
    record.count++;
    if (record.count > MAX_REQUESTS_PER_WINDOW) {
      const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - record.startTime)) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfterSec)));
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

// 2.1 Release & Central Update System
function getReleaseManifest() {
  const possiblePaths = [
    path.join(__dirname, 'releases.json'),
    path.join(__dirname, '../frontend/public/releases.json'),
    path.join(__dirname, '../frontend/dist/releases.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      } catch (_) {}
    }
  }

  return {
    schemaVersion: '1.0.0',
    project: 'Dropify',
    platforms: {}
  };
}

function parseSemVer(v) {
  if (!v || typeof v !== 'string') return [0, 0, 0];
  const cleaned = v.replace(/^v/i, '').trim();
  const parts = cleaned.split('.').map(p => parseInt(p, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function compareSemVer(v1, v2) {
  const [maj1, min1, pat1] = parseSemVer(v1);
  const [maj2, min2, pat2] = parseSemVer(v2);
  if (maj1 !== maj2) return maj1 - maj2;
  if (min1 !== min2) return min1 - min2;
  return pat1 - pat2;
}

app.get('/api/updates', (req, res) => {
  try {
    const manifest = getReleaseManifest();
    const platform = (req.query.platform || '').toLowerCase().trim();
    const clientVersion = req.query.version;
    const clientVersionCode = parseInt(req.query.versionCode, 10);

    if (platform === 'android' || platform === 'windows') {
      const data = manifest.platforms ? manifest.platforms[platform] : null;
      if (!data) {
        return res.status(404).json({
          error: 'Platform not found',
          platform
        });
      }

      let updateAvailable = false;
      if (!isNaN(clientVersionCode) && data.versionCode !== undefined) {
        updateAvailable = data.versionCode > clientVersionCode;
      } else if (clientVersion && data.latestVersion) {
        updateAvailable = compareSemVer(data.latestVersion, clientVersion) > 0;
      }

      let mandatory = !!data.mandatory;
      if (clientVersion && data.minSupportedVersion) {
        if (compareSemVer(data.minSupportedVersion, clientVersion) > 0) {
          mandatory = true;
        }
      }

      return res.json({
        ...data,
        updateAvailable,
        mandatory
      });
    }

    return res.json(manifest);
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to retrieve release metadata',
      message: err.message
    });
  }
});

// 2.2 Live Community Downloads Counter System
app.get('/api/downloads', (req, res) => {
  try {
    const data = storage.getDownloads();
    res.json({
      success: true,
      total: Number(data.total) || 1,
      android: Number(data.android) || 1,
      windows: Number(data.windows) || 0,
      lastUpdated: data.lastUpdated || Date.now()
    });
  } catch (err) {
    res.json({
      success: true,
      total: 1,
      android: 1,
      windows: 0,
      lastUpdated: Date.now()
    });
  }
});

app.post('/api/downloads/increment', (req, res) => {
  try {
    const { platform } = req.body || {};
    const data = storage.getDownloads();
    const currentTotal = Number(data.total) || 1;
    const currentAndroid = Number(data.android) || 1;
    const currentWindows = Number(data.windows) || 0;

    const newTotal = currentTotal + 1;
    let newAndroid = currentAndroid;
    let newWindows = currentWindows;

    if (platform === 'windows') {
      newWindows += 1;
    } else {
      newAndroid += 1;
    }

    const updated = {
      total: newTotal,
      android: newAndroid,
      windows: newWindows,
      lastUpdated: Date.now()
    };

    storage.saveDownloads(updated);

    res.json({
      success: true,
      total: newTotal,
      android: newAndroid,
      windows: newWindows
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to record download',
      message: err.message
    });
  }
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
  if (songId && !YT_ID_REGEX.test(songId)) {
    return res.status(400).json({ error: 'Invalid song ID format' });
  }
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
  const body = req.body || {};
  const { trackId, title, artist, listenedMs, skipped } = body;
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
  const body = req.body || {};
  const { song } = body;
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
  const body = req.body || {};
  const rawName = String(body.name || '').replace(/[\x00-\x1F\x7F<>]/g, '').slice(0, 80).trim();
  if (!rawName) return res.status(400).json({ error: 'Valid playlist name required' });

  const lib = storage.getLibrary();
  let playlist = lib.playlists.find(p => p.name.toLowerCase() === rawName.toLowerCase());
  if (!playlist) {
    playlist = { id: `pl_${Date.now()}`, name: rawName, songs: [], createdAt: Date.now() };
    lib.playlists.push(playlist);
  }
  const song = body.song;
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
  const body = req.body || {};
  for (const key of ALLOWED_PREF_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      safeUpdates[key] = body[key];
    }
  }
  const updated = { ...current, ...safeUpdates };
  storage.savePreferences(updated);
  res.json(updated);
});

// 11. Echo Find / Recognition Search
app.post('/api/recognize', async (req, res) => {
  const body = req.body || {};
  const rawQuery = String(body.query || '').slice(0, 250).trim();
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

// 12. Production Static Serving for Desktop / Web
let frontendDistPath = process.env.FRONTEND_DIST;
const candidatePaths = [
  frontendDistPath,
  frontendDistPath ? frontendDistPath.replace('app.asar', 'app.asar.unpacked') : null,
  path.join(__dirname, '../frontend/dist'),
  path.join(__dirname, '../frontend/dist').replace('app.asar', 'app.asar.unpacked'),
  path.join(__dirname, '../../frontend/dist'),
  path.join(process.resourcesPath || '', 'app.asar.unpacked/frontend/dist'),
  path.join(process.cwd(), 'frontend/dist'),
  path.join(process.cwd(), 'resources/app.asar.unpacked/frontend/dist')
].filter(Boolean);

let resolvedDist = null;
for (const cand of candidatePaths) {
  try {
    if (fs.existsSync(cand) && fs.existsSync(path.join(cand, 'index.html'))) {
      resolvedDist = cand;
      break;
    }
  } catch (_) {}
}

if (resolvedDist) {
  console.log(`[Dropify-Backend] Serving static frontend from: ${resolvedDist}`);
  app.use(express.static(resolvedDist));
  app.get('/', (req, res) => {
    res.sendFile(path.join(resolvedDist, 'index.html'));
  });
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(resolvedDist, 'index.html'));
  });
} else {
  console.warn(`[Dropify-Backend] Warning: Static frontend not found. Checked:`, candidatePaths);
}

// Catch-all 404 for undefined API routes (preventing HTML fallback)
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found', message: `Cannot ${req.method} ${req.path}` });
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

// Safe Port Negotiation
const DEFAULT_PORT = 5001;
const rawPort = process.env.PORT;
const requestedPort = rawPort !== undefined ? parseInt(rawPort, 10) : DEFAULT_PORT;
const initialPort = isNaN(requestedPort) ? 0 : requestedPort;

function startServer(portToUse = initialPort, maxAttempts = 10) {
  let currentPort = portToUse;
  let attempts = 0;

  const server = http.createServer(app);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Dropify-Backend] Port ${currentPort} is in use.`);
      attempts++;
      if (attempts < maxAttempts && currentPort !== 0) {
        currentPort++;
        console.log(`[Dropify-Backend] Retrying on port ${currentPort}...`);
        server.listen(currentPort);
      } else {
        console.warn(`[Dropify-Backend] Port retry limit reached. Falling back to dynamic port (0)...`);
        currentPort = 0;
        server.listen(0);
      }
    } else {
      console.error('[Dropify-Backend] Server error:', err);
    }
  });

  server.on('listening', () => {
    const address = server.address();
    const actualPort = typeof address === 'object' && address !== null ? address.port : address;
    console.log(`[Dropify-Backend] Online on port ${actualPort}`);
    console.log(`Dropify Backend Server listening on http://localhost:${actualPort}`);
  });

  server.listen(currentPort);
  return server;
}

if (!process.env.VERCEL && (require.main === module || !process.env.NO_AUTO_START)) {
  startServer(initialPort);
}

module.exports = app;
module.exports.startServer = startServer;
